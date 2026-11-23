'use client';
import { useEffect, useState } from 'react';

// 인증 링크로 돌아오면(?welcome=1) 어느 화면이든 한 번 축하 문구를 띄우고 주소에서 표시를 지운다.
export default function WelcomeToast() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const u = new URL(location.href);
    if (u.searchParams.get('welcome') !== '1') return;
    setOn(true); u.searchParams.delete('welcome'); history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
    const t = setTimeout(() => setOn(false), 4000); return () => clearTimeout(t);
  }, []);
  if (!on) return null;
  return <div className="toast" role="status"><b>가입 완료!</b> 가입 선물 5,000P를 넣어 드렸어요</div>;
}
