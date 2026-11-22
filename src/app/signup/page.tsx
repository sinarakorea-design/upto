'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { authError } from '@/lib/korean-errors';
import { safeNext, withNext } from '@/lib/next-url';

const NICK = /^[0-9A-Za-z가-힣_]{2,16}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function Signup() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  const sb = useMemo(() => supabaseBrowser(), []);
  const [email, setEmail] = useState('');
  const [nick, setNick] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [terms, setTerms] = useState(false);
  const [mkt, setMkt] = useState(false);
  const [nickOk, setNickOk] = useState<null | boolean>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // 닉네임: 형식이 맞으면 0.4초 뒤 중복 확인
  useEffect(() => {
    setNickOk(null);
    if (!NICK.test(nick)) return;
    const t = setTimeout(async () => {
      const { data, error } = await sb.rpc('nickname_available', { name: nick });
      setNickOk(error ? null : Boolean(data));
    }, 400);
    return () => clearTimeout(t);
  }, [nick, sb]);

  const pwOk = pw.length >= 8 && /[A-Za-z]/.test(pw) && /[0-9]/.test(pw);
  const ready = EMAIL.test(email) && NICK.test(nick) && nickOk !== false && pwOk && pw === pw2 && terms && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true); setErr('');
    const { error } = await sb.auth.signUp({
      email: email.trim(), password: pw,
      options: { emailRedirectTo: `${location.origin}/auth/confirm?next=${encodeURIComponent(next)}`, data: { nickname: nick, marketing: mkt } },
    });
    setBusy(false);
    if (error) { setErr(authError(error.message)); return; }
    router.push('/verify?email=' + encodeURIComponent(email.trim()) + '&next=' + encodeURIComponent(next));
  }

  return (
    <>
      <header className="hdr"><Link className="wm" href="/"><i aria-hidden />UPTO</Link></header>
      <div className="hero"><b>업투 회원가입</b><span>이메일 인증까지 1분이면 끝나요</span></div>
      <div className="steps3"><div className="on"><b>1</b>정보 입력</div><div><b>2</b>이메일 인증</div><div><b>3</b>가입 완료</div></div>
      <form className="card" onSubmit={submit} noValidate>
        <label className="lab" htmlFor="email">이메일</label>
        <input className="in" id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        {email && !EMAIL.test(email) && <p className="help bad">이메일 주소를 확인해 주세요</p>}

        <label className="lab" htmlFor="nick">닉네임 <small>2~16자 · 한글·영문·숫자·_</small></label>
        <input className={'in' + (nickOk === false ? ' bad' : '')} id="nick" maxLength={16} autoComplete="nickname" value={nick} onChange={(e) => setNick(e.target.value.trim())} placeholder="업투에 보일 이름" />
        {nick && !NICK.test(nick) && <p className="help bad">2~16자, 한글·영문·숫자·밑줄만 쓸 수 있어요</p>}
        {NICK.test(nick) && nickOk === true && <p className="help ok">쓸 수 있는 닉네임이에요</p>}
        {NICK.test(nick) && nickOk === false && <p className="help bad">이미 쓰는 닉네임이에요</p>}

        <label className="lab" htmlFor="pw">비밀번호 <small>8자 이상 · 영문과 숫자</small></label>
        <input className="in" id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        {pw && !pwOk && <p className="help bad">8자 이상, 영문과 숫자를 섞어 주세요</p>}
        <label className="lab" htmlFor="pw2">비밀번호 확인</label>
        <input className={'in' + (pw2 && pw !== pw2 ? ' bad' : '')} id="pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        {pw2 && pw !== pw2 && <p className="help bad">비밀번호가 서로 달라요</p>}

        <label className="lab">약관</label>
        <label className="agree"><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} /><span><b>[필수]</b> <Link href="/terms">이용약관</Link>과 <Link href="/privacy">개인정보 처리방침</Link>에 동의해요</span></label>
        <label className="agree"><input type="checkbox" checked={mkt} onChange={(e) => setMkt(e.target.checked)} /><span>[선택] 핫딜 소식을 이메일로 받을래요</span></label>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn" type="submit" disabled={!ready}>{busy ? '보내는 중' : '인증 메일 받기'}</button>
      </form>
      <p className="foot">이미 회원인가요? <Link href={withNext('/login', next)}>로그인</Link></p>
    </>
  );
}
export default function SignupPage() { return <Suspense><Signup /></Suspense>; }
