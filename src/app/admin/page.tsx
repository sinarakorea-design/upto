import Link from 'next/link';
import { redirect } from 'next/navigation';
import Logo from '@/components/logo';
import { supabaseServer } from '@/lib/supabase/server';
import { catName, won } from '@/lib/format';
import { MemberActions, ProductActions } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: '운영자', robots: { index: false } };
type M = { id: string; nickname: string; email: string; status: 'wait' | 'ok' | 'blocked'; role: string; created_at: string; balance: number; products: number };
const LAB = { wait: '승인 대기', ok: '승인', blocked: '정지' } as const;

// 운영자 한 화면: 위 숫자 → 회원(대기/승인/정지) → 상품. 버튼은 승인·정지·포인트·숨기기뿐.
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; s?: string }> }) {
  const sp = await searchParams, tab = sp.tab === 'products' ? 'products' : 'members', s = (['wait', 'ok', 'blocked'].includes(sp.s || '') ? sp.s : 'wait') as M['status'];
  const sb = await supabaseServer();
  const { data: c } = await sb.auth.getClaims(); const uid = c?.claims?.sub;
  if (!uid) redirect('/login?next=%2Fadmin');
  const { data: me } = await sb.from('profiles').select('role').eq('id', uid).maybeSingle();
  if (me?.role !== 'admin') return <><header className="hdr"><Logo /></header><div className="card"><h1 className="h1s">운영자 전용이에요</h1><Link className="btn" href="/">업투로 가기</Link></div></>;
  const { data: all } = await sb.rpc('admin_list_members');
  const members = (all as M[]) || [], count = { wait: 0, ok: 0, blocked: 0 }; members.forEach((m) => count[m.status]++);
  const { data: prods } = tab === 'products' ? await sb.from('products').select('id,title,category,mall,price,status,created_at,owner_id').order('created_at', { ascending: false }).limit(100) : { data: [] };
  const nick = (id: string) => members.find((m) => m.id === id)?.nickname || '';
  return (
    <>
      <header className="hdr"><Logo /><span className="st" style={{ marginLeft: 6 }}>운영자</span></header>
      <div className="kpi"><Link href="/admin?s=wait"><b>{count.wait}</b><span>승인 대기</span></Link><Link href="/admin?s=ok"><b>{count.ok}</b><span>승인 회원</span></Link><Link href="/admin?tab=products"><b>{members.reduce((a, m) => a + m.products, 0)}</b><span>올린 딜</span></Link></div>
      <nav className="seg"><Link aria-current={tab === 'members' ? 'page' : undefined} href="/admin">회원</Link><Link aria-current={tab === 'products' ? 'page' : undefined} href="/admin?tab=products">딜</Link></nav>
      {tab === 'members' ? (<>
        <nav className="chips">{(['wait', 'ok', 'blocked'] as const).map((k) => <Link key={k} className="chip" aria-current={s === k ? 'page' : undefined} href={`/admin?s=${k}`}>{LAB[k]} {count[k]}</Link>)}</nav>
        <div className="card list">{members.filter((m) => m.status === s).map((m) => (
          <div className="row" key={m.id}><div className="grow"><b>{m.nickname}</b>{m.role === 'admin' && <span className="st ok">운영자</span>}<div className="help">{m.email} · {m.balance.toLocaleString('ko-KR')}P · 딜 {m.products}개 · {new Date(m.created_at).toLocaleDateString('ko-KR')} 가입</div></div>
            {m.role !== 'admin' && <MemberActions id={m.id} status={m.status} />}</div>))}
          {!members.some((m) => m.status === s) && <p className="empty">{LAB[s]} 회원이 없어요</p>}</div>
      </>) : (
        <div className="card list">{(prods || []).map((p) => (
          <div className="row" key={p.id}><div className="grow"><Link href={`/p/${p.id}`}><b>{p.title}</b></Link><div className="help">{catName(p.category)} · {won(p.price)} · {p.mall} · {nick(p.owner_id)} · {p.status === 'live' ? '보임' : p.status === 'hidden' ? '숨김' : '삭제됨'}</div></div>
            <ProductActions id={p.id} status={p.status} /></div>))}
          {!(prods || []).length && <p className="empty">올라온 딜이 없어요</p>}</div>
      )}
      <p className="help" style={{ marginTop: 14 }}>정지하면 그 회원의 딜이 바로 숨겨져요. 포인트 +1,000 은 이벤트·보상용이에요.</p>
    </>
  );
}
