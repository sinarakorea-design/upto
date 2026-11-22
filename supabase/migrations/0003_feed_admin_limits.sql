-- 0003: 피드(판매자 닉네임 포함), 운영자 회원 목록, 하루 등록 한도, 비로그인 실행 차단

-- 피드: 노출 중인 상품 + 판매자 닉네임. 뷰 주인 권한으로 읽되 live 만 내보낸다.
create or replace view public.feed as
  select p.id, p.title, p.category, p.mall, p.price, p.list_price, p.link, p.photo_path, p.ends_at, p.created_at, p.owner_id, pr.nickname as seller
    from public.products p join public.profiles pr on pr.id = p.owner_id
   where p.status = 'live' and pr.status <> 'blocked' and (p.ends_at is null or p.ends_at > now());
grant select on public.feed to anon, authenticated;

-- 상품 등록: 하루 10개 한도(도배 방지)를 더한다. 나머지는 0001 과 같다.
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
  if (select count(*) from public.products where owner_id = me.id and created_at > now() - interval '1 day') >= 10 and me.role <> 'admin' then raise exception 'daily_limit'; end if;
  if (select count(*) from public.products where owner_id = me.id and status <> 'removed') >= 30 then raise exception 'too_many_products'; end if;
  if me.role = 'admin' then cost := 0; end if;
  select coalesce(sum(delta), 0) into bal from public.point_ledger where user_id = me.id;
  if bal < cost then raise exception 'not_enough_points'; end if;
  if p_photo_path is not null and p_photo_path not like me.id::text || '/%' then raise exception 'bad_photo_path'; end if;
  insert into public.products (owner_id, title, category, mall, price, list_price, link, photo_path, ends_at, point_cost)
  values (me.id, btrim(p_title), p_category, btrim(p_mall), p_price, p_list_price, nullif(btrim(coalesce(p_link, '')), ''), p_photo_path,
          case when p_hours > 0 then now() + make_interval(hours => least(p_hours, 72)) end, cost)
  returning id into pid;
  if cost > 0 then insert into public.point_ledger (user_id, delta, reason, ref) values (me.id, -cost, 'product_post', pid::text); end if;
  return pid;
end $$;

-- 운영자: 회원 목록(이메일·포인트·상품 수 포함). 운영자가 아니면 빈 결과가 아니라 오류.
create or replace function public.admin_list_members(p_status public.member_status default null)
returns table (id uuid, nickname text, email text, status public.member_status, role public.member_role, created_at timestamptz, balance integer, products integer)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not_admin'; end if;
  return query
    select p.id, p.nickname::text, u.email::text, p.status, p.role, p.created_at,
           coalesce((select sum(l.delta) from public.point_ledger l where l.user_id = p.id), 0)::integer,
           (select count(*) from public.products x where x.owner_id = p.id and x.status <> 'removed')::integer
      from public.profiles p join auth.users u on u.id = p.id
     where p_status is null or p.status = p_status
     order by p.created_at desc
     limit 500;
end $$;

-- 비로그인(anon)은 회원 기능을 실행할 수 없다(함수 안에서도 막지만 문을 하나 더 닫는다)
revoke execute on function public.post_product(text, text, text, integer, integer, text, text, integer) from anon, public;
revoke execute on function public.set_product_status(uuid, public.product_status) from anon, public;
revoke execute on function public.admin_set_member(uuid, public.member_status) from anon, public;
revoke execute on function public.admin_grant_points(uuid, integer, text) from anon, public;
revoke execute on function public.admin_list_members(public.member_status) from anon, public;
grant execute on function public.post_product(text, text, text, integer, integer, text, text, integer) to authenticated;
grant execute on function public.set_product_status(uuid, public.product_status) to authenticated;
grant execute on function public.admin_set_member(uuid, public.member_status) to authenticated;
grant execute on function public.admin_grant_points(uuid, integer, text) to authenticated;
grant execute on function public.admin_list_members(public.member_status) to authenticated;
