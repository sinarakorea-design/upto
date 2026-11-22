-- UPTO 1.0 초기 스키마 (Supabase Postgres)
-- 흐름: 이메일·닉네임·비밀번호 가입 → 이메일 인증(Supabase Auth) → 운영자 승인 → 포인트로 상품 등록 → 업투 결제(토스, 지급대행으로 판매 회원 정산)
-- 원칙: 돈·포인트·승인 상태는 사용자가 직접 바꿀 수 없다. 바꾸는 길은 security definer 함수(포인트·등록)와 서버(service role: 결제·정산)뿐이다.

create extension if not exists citext;

-- ── 회원 ─────────────────────────────────────────────
create type public.member_status as enum ('wait', 'ok', 'blocked');
create type public.member_role as enum ('member', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname citext not null unique check (char_length(nickname) between 2 and 16 and nickname ~ '^[0-9A-Za-z가-힣_]+$'),
  role public.member_role not null default 'member',
  status public.member_status not null default 'wait',      -- 운영자 승인 전에는 상품을 올릴 수 없다
  marketing boolean not null default false,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and status <> 'blocked');
$$;

-- 가입 직후(이메일 인증 전) auth.users 에 행이 생기면 프로필을 만든다. 닉네임은 가입 폼의 metadata 에서 온다.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nickname, marketing)
  values (new.id, new.raw_user_meta_data ->> 'nickname', coalesce((new.raw_user_meta_data ->> 'marketing')::boolean, false));
  insert into public.point_ledger (user_id, delta, reason) values (new.id, 1000, 'signup_bonus');
  return new;
end $$;

-- 가입 폼에서 닉네임 중복을 먼저 확인한다(로그인 전에도 부를 수 있게 anon 허용).
create or replace function public.nickname_available(name text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where nickname = name::citext);
$$;

-- ── 포인트(원장) ─────────────────────────────────────
-- 잔액은 원장 합계다. 사용자는 원장에 직접 쓸 수 없다. 1.0 은 '적립만'(충전 없음): 선불전자지급수단 규제를 피한다.
create table public.point_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason text not null check (reason in ('signup_bonus', 'activity', 'game', 'product_post', 'admin_grant', 'admin_revoke', 'refund')),
  ref text,
  created_at timestamptz not null default now()
);
create index point_ledger_user on public.point_ledger (user_id, created_at desc);

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace view public.point_balance with (security_invoker = true) as
  select user_id, coalesce(sum(delta), 0)::integer as balance from public.point_ledger group by user_id;

-- ── 판매 회원(지급대행 셀러) ─────────────────────────
-- 업투가 결제를 받고 판매 회원에게 정산한다(토스페이먼츠 지급대행). 셀러 등록·계좌 확인은 서버가 토스 API 로 한다.
create type public.seller_status as enum ('draft', 'review', 'active', 'paused');
create table public.sellers (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  business_type text not null check (business_type in ('individual', 'individual_business', 'corporate')),
  display_name text not null check (char_length(display_name) between 1 and 30),
  business_no text,                         -- 사업자등록번호(개인 판매자는 비움)
  contact_phone text,
  toss_seller_id text unique,               -- 토스 지급대행 셀러 ID(서버가 채움)
  status public.seller_status not null default 'draft',
  created_at timestamptz not null default now()
);

-- ── 상품 ─────────────────────────────────────────────
create type public.product_status as enum ('live', 'hidden', 'removed');
create table public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 60),
  category text not null check (category in ('digital', 'food', 'fashion', 'beauty', 'living', 'baby', 'game', 'travel')),
  mall text not null check (char_length(mall) between 1 and 20),
  price integer not null check (price between 10 and 99999999),
  list_price integer not null check (list_price between 10 and 99999999 and list_price >= price),
  link text check (link is null or (char_length(link) <= 300 and link ~ '^https://[^\s"''<>]{4,}$')),
  photo_path text,                          -- storage: product-photos/<owner_id>/<file>
  ends_at timestamptz,
  sale_enabled boolean not null default false,   -- 업투에서 바로 결제(셀러 active 여야 켤 수 있다)
  stock integer check (stock is null or stock >= 0),
  point_cost integer not null default 0,
  status public.product_status not null default 'live',
  created_at timestamptz not null default now()
);
create index products_feed on public.products (status, category, created_at desc);

