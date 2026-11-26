# 업투(UPTO) 개발 인수인계서

작성 2026-11-26 · 대상: 이어서 개발할 풀스택 개발자 · 기준 커밋: 이 문서가 들어간 `main`

이 문서 하나로 프로젝트 전체를 파악하도록 썼다. 더 자세한 운영 절차는 `OPERATIONS.md`, 첫 설정은 `README.md`.

---

## 1. 서비스 한 줄 요약
모바일 우선 **핫딜 커뮤니티 + 회원 판매 중개** 웹 서비스. 누구나 가입 → 운영자 승인을 받은 회원이 포인트로 딜을 올림 → 다른 회원이 UP(추천)·찜 → 24시간 추천 순 랭킹 Top 50. 판매자 승인을 받은 회원의 상품은 업투에서 토스페이먼츠로 결제하고, 업투 수수료 5%를 뗀 금액을 토스 지급대행으로 정산한다.

- 운영 주소: https://www.upto.co.kr (apex `upto.co.kr` → www 로 308 이동)
- 운영 목표: 최저 비용, 개발자 없이 운영자 혼자 폰으로 관리, 화면은 누구나 바로 쓰게(버튼 최소, 쉬운 말)
- 오픈: 정식 오픈은 2027년 예정. 지금은 실서비스 구조로 배포만 된 상태(가입 열림, 딜 0개)

## 2. 확정된 정책 값(바꾸려면 DB 함수를 고친다)
| 항목 | 값 | 구현 위치 |
|---|---|---|
| 가입 | 이메일 · 닉네임(실시간 중복 확인) · 비밀번호 → 인증 메일 링크 클릭으로 완료 | `signup/`, `auth/confirm/route.ts`, `handle_new_user` 트리거 |
| 가입 선물 | 5,000P | 0004 `handle_new_user` |
| 출석 | 하루 100P(한국 날짜 기준, 1일 1회) | 0006 `claim_daily` + 부분 유니크 인덱스 |
| 딜 올리기 | 3,000P 차감(운영자 무료), 승인 회원만, 하루 10개, 1인 노출 30개 | 0003/0004 `post_product` |
| 업투 수수료 | 5% (`settings.fee_pct`) | 0006, `mark_order_paid` |
| 정산 예정일 | 결제일 + 7일(한국 날짜) | `mark_order_paid` → `payouts.scheduled_for` |
| 포인트 | 적립만, 충전형 없음, 원장(`point_ledger`) 합계가 잔액 | 뷰 `point_balance` |
| 운영자 | 대표 계정이 로그인하면 자동으로 운영자(role=admin, status=ok) | `src/lib/owner.ts` (이메일은 SHA-256 해시로만 저장) |

## 3. 기술 스택과 계정
| 구분 | 내용 |
|---|---|
| 프론트·서버 | Next.js 16.4.6 (App Router, `src/proxy.ts` = 예전 middleware), React 19.3.1, TypeScript 5.7 |
| DB·인증·파일 | Supabase (리전 서울). 프로젝트 ref `ovjtvogbjaeftovaegwf`, URL `https://ovjtvogbjaeftovaegwf.supabase.co`. 사진 버킷 `product-photos` |
| 배포 | Vercel 프로젝트 `sungmoahn/upto`, 함수 리전 `icn1`(`vercel.json`). `main` 푸시 = 자동 배포. 미리보기 주소 `https://upto-eight.vercel.app` |
| 도메인 | hosting.kr 에서 구매. A `@` → `76.76.21.21`, CNAME `www` → `cdf28321b909c6ef.vercel-dns-017.com.` |
| 결제 | 토스페이먼츠 결제위젯 v2 + 지급대행. 법인 가맹 심사 완료 계정(사이트 추가 심사는 별도 필요) |
| 소스 | GitHub `sinarakorea-design/upto` |

계정 접근 권한(Supabase·Vercel·토스 상점관리자·hosting.kr)은 대표에게 따로 초대를 받는다. **비밀 키는 이 문서와 저장소에 없다.**

