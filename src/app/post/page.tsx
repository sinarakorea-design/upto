import { redirect } from 'next/navigation';
import Logo from '@/components/logo';
import { supabaseServer } from '@/lib/supabase/server';
import { POST_COST } from '@/lib/format';
import PostForm from './post-form';
import { ensureOwnerAdmin } from '@/lib/owner';

export const dynamic = 'force-dynamic';
export const metadata = { title: '딜 올리기' };

export default async function PostPage() {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getClaims();
  const uid = data?.claims?.sub;
  if (!uid) redirect('/join?next=%2Fpost&from=post');
  const [{ data: me }, { data: bal }] = await Promise.all([
    sb.from('profiles').select('nickname,status,role').eq('id', uid).single(),
    sb.from('point_balance').select('balance').eq('user_id', uid).maybeSingle(),
  ]);
  if (me && await ensureOwnerAdmin(uid, data?.claims?.email, me.role)) { me.role = 'admin'; me.status = 'ok'; }
  const admin = me?.role === 'admin', balance = bal?.balance ?? 0;
  const head = <header className="hdr"><Logo /></header>;
  if (!admin && me?.status === 'blocked') return <>{head}<div className="card"><h1 className="h1s">이용이 멈춘 계정이에요</h1><p className="help">운영자에게 문의해 주세요.</p></div></>;
  if (!admin && me?.status !== 'ok') return (<>{head}<div className="hero"><b>승인을 기다리는 중이에요</b><span>운영자가 확인하면 바로 딜을 올릴 수 있어요. 지금 포인트 {balance.toLocaleString('ko-KR')}P</span></div></>);
  return <>{head}<PostForm uid={uid} seller={me?.nickname || ''} balance={balance} cost={admin ? 0 : POST_COST} /></>;
}
