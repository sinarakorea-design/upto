-- 새 Supabase 프로젝트는 표 권한을 자동으로 열지 않는다. 화면이 쓰는 만큼만 연다(행 단위 규칙 RLS 가 그 위에서 다시 막는다).
grant usage on schema public to anon, authenticated, service_role;

-- 누구나: 노출 중인 상품 보기, 판매자 닉네임 보기, 닉네임 중복 확인
grant select on public.products to anon, authenticated;
grant select on public.public_profiles to anon, authenticated;

-- 로그인한 회원: 내 정보·포인트·판매자 신청·주문 보기(RLS 가 '내 것'만 남긴다)
grant select on public.profiles, public.point_ledger, public.point_balance, public.sellers, public.orders, public.payments, public.payouts to authenticated;
grant update (marketing) on public.profiles to authenticated;
grant insert on public.sellers to authenticated;

-- 서버 전용(결제 승인·정산): service_role
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