## 4. 환경 변수
| 이름 | 공개 여부 | 현재 Vercel | 설명 |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 공개 | 설정됨 | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 공개 | 설정됨 | `sb_publishable_…` (권한은 RLS 가 막음). 예전 이름 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 도 읽음 |
| `SUPABASE_SECRET_KEY` | **서버 전용** | 설정됨 | `sb_secret_…`. 결제 승인 기록·대표 계정 운영자 지정에 필요. 예전 이름 `SUPABASE_SERVICE_ROLE_KEY` 도 읽음 |
| `TOSS_SECRET_KEY` | **서버 전용** | 없음 | 없으면 토스 공식 문서 테스트 키(`test_gsk_docs_…`)로 동작(실제 돈 안 나감) |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | 공개 | 없음 | 없으면 문서 테스트 키(`test_gck_docs_…`) |
| `NEXT_PUBLIC_SITE_URL` | 공개 | 없음 | 없으면 `https://www.upto.co.kr` (OG 이미지 기준 주소) |

로컬은 `.env.example` 을 `.env.local` 로 복사해서 채운다. 서버 전용 키에 `NEXT_PUBLIC_` 을 절대 붙이지 않는다.

## 5. 폴더 구조
```
src/
  proxy.ts                 모든 화면에서 Supabase 로그인 쿠키 갱신(getClaims, 정적 파일 제외)
  lib/
    env.ts                 공개 환경 변수
    supabase/client.ts     브라우저 클라이언트
    supabase/server.ts     서버 컴포넌트용(쿠키)
    supabase/public.ts     쿠키 없는 공개 읽기 + fetch 캐시(피드 20초, 랭킹 60초, tag 'feed')
    supabase/admin.ts      server-only, secret key(서비스 롤). 결제 확정·운영자 지정에만
    format.ts              won·할인율·사진 URL·카테고리·쇼핑몰 목록·POST_COST·FeedRow 타입·DB 오류 한글화
    next-url.ts            safeNext/withNext: 로그인·가입 후 보던 화면으로 복귀(외부 주소 차단)
    korean-errors.ts       Supabase Auth 오류 한글화
    toss.ts                토스 키(서버 secret 은 server 에서만 import)
    owner.ts               대표 계정 자동 운영자 지정
    company.ts             사업자 표시 정보(현재 빈 값)
  components/              logo, 아래 고정 탭(홈·랭킹·올리기·MY), footer(통신판매중개 고지), up/wish 버튼, deal-card
  app/                     화면(아래 6장)
supabase/migrations/       0001~0006, 번호 순서대로 SQL Editor 에서 실행(라이브 DB 에 전부 적용됨)
public/                    og.png, icon-192/512.png
next.config.mjs            보안 헤더(X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, HSTS)
vercel.json                {"regions":["icn1"]}
```

## 6. 화면(라우트)
| 경로 | 하는 일 | 로그인 |
|---|---|---|
| `/` | 피드(카테고리 필터), 비회원에게 가입 유도 배너·하단 CTA | 선택 |
| `/join` | 가입 유도 랜딩(`?next=` 유지) | - |
| `/signup` · `/verify` · `/login` | 가입(닉네임 중복 실시간 확인) → 인증 메일 안내 → 로그인 후 `next` 로 복귀 | - |
| `/auth/confirm` | 인증 메일 링크 처리(`code` 와 `token_hash` 둘 다) | - |
| `/rank` | `ups_today` → `ups` → 최신 순 Top 50 | 선택 |
| `/p/[id]` | 딜 상세, UP·찜, 구매하기, 주인: 숨기기/판매 켜기 | 선택 |
| `/post` | 딜 올리기(폰에서 사진 1280px JPEG 로 줄여 업로드 → `post_product`) | 필수 |
| `/my` | 출석, 포인트, 판매자 상태, 판매 내역(송장 입력), 주문 내역(송장 확인), 찜, 내 딜 | 필수 |
| `/seller` | 판매자 신청(사업자 유형·상호·사업자번호·연락처) | 필수 |
| `/checkout/[id]` | 배송 정보 입력 → `create_order` → 토스 결제위젯 | 필수 |
| `/pay/success` · `/pay/fail` | 서버에서 토스 승인 API 호출 → `mark_order_paid` | - |
| `/admin` | 회원(승인·정지·+3,000P), 딜(숨기기·보이기), 판매자(토스 셀러 ID 입력·승인·중지), 주문(KPI·발송 상태) | 운영자 |
| `/terms` · `/privacy` | 이용약관·개인정보 처리방침 **초안** | - |

## 7. DB 설계와 규칙
원칙: **업무 규칙은 전부 DB(security definer RPC + RLS)에 있다.** 화면은 RPC 를 부를 뿐이고, 화면이 보낸 금액·포인트는 믿지 않는다.

