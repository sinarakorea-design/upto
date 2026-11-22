'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { authError } from '@/lib/korean-errors';

function Login() {
  const router = useRouter();
  const failed = useSearchParams().get('confirm') === 'fail';
  const sb = useMemo(() => supabaseBrowser(), []);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState(failed ? '인증 링크가 만료됐거나 이미 쓰였어요. 로그인해 보거나 메일을 다시 받아 주세요' : '');
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setErr(''); setUnconfirmed(false);
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: pw });
    if (error) { setBusy(false); setErr(authError(error.message)); setUnconfirmed(/not confirmed/i.test(error.message)); return; }
    router.replace('/my');   // 버튼은 '로그인 중'을 유지한 채 바로 이동(새로 고침 한 번을 뺐다)
  }
  async function resend() {
    const { error } = await sb.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: `${location.origin}/auth/confirm?next=/my` } });
    setErr(error ? authError(error.message) : '인증 메일을 다시 보냈어요');
  }
  return (
    <>
      <header className="hdr"><Link className="wm" href="/"><i aria-hidden />UPTO</Link></header>
      <div className="page-h"><h1>로그인</h1><p>업투 계정으로 로그인해요</p></div>
      <form className="card" onSubmit={submit} noValidate>
        <label className="lab" htmlFor="email">이메일</label>
        <input className="in" id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="lab" htmlFor="pw">비밀번호</label>
        <input className="in" id="pw" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        {err && <p className="err" role="alert">{err}</p>}
        {unconfirmed && <button className="sbtn" type="button" onClick={resend} style={{ marginTop: 8 }}>인증 메일 다시 받기</button>}
        <button className="btn" type="submit" disabled={busy || !email || !pw}>{busy ? '로그인 중…' : '로그인'}</button>
      </form>
      <p className="foot">처음인가요? <Link href="/signup">회원가입</Link></p>
    </>
  );
}
export default function Page() { return <Suspense><Login /></Suspense>; }
