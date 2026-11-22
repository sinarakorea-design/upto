'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { authError } from '@/lib/korean-errors';

function Verify() {
  const email = useSearchParams().get('email') || '';
  const sb = useMemo(() => supabaseBrowser(), []);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  async function resend() {
    if (!email) return;
    setBusy(true);
    const { error } = await sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${location.origin}/auth/confirm?next=/my` } });
    setBusy(false); setMsg(error ? authError(error.message) : '인증 메일을 다시 보냈어요');
  }
  return (
    <>
      <header className="hdr"><Link className="wm" href="/"><i aria-hidden />UPTO</Link></header>
      <div className="steps3"><div><b>1</b>정보 입력</div><div className="on"><b>2</b>이메일 인증</div><div><b>3</b>가입 완료</div></div>
      <div className="card">
        <h1 style={{ margin: 0, fontSize: 20 }}>메일함을 확인해 주세요</h1>
        <p style={{ color: 'var(--fg2)' }}><b>{email || '입력한 이메일'}</b>로 인증 링크를 보냈어요. 링크를 누르면 가입이 끝나요.</p>
        <p className="help">메일이 안 보이면 스팸함도 확인해 주세요. 링크는 한 번만 쓸 수 있어요.</p>
        <button className="btn line" type="button" onClick={resend} disabled={busy || !email}>인증 메일 다시 보내기</button>
        {msg && <p className="help" role="status">{msg}</p>}
      </div>
      <p className="foot">인증을 마쳤나요? <Link href="/login">로그인</Link></p>
    </>
  );
}
export default function Page() { return <Suspense><Verify /></Suspense>; }