- 테이블: `profiles`(닉네임 citext 유니크, role, status wait/ok/blocked) · `point_ledger` · `products` · `ups` · `wishes` · `sellers` · `orders`(배송 정보·송장 포함) · `payments` · `payouts` · `settings`
- 뷰: `feed`(노출 중 + 정지 아닌 회원 + 미만료, 판매 여부·추천 수 포함) · `point_balance` · `public_profiles`
- RPC(회원): `nickname_available` · `post_product` · `set_product_status` · `toggle_up` · `toggle_wish` · `claim_daily` · `create_order` · `set_product_sale` · `mark_shipped`
- RPC(운영자, 함수 안에서 `is_admin()` 확인): `admin_set_member` · `admin_grant_points` · `admin_list_members` · `admin_set_seller`
- RPC(서버 전용, service_role 만): `mark_order_paid` — 한 번만 반영, 금액 대조, 재고 차감, 정산 예정 기록
- 비로그인(anon)은 회원 RPC 실행 권한 자체를 회수(0003, 0006)
- 새 Supabase 프로젝트는 테이블 GRANT 가 자동으로 안 붙어서 0002 에서 명시적으로 준다
- 마이그레이션 0003 이후는 대부분 여러 번 실행해도 안전하게 썼지만, 0001·0002·0005 는 재실행 시 "already exists" 오류가 난다. **라이브 DB 는 0006 까지 적용 완료.** 새 변경은 `0007_…sql` 로 추가한다.

## 8. 결제 흐름(토스페이먼츠)
1. 회원 `/seller` 신청 → `sellers.status = draft`
2. 운영자가 토스 상점관리자 **셀러 관리**에 수동 등록(정산 계좌는 토스에서만 받음) → 받은 셀러 ID 를 `/admin` 판매자 탭에 입력·승인(`admin_set_seller` → active)
3. 판매자가 딜 화면에서 **판매 켜기**(재고) → `products.sale_enabled`
4. 구매자 `/checkout/[id]`: 배송 정보 → `create_order`(금액은 DB 가 `가격×수량` 으로 계산, 10분 안 대기 주문 5개 제한) → 위젯 `TossPayments(clientKey).widgets({customerKey})` → `setAmount` → `renderPaymentMethods`/`renderAgreement` → `requestPayment`
5. `/pay/success`(서버): DB 주문 금액 대조 → `POST https://api.tosspayments.com/v1/payments/confirm`(Basic `secret:`, `Idempotency-Key: orderId`) → `mark_order_paid`
6. 판매자 `/my` 판매 내역에서 택배사·송장 입력(`mark_shipped`) → 구매자 주문 내역에 표시
7. 정산: `payouts` 에 '정산 예정'만 기록. **실제 송금은 현재 토스 상점관리자 지급대행 화면에서 수동.** 환불도 상점관리자에서 결제 취소(업투 DB 는 아직 반영 안 됨)

## 9. 검증 상태
**라이브에서 확인함**: 전 화면 응답, apex→www 308, 보안 헤더, 비로그인 RPC 차단, `fee_pct=5`, 피드·랭킹 동작(딜 0개라 빈 화면), 토스 문서 테스트 키 유효(승인 API 응답 확인), 빌드 경고 0, `npm audit` 0.
**로컬 Postgres 로 시험함(시험 스크립트는 저장소에 없음)**: 자기 승인·포인트 직접 쓰기·주문 직접 쓰기 차단, 정지 시 상품 숨김, 포인트 차감, 하루 한도 등.
**아직 확인 못 함**: 실제 로그인 상태의 딜 올리기·UP·찜·출석, 테스트 결제 전 과정(주문→결제→승인→정산 기록→송장), 대표 계정 자동 운영자 전환, 인증 메일 실제 수신(기본 메일 발송 한도).