-- 상품 등록: 승인 회원 + 포인트 차감을 한 트랜잭션으로. 운영자는 무료.
create or replace function public.post_product(
  p_title text, p_category text, p_mall text, p_price integer, p_list_price integer,
  p_link text default null, p_photo_path text default null, p_hours integer default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me public.profiles; cost integer := 500; bal integer; pid uuid;
begin
  select * into me from public.profiles where id = auth.uid() for update;
  if me.id is null then raise exception 'not_signed_in'; end if;
  if me.status <> 'ok' and me.role <> 'admin' then raise exception 'not_approved'; end if;
  if (select count(*) from public.products where owner_id = me.id and status <> 'removed') >= 30 then raise exception 'too_many_products'; end if;
  if me.role = 'admin' then cost := 0; end if;
  select coalesce(sum(delta), 0) into bal from public.point_ledger where user_id = me.id;
  if bal < cost then raise exception 'not_enough_points'; end if;
  if p_photo_path is not null and p_photo_path not like me.id::text || '/%' then raise exception 'bad_photo_path'; end if;
  insert into public.products (owner_id, title, category, mall, price, list_price, link, photo_path, ends_at, point_cost)
  values (me.id, p_title, p_category, p_mall, p_price, p_list_price, nullif(p_link, ''), p_photo_path,
          case when p_hours > 0 then now() + make_interval(hours => least(p_hours, 72)) end, cost)
  returning id into pid;
  if cost > 0 then insert into public.point_ledger (user_id, delta, reason, ref) values (me.id, -cost, 'product_post', pid::text); end if;
  return pid;
end $$;

-- 회원이 고칠 수 있는 칸은 노출 여부뿐(가격 변경은 새로 등록). 운영자는 무엇이든.
create or replace function public.set_product_status(p_id uuid, p_status public.product_status) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.products set status = p_status
   where id = p_id and (owner_id = auth.uid() or public.is_admin());
  if not found then raise exception 'not_allowed'; end if;
end $$;

-- 운영자: 회원 승인·정지, 포인트 지급
create or replace function public.admin_set_member(p_user uuid, p_status public.member_status) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  update public.profiles set status = p_status, approved_at = case when p_status = 'ok' then now() else approved_at end where id = p_user;
  if p_status = 'blocked' then update public.products set status = 'hidden' where owner_id = p_user and status = 'live'; end if;
end $$;

create or replace function public.admin_grant_points(p_user uuid, p_delta integer, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  insert into public.point_ledger (user_id, delta, reason, ref) values (p_user, p_delta, case when p_delta > 0 then 'admin_grant' else 'admin_revoke' end, p_note);
end $$;

-- ── 주문·결제·정산(토스페이먼츠 + 지급대행). 쓰기는 서버(service role)만 ─────
create type public.order_status as enum ('pending', 'paid', 'canceled', 'refunded', 'settled');
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,                      -- 토스 orderId
  buyer_id uuid not null references public.profiles (id),
  product_id uuid not null references public.products (id),
  seller_id uuid not null references public.sellers (user_id),
  quantity integer not null default 1 check (quantity between 1 and 99),
  amount integer not null check (amount > 0),         -- 결제 금액(서버가 상품가로 다시 계산해 검증)
  status public.order_status not null default 'pending',
  created_at timestamptz not null default now()
);
create table public.payments (
  order_id uuid primary key references public.orders (id) on delete cascade,
  payment_key text unique,
  method text,
  approved_at timestamptz,
  status text not null,
  raw jsonb
);
create type public.payout_status as enum ('scheduled', 'requested', 'completed', 'failed', 'canceled');
create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  seller_id uuid not null references public.sellers (user_id),
  amount integer not null check (amount >= 0),        -- 판매자에게 줄 금액
  fee integer not null default 0 check (fee >= 0),    -- 업투 수수료
  toss_payout_id text unique,
  status public.payout_status not null default 'scheduled',
  scheduled_for date,
  created_at timestamptz not null default now()
);

-- ── 권한 규칙(RLS) ───────────────────────────────────
alter table public.profiles enable row level security;
alter table public.point_ledger enable row level security;
alter table public.sellers enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.payouts enable row level security;

create policy profiles_self_read on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_self_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
-- 회원이 고칠 수 있는 칸은 marketing 하나(역할·상태·닉네임은 막는다)
revoke update on public.profiles from authenticated;
grant update (marketing) on public.profiles to authenticated;

create policy ledger_self_read on public.point_ledger for select using (user_id = auth.uid() or public.is_admin());

create policy sellers_self on public.sellers for select using (user_id = auth.uid() or public.is_admin());
create policy sellers_self_insert on public.sellers for insert with check (user_id = auth.uid() and status = 'draft' and toss_seller_id is null);

create policy products_public_read on public.products for select using (status = 'live' or owner_id = auth.uid() or public.is_admin());

create policy orders_read on public.orders for select using (buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin());
create policy payments_read on public.payments for select using (exists (select 1 from public.orders o where o.id = order_id and (o.buyer_id = auth.uid() or public.is_admin())));
create policy payouts_read on public.payouts for select using (seller_id = auth.uid() or public.is_admin());

-- 화면에 보이는 판매자 이름(닉네임)만 공개
create or replace view public.public_profiles as select id, nickname from public.profiles where status <> 'blocked';
grant select on public.public_profiles to anon, authenticated;

grant execute on function public.nickname_available(text) to anon, authenticated;
grant execute on function public.post_product(text, text, text, integer, integer, text, text, integer) to authenticated;
grant execute on function public.set_product_status(uuid, public.product_status) to authenticated;
grant execute on function public.admin_set_member(uuid, public.member_status) to authenticated;
grant execute on function public.admin_grant_points(uuid, integer, text) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ── 사진 저장소 ──────────────────────────────────────
insert into storage.buckets (id, name, public) values ('product-photos', 'product-photos', true) on conflict (id) do nothing;
create policy photos_upload_own on storage.objects for insert to authenticated
  with check (bucket_id = 'product-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'product-photos' and (storage.foldername(name))[1] = auth.uid()::text);
