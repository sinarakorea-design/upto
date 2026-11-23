-- 0006: 수수료 5% · UP 추천 · 찜 · 랭킹 · 출석 포인트 · 배송 정보/발송 처리
-- 여러 번 실행해도 오류가 나지 않게 썼다(이미 있으면 건너뛴다).

-- 수수료 5%(안실장 2026-11-23)
update public.settings set value = '5', updated_at = now() where key = 'fee_pct';

-- ── UP 추천 · 찜 ─────────────────────────────────────
create table if not exists public.ups (
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index if not exists ups_product on public.ups (product_id, created_at desc);
create table if not exists public.wishes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
alter table public.ups enable row level security;
alter table public.wishes enable row level security;
drop policy if exists ups_self_read on public.ups;
create policy ups_self_read on public.ups for select using (user_id = auth.uid());
drop policy if exists wishes_self_read on public.wishes;
create policy wishes_self_read on public.wishes for select using (user_id = auth.uid());
grant select on public.ups, public.wishes to authenticated;
grant all on public.ups, public.wishes to service_role;

-- 누르면 켜지고 다시 누르면 꺼진다. 내 딜은 추천할 수 없다.
create or replace function public.toggle_up(p_product uuid) returns table (is_on boolean, total integer)
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); now_on boolean;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if exists (select 1 from public.profiles where id = uid and status = 'blocked') then raise exception 'blocked'; end if;
  if not exists (select 1 from public.products where id = p_product and status = 'live') then raise exception 'no_product'; end if;
  if exists (select 1 from public.products where id = p_product and owner_id = uid) then raise exception 'own_product'; end if;
  delete from public.ups where user_id = uid and product_id = p_product;
  now_on := not found;
  if now_on then insert into public.ups (user_id, product_id) values (uid, p_product); end if;
  return query select now_on, (select count(*) from public.ups where product_id = p_product)::integer;
end $$;