## 10. 남은 작업(우선순위 순)
### A. 오픈 전 필수
1. **E2E 점검**: 9장 '아직 확인 못 함' 전부를 테스트 계정 2개(구매자·판매자)로 실제 진행
2. **메일 발송(SMTP)**: Resend 등 연결, `upto.co.kr` 도메인 인증, 인증 메일 한글 템플릿(`OPERATIONS.md` 에 문구 있음). 기본 발송은 시간당 몇 통이라 실서비스 불가
3. **사업자 정보**: `src/lib/company.ts` 채우기(상호·대표·사업자번호·통신판매업 신고번호·주소·전화·이메일·개인정보 보호책임자) → 푸터·약관에 자동 반영
4. **약관·개인정보 처리방침 법률 검토** 후 '초안' 표시 제거. 통신판매중개업 고지 문구 확인
5. **회원 탈퇴**: 방침에 약속했지만 미구현. `auth.users` 삭제 시 profiles cascade, 주문·결제 기록은 법정 보관(5년) 위해 익명화 처리 필요
6. **토스 정식 키**: `TOSS_SECRET_KEY`, `NEXT_PUBLIC_TOSS_CLIENT_KEY` (사이트 추가 심사 후)
7. **유료 플랜**: Supabase Pro(무료는 1주 미사용 시 일시정지, 백업 없음), Vercel Pro(Hobby 는 비상업 전용)

### B. 결제 완성도
8. **토스 웹훅**(`PAYMENT_STATUS_CHANGED` 등): 상점관리자에서 취소·환불 시 `orders.status` 동기화, 가상계좌 입금 처리
9. **환불·취소 흐름**: 구매자 취소 요청 → 판매자/운영자 승인 → 토스 취소 API → `refunded`, 재고 복구, `payouts` 취소
10. **구매 확정**: 배송 후 구매자 확정(또는 N일 자동 확정) → 정산 가능 상태로. 현재는 결제 즉시 7일 뒤 정산 예정
11. **지급대행 API 자동화**: 셀러 등록·지급 요청을 토스 API 로(현재 상점관리자 수동). 토스 지급대행 API 문서 확인 필요
12. **오래된 대기 주문 정리**: `pending` 주문 만료(예: 30분) 크론(Supabase `pg_cron` 또는 Vercel Cron)
13. `/pay/success` 는 GET 렌더 중에 승인을 호출한다. 멱등 처리돼 있지만 Route Handler(POST) 또는 서버 액션으로 옮기는 것을 권장

### C. 운영·안정성
14. **자동 테스트·CI**: DB RPC 테스트(pgTAP 또는 로컬 Postgres 스크립트), 핵심 화면 Playwright, GitHub Actions. `package.json` 의 `lint` 스크립트(`next lint`)는 Next 16 에서 제거된 명령이라 ESLint 설정을 새로 해야 함
15. **요청 제한**: DB 한도 외에 로그인·가입·RPC 레이트 리밋(Vercel WAF 또는 Upstash)
16. **사진 정리**: 숨김·삭제된 상품의 Storage 파일 정리, 업로드 용량·형식 서버 검증
17. **이미지·딜 신고/검수**: 신고 버튼, 부적절 이미지 필터
18. 관리자 작업 자동화(에이전트 기반)는 구상 단계

### D. 선택
19. 카카오 로그인 · 푸시 알림 · 검색

## 11. 법·브랜드 주의
- 실존 브랜드 이름·로고(나이키·아디다스 등)를 서비스 홍보물·기본 데이터에 쓰지 않는다(계약 전). 회원이 올린 딜의 상품명은 별개
- 전자상거래법 다크패턴 6유형 금지(숨은 갱신, 취소 방해, 거짓 할인 등). 할인율은 회원 입력 정가 기준이므로 표시 정책 검토 필요
- 업투는 통신판매중개자: 푸터(`src/components/footer.tsx`)의 "업투는 통신판매중개자이며 통신판매의 당사자가 아닙니다" 고지 유지

## 12. 로컬 개발
```bash
npm install
cp .env.example .env.local   # 공개 URL·publishable 키 입력
npm run dev                  # http://localhost:3000
npm run build
```
- DB 변경: `supabase/migrations/0007_…sql` 작성 → 로컬 Postgres 로 시험 → Supabase SQL Editor 에서 실행. 실행 순서·결과를 커밋 메시지에 남긴다
- 클라우드 개발 환경에서는 로컬 next 서버가 Supabase 서버 측에 닿지 않을 수 있다(프록시). 그 경우 배포 뒤 https://www.upto.co.kr 로 확인

## 13. 이 압축 파일에서 뺀 것
- 데모 시절 1장 기획안, 데모 버전(별도 아티팩트), 앱(UP%TO, 크레용 낙서 스타일) 별도 기획안과 레퍼런스(`design/` 폴더) — 웹 서비스와 별개 프로젝트
- `.env.local`, `node_modules`, `.next` (비밀 값·빌드 산출물)
