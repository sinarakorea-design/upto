import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/env';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// 로그인 쿠키를 매 요청마다 새로 고친다(Supabase SSR 권장 방식).
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = SUPABASE_URL, key = SUPABASE_KEY;
  if (!url || !key) return response;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // 로그인 확인은 토큰 서명을 이 서버에서 바로 검증한다(인증 서버 왕복 없음, 만료 직전이면 쿠키만 갱신)
  await supabase.auth.getClaims();
  return response;
}

// 로그인 상태를 서버에서 읽는 화면에만 건다(가입·로그인 같은 정적 화면은 그대로 빠르게)
export const config = { matcher: ['/', '/my/:path*', '/admin/:path*'] };
