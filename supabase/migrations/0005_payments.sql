-- 0005: 업투 결제(토스페이먼츠) + 지급대행 정산 기록
-- 흐름: 판매자 신청(sellers draft) → 운영자가 토스 상점관리자 '셀러 관리'에 등록하고 셀러 ID 입력(active)
--       → 상품 판매 켜기(sale_enabled, 재고) → 구매자 create_order(금액은 DB 가 계산) → 토스 결제 → 서버가 승인 API 로 확인
--       → 서버(service role)가 paid 처리·재고 차감·정산 예정(payouts) 기록

-- 운영 설정(수수료 등). 운영자만 바꾼다.
create table if not exists public.settings (key text primary key, value jsonb not null, updated_at timestamptz not null default now());
alter table public.settings enable row level security;
create policy settings_read on public.settings for select using (true);
grant select on public.settings to anon, authenticated;
grant all on public.settings to service_role;
insert into public.settings (key, value) values ('fee_pct', '10') on conflict (key) do nothing;   -- 업투 수수료 10%(바꿀 수 있음)

-- 구매자: 주문 만들기. 금액·판매 가능 여부·재고는 여기서만 정한다(화면이 보낸 금액은 믿지 않는다).
create or replace function public.create_order(p_product uuid, p_qty integer default 1)
returns table (order_no text, amount integer, order_name text)
language plpgsql security definer set search_path = public as $$
declare pr public.products; sl public.sellers; no text; amt integer;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if p_qty is null or p_qty < 1 or p_qty > 10 then raise exception 'bad_quantity'; end if;
  select * into pr from public.products where id = p_product and status = 'live';
  if pr.id is null or not pr.sale_enabled then raise exception 'not_for_sale'; end if;
  if pr.owner_id = auth.uid() then raise exception 'own_product'; end if;
  if pr.stock is not null and pr.stock < p_qty then raise exception 'sold_out'; end if;
  select * into sl from public.sellers where user_id = pr.owner_id and status = 'active';
  if sl.user_id is null then raise exception 'seller_not_ready'; end if;
  if (select count(*) from public.orders where buyer_id = auth.uid() and status = 'pending' and created_at > now() - interval '10 minutes') >= 5 then raise exception 'too_many_pending'; end if;
  amt := pr.price * p_qty;
  no := 'UPTO' || to_char(now() at time zone 'Asia/Seoul', 'YYMMDDHH24MISS') || substr(md5(gen_random_uuid()::text), 1, 8);
  insert into public.orders (order_no, buyer_id, product_id, seller_id, quantity, amount) values (no, auth.uid(), pr.id, pr.owner_id, p_qty, amt);
  return query select no, amt, left(pr.title, 100)::text;
end $$;
revoke execute on function public.create_order(uuid, integer) from anon, public;
grant execute on function public.create_order(uuid, integer) to authenticated;

-- 서버 전용: 결제 승인 결과 반영(한 번만). service_role 만 실행한다.
create or replace function public.mark_order_paid(p_order_no text, p_payment_key text, p_amount integer, p_method text, p_raw jsonb)
returns text
language plpgsql security definer set search_path = public as $$
declare o public.orders; fee integer; pct numeric;
begin
  select * into o from public.orders where order_no = p_order_no for update;
  if o.id is null then return 'no_order'; end if;
  if o.status <> 'pending' then return 'already'; end if;
  if o.amount <> p_amount then return 'amount_mismatch'; end if;
  update public.orders set status = 'paid' where id = o.id;
  insert into public.payments (order_id, payment_key, method, approved_at, status, raw) values (o.id, p_payment_key, p_method, now(), 'DONE', p_raw)
    on conflict (order_id) do nothing;
  update public.products set stock = greatest(stock - o.quantity, 0) where id = o.product_id and stock is not null;
  select coalesce((value #>> '{}')::numeric, 10) into pct from public.settings where key = 'fee_pct';
  fee := floor(o.amount * coalesce(pct, 10) / 100);
  insert into public.payouts (order_id, seller_id, amount, fee, scheduled_for) values (o.id, o.seller_id, o.amount - fee, fee, (now() at time zone 'Asia/Seoul')::date + 7);
  return 'ok';
end $$;
revoke execute on function public.mark_order_paid(text, text, integer, text, jsonb) from anon, authenticated, public;
grant execute on function public.mark_order_paid(text, text, integer, text, jsonb) to service_role;

-- 판매자 신청 화면에서 내 신청을 고칠 수 있게(심사 전 draft 일 때만)
create policy sellers_self_update on public.sellers for update using (user_id = auth.uid() and status = 'draft') with check (user_id = auth.uid() and status = 'draft' and toss_seller_id is null);
grant update (business_type, display_name, business_no, contact_phone) on public.sellers to authenticated;

-- 운영자: 판매자 승인(토스 셀러 ID 입력), 상품 판매 켜기/끄기
create or replace function public.admin_set_seller(p_user uuid, p_toss_seller_id text, p_status public.seller_status) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  if p_status = 'active' and coalesce(btrim(p_toss_seller_id), '') = '' then raise exception 'need_seller_id'; end if;
  update public.sellers set toss_seller_id = nullif(btrim(p_toss_seller_id), ''), status = p_status where user_id = p_user;
  if not found then raise exception 'no_seller'; end if;
  if p_status <> 'active' then update public.products set sale_enabled = false where owner_id = p_user; end if;
end $$;

-- 판매 켜기는 상품 주인(활성 판매자) 또는 운영자
create or replace function public.set_product_sale(p_id uuid, p_enabled boolean, p_stock integer default null) returns void
language plpgsql security definer set search_path = public as $$
declare pr public.products;
begin
  select * into pr from public.products where id = p_id;
  if pr.id is null or (pr.owner_id <> auth.uid() and not public.is_admin()) then raise exception 'not_allowed'; end if;
  if p_enabled and not exists (select 1 from public.sellers where user_id = pr.owner_id and status = 'active') then raise exception 'seller_not_ready'; end if;
  if p_stock is not null and p_stock < 0 then raise exception 'bad_stock'; end if;
  update public.products set sale_enabled = p_enabled, stock = p_stock where id = p_id;
end $$;

revoke execute on function public.admin_set_seller(uuid, text, public.seller_status) from anon, public;
revoke execute on function public.set_product_sale(uuid, boolean, integer) from anon, public;
grant execute on function public.admin_set_seller(uuid, text, public.seller_status) to authenticated;
grant execute on function public.set_product_sale(uuid, boolean, integer) to authenticated;

-- 피드·상세에 판매 여부와 재고를 보여 준다
create or replace view public.feed as
  select p.id, p.title, p.category, p.mall, p.price, p.list_price, p.link, p.photo_path, p.ends_at, p.created_at, p.owner_id, pr.nickname as seller,
         (p.sale_enabled and exists (select 1 from public.sellers s where s.user_id = p.owner_id and s.status = 'active')) as on_sale, p.stock
    from public.products p join public.profiles pr on pr.id = p.owner_id
   where p.status = 'live' and pr.status <> 'blocked' and (p.ends_at is null or p.ends_at > now());
grant select on public.feed to anon, authenticated;
