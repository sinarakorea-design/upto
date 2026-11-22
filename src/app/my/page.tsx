import Link from 'next/link';
import { redirect } from 'next/navigation';
import Logo from '@/components/logo';
import { supabaseServer } from '@/lib/supabase/server';
import { POST_COST, won } from '@/lib/format';
import LogoutButton from './logout';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'MY' };
const STATUS = { wait: ['승인 대기', ''], ok: ['승인 회원', 'ok'], blocked: ['이용 정지', 'bad'] } as const;

export default async function MyPage() {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getClaims();   // 서명 검증만, 인증 서버 왕복 없음
  const claims = data?.claims;
  if (!claims?.sub) redirect('/join?next=%2Fmy');
  const uid = claims.sub;
  const [{ data: me }, { data: bal }, { data: mine }] = await Promise.all([
    sb.from('profiles').select('nickname, status, role').eq('id', uid).single(),
    sb.from('point_balance').select('balance').eq('user_id', uid).maybeSingle(),
    sb.from('products').select('id,title,price,status').eq('owner_id', uid).neq('status', 'removed').order('created_at', { ascending: false }).limit(30),
  ]);
  const admin = me?.role === 'admin', st = STATUS[(me?.status as keyof typeof STATUS) || 'wait'], canPost = admin || me?.status === 'ok';
  return (
    <>
      <header className="hdr"><Logo /><div className="r"><LogoutButton /></div></header>
      <div className="page-h"><h1>{me?.nickname}님</h1><p>{claims.email as string}</p></div>
      <div className="card">
        <div className="kv"><span>회원 상태</span><span className={'st ' + st[1]}>{admin ? '운영자' : st[0]}</span></div>
        <div className="kv"><span>포인트</span><b>{(bal?.balance ?? 0).toLocaleString('ko-KR')}P</b></div>
      </div>
      {canPost ? <Link className="btn" href="/post">＋ 딜 올리기{admin ? '' : ` · ${POST_COST.toLocaleString('ko-KR')}P`}</Link>
        : me?.status === 'wait' ? <p className="notice">운영자가 승인하면 포인트로 딜을 올릴 수 있어요</p> : null}
      {admin && <Link className="btn line" href="/admin">운영자 화면</Link>}
      <div className="sh"><h2>내가 올린 딜</h2></div>
      {(mine || []).length ? <div className="card list">{mine!.map((p) => (
        <Link className="row" key={p.id} href={`/p/${p.id}`}><div className="grow"><b>{p.title}</b><div className="help">{won(p.price)} · {p.status === 'live' ? '보이는 중' : '숨김'}</div></div><span className="go">›</span></Link>))}</div>
        : <p className="empty">아직 올린 딜이 없어요</p>}
    </>
  );
}
