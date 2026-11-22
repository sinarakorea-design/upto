import Link from 'next/link';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import LogoutButton from './logout';

export const dynamic = 'force-dynamic';
const STATUS = { wait: ['승인 대기', ''], ok: ['승인 회원', 'ok'], blocked: ['이용 정지', 'bad'] } as const;

export default async function MyPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/login');
  const [{ data: me }, { data: bal }] = await Promise.all([
    sb.from('profiles').select('nickname, status, role, created_at').eq('id', user.id).single(),
    sb.from('point_balance').select('balance').eq('user_id', user.id).maybeSingle(),
  ]);
  const welcome = (await searchParams).welcome === '1';
  const st = STATUS[(me?.status as keyof typeof STATUS) || 'wait'];
  return (
    <>
      <header className="hdr"><Link className="wm" href="/"><i aria-hidden />UPTO</Link><div className="r"><LogoutButton /></div></header>
      {welcome && <div className="hero"><b>가입이 끝났어요, {me?.nickname}님</b><span>가입 선물로 1,000P를 넣어 드렸어요</span></div>}
      <div className="page-h"><h1>MY</h1><p>{user.email}</p></div>
      <div className="card">
        <div className="kv"><span>닉네임</span><b>{me?.nickname}</b></div>
        <div className="kv"><span>회원 상태</span><span className={'st ' + st[1]}>{me?.role === 'admin' ? '운영자' : st[0]}</span></div>
        <div className="kv"><span>포인트</span><b>{(bal?.balance ?? 0).toLocaleString('ko-KR')}P</b></div>
      </div>
      {me?.status === 'wait' && me?.role !== 'admin' && <p className="help" style={{ marginTop: 12 }}>운영자가 승인하면 포인트로 상품을 올릴 수 있어요(한 번에 500P).</p>}
    </>
  );
}
