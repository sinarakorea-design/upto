import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase/server';
import { safeNext } from '@/lib/next-url';

// 인증 메일의 링크가 여기로 온다. 두 방식 모두 받는다: ?code=(PKCE) 또는 ?token_hash=&type=(메일 템플릿).
export async function GET(request: NextRequest) {
  const u = new URL(request.url);
  const next = safeNext(u.searchParams.get('next'));
  const code = u.searchParams.get('code'), tokenHash = u.searchParams.get('token_hash'), type = u.searchParams.get('type') as EmailOtpType | null;
  const sb = await supabaseServer();
  let ok = false;
  if (code) ok = !(await sb.auth.exchangeCodeForSession(code)).error;
  else if (tokenHash && type) ok = !(await sb.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  return NextResponse.redirect(new URL(ok ? `${next}${next.includes('?') ? '&' : '?'}welcome=1` : '/login?confirm=fail', u.origin));
}