create or replace function public.toggle_wish(p_product uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if not exists (select 1 from public.products where id = p_product and status = 'live') then raise exception 'no_product'; end if;
  delete from public.wishes where user_id = uid and product_id = p_product;
  if found then return false; end if;
  if (select count(*) from public.wishes where user_id = uid) >= 200 then raise exception 'too_many'; end if;
  insert into public.wishes (user_id, product_id) values (uid, p_product);
  return true;
end $$;

-- ── 출석 포인트: 하루 한 번 100P(한국 날짜 기준) ─────
create unique index if not exists point_ledger_activity_once on public.point_ledger (user_id, ref) where reason = 'activity';
create or replace function public.claim_daily() returns integer
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); n integer;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if exists (select 1 from public.profiles where id = uid and status = 'blocked') then raise exception 'blocked'; end if;
  insert into public.point_ledger (user_id, delta, reason, ref)
  values (uid, 100, 'activity', 'daily:' || to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM-DD'))
  on conflict (user_id, ref) where reason = 'activity' do nothing;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'already_today'; end if;
  return (select coalesce(sum(delta), 0) from public.point_ledger where user_id = uid)::integer;
end $$;

-- ── 배송 정보와 발송 처리 ────────────────────────────
alter table public.orders add column if not exists ship_name text;
alter table public.orders add column if not exists ship_phone text;
alter table public.orders add column if not exists ship_addr text;
alter table public.orders add column if not exists ship_memo text;
alter table public.orders add column if not exists courier text;
alter table public.orders add column if not exists tracking_no text;
alter table public.orders add column if not exists shipped_at timestamptz;

drop function if exists public.create_order(uuid, integer);
create or replace function public.create_order(p_product uuid, p_qty integer, p_name text, p_phone text, p_addr text, p_memo text default null)
returns table (order_no text, amount integer, order_name text)
language plpgsql security definer set search_path = public as $$
declare pr public.products; sl public.sellers; no text; amt integer;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if p_qty is null or p_qty < 1 or p_qty > 10 then raise exception 'bad_quantity'; end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 20
     or char_length(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')) not between 9 and 11
     or char_length(btrim(coalesce(p_addr, ''))) not between 8 and 150 then raise exception 'bad_shipping'; end if;
  select * into pr from public.products where id = p_product and status = 'live';
  if pr.id is null or not pr.sale_enabled then raise exception 'not_for_sale'; end if;
  if pr.owner_id = auth.uid() then raise exception 'own_product'; end if;
  if pr.stock is not null and pr.stock < p_qty then raise exception 'sold_out'; end if;
  select * into sl from public.sellers where user_id = pr.owner_id and status = 'active';
  if sl.user_id is null then raise exception 'seller_not_ready'; end if;
  if (select count(*) from public.orders where buyer_id = auth.uid() and status = 'pending' and created_at > now() - interval '10 minutes') >= 5 then raise exception 'too_many_pending'; end if;
  amt := pr.price * p_qty;
  no := 'UPTO' || to_char(now() at time zone 'Asia/Seoul', 'YYMMDDHH24MISS') || substr(md5(gen_random_uuid()::text), 1, 8);
  insert into public.orders (order_no, buyer_id, product_id, seller_id, quantity, amount, ship_name, ship_phone, ship_addr, ship_memo)
  values (no, auth.uid(), pr.id, pr.owner_id, p_qty, amt, btrim(p_name), regexp_replace(p_phone, '[^0-9]', '', 'g'), btrim(p_addr), nullif(left(btrim(coalesce(p_memo, '')), 100), ''));
  return query select no, amt, left(pr.title, 100)::text;
end $$;

-- 판매자(또는 운영자)가 결제된 주문에 송장을 넣는다
create or replace function public.mark_shipped(p_order_no text, p_courier text, p_tracking text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if char_length(btrim(coalesce(p_courier, ''))) < 2 or char_length(btrim(coalesce(p_tracking, ''))) < 6 then raise exception 'bad_tracking'; end if;
  update public.orders set courier = left(btrim(p_courier), 20), tracking_no = left(btrim(p_tracking), 30), shipped_at = now()
   where order_no = p_order_no and status = 'paid' and (seller_id = auth.uid() or public.is_admin());
  if not found then raise exception 'not_allowed'; end if;
end $$;

revoke execute on function public.toggle_up(uuid) from anon, public;
revoke execute on function public.toggle_wish(uuid) from anon, public;
revoke execute on function public.claim_daily() from anon, public;
revoke execute on function public.create_order(uuid, integer, text, text, text, text) from anon, public;
revoke execute on function public.mark_shipped(text, text, text) from anon, public;
grant execute on function public.toggle_up(uuid) to authenticated;
grant execute on function public.toggle_wish(uuid) to authenticated;
grant execute on function public.claim_daily() to authenticated;
grant execute on function public.create_order(uuid, integer, text, text, text, text) to authenticated;
grant execute on function public.mark_shipped(text, text, text) to authenticated;

-- ── 피드에 추천 수(전체 · 최근 24시간)를 붙인다. 랭킹은 최근 24시간 추천 순 ──
create or replace view public.feed as
  select p.id, p.title, p.category, p.mall, p.price, p.list_price, p.link, p.photo_path, p.ends_at, p.created_at, p.owner_id, pr.nickname as seller,
         (p.sale_enabled and exists (select 1 from public.sellers s where s.user_id = p.owner_id and s.status = 'active')) as on_sale, p.stock,
         (select count(*) from public.ups u where u.product_id = p.id)::integer as ups,
         (select count(*) from public.ups u where u.product_id = p.id and u.created_at > now() - interval '1 day')::integer as ups_today
    from public.products p join public.profiles pr on pr.id = p.owner_id
   where p.status = 'live' and pr.status <> 'blocked' and (p.ends_at is null or p.ends_at > now());
grant select on public.feed to anon, authenticated;
