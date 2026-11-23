# UPTO 1.0

모바일 우선 핫딜 서비스. Next.js(App Router) + Supabase(로그인·DB·사진) + Cloudflare Pages.

## 지금 되는 것
- 메인 피드(카테고리, 20초 캐시) · 딜 상세 · 딜 올리기(사진·포인트 3,000P) · MY(내 딜) · 운영자(회원 승인·정지·포인트, 딜 숨기기)
- 가입 유도 랜딩 `/join`, 가입·로그인 후 보던 화면으로 복귀, 오류·없는 화면 처리, 홈 화면 추가(앱 아이콘), 공유 미리보기, 보안 헤더
- 운영 방법은 `OPERATIONS.md`
- 회원가입: 이메일 · 닉네임(실시간 중복 확인) · 비밀번호 → 인증 메일 → 링크를 누르면 가입 완료(가입 선물 5,000P)
- 로그인 / 인증 메일 다시 받기 / 로그아웃 / MY(닉네임·회원 상태·포인트)
- DB(`supabase/migrations/0001_init.sql`): 회원·운영자 승인·포인트 원장·상품 등록(3,000P, 승인 회원만)·판매자(토스 지급대행)·주문·결제·정산 자리, 행 단위 권한 규칙
  - 로컬 Postgres 에서 17개 시험 통과(자기 승인·포인트 직접 쓰기·주문 직접 쓰기 차단, 정지 시 상품 숨김 등)

## 다음 단계
1. 상품 올리기 화면(사진 업로드 → `post_product`) · 업투 룸 · 데모 디자인 피드 이식
2. 운영자 화면 `/admin`(회원 승인·정지, 상품 관리, 포인트 지급)
3. 토스페이먼츠 결제 + 지급대행(셀러 등록·정산) — 결제 승인은 서버 함수에서만(비밀 키)
4. 카카오 로그인(선택), Capacitor 앱

## 처음 설정(사장님 계정으로 한 번)
1. https://supabase.com 에서 새 프로젝트(지역: Northeast Asia (Seoul)).
2. SQL Editor 에 `supabase/migrations/` 의 0001 → 0002 → 0003 → 0004 을 순서대로 붙여 실행.
3. Authentication → Providers → Email: **Confirm email 켜기**.
4. Authentication → URL Configuration: Site URL = `https://<도메인>`, Redirect URLs 에 `https://<도메인>/auth/confirm` 추가(개발용 `http://localhost:3000/auth/confirm` 도).
5. Authentication → Emails → SMTP: 실서비스는 자체 메일 발송(SMTP) 연결 필수(기본 발송은 시간당 몇 통으로 막힘). 메일 제목·본문을 한글로.
6. Project Settings → API 의 URL 과 anon key 를 `.env.local` 에(`.env.example` 참고). service_role 키는 서버 환경 변수에만.
7. 운영자 지정: SQL 로 `update profiles set role='admin', status='ok' where nickname='<내 닉네임>';`

## 개발
```
npm install
npm run dev      # http://localhost:3000
npm run build
```
