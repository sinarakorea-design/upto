-- 0004: 포인트 값 변경(안실장 2026-11-23): 가입 선물 5,000P · 딜 1개 올리기 3,000P
-- 이미 가입한 회원은 가입 선물 차액(4,000P)을 한 번 채운다.

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nickname, marketing)
  values (new.id, new.raw_user_meta_data ->> 'nickname', coalesce((new.raw_user_meta_data ->> 'marketing')::boolean, false));
  insert into public.point_ledger (user_id, delta, reason) values (new.id, 5000, 'signup_bonus');
  return new;
end $$;

create or replace function public.post_product(
  p_title text, p_category text, p_mall text, p_price integer, p_list_price integer,
  p_link text default null, p_photo_path text default null, p_hours integer default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me public.profiles; cost integer := 3000; bal integer; pid uuid;
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

insert into public.point_ledger (user_id, delta, reason, ref)
select l.user_id, 4000, 'signup_bonus', 'bonus_topup_5000'
  from public.point_ledger l
 where l.reason = 'signup_bonus' and l.delta = 1000
   and not exists (select 1 from public.point_ledger x where x.user_id = l.user_id and x.ref = 'bonus_topup_5000');
