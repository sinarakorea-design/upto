import Link from 'next/link';
import { redirect } from 'next/navigation';
import Logo from '@/components/logo';
import { supabaseServer } from '@/lib/supabase/server';
import { catName, won } from '@/lib/format';
import { MemberActions, ProductActions, SellerActions } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: '운영자', robots: { index: false } };
type M = { id: string; nickname: string; email: string; status: 'wait' | 'ok' | 'blocked'; role: string; created_at: string; balance: number; products: number };
const LAB = { wait: '승인 대기', ok: '승인', blocked: '정지' } as const;

// 운영자 한 화면: 위 숫자 → 회원(대기/승인/정지) → 상품. 버튼은 승인·정지·포인트·숨기기뿐.
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; s?: string }> }) {
  const sp = await searchParams, tab = (['products', 'sellers', 'orders'].includes(sp.tab || '') ? sp.tab : 'members') as string, s = (['wait', 'ok', 'blocked'].includes(sp.s || '') ? sp.s : 'wait') as M['status'];
  const sb = await supabaseServer();
  const { data: c } = await sb.auth.getClaims(); const uid = c?.claims?.sub;
  if (!uid) redirect('/login?next=%2Fadmin');
  const { data: me } = await sb.from('profiles').select('role').eq('id', uid).maybeSingle();
  if (me?.role !== 'admin') return <><header className="hdr"><Logo /></header><div className="card"><h1 className="h1s">운영자 전용이에요</h1><Link className="btn" href="/">업투로 가기</Link></div></>;
  const { data: all } = await sb.rpc('admin_list_members');
  const members = (all as M[]) || [], count = { wait: 0, ok: 0, blocked: 0 }; members.forEach((m) => count[m.status]++);
  const { data: prods } = tab === 'products' ? await sb.from('products').select('id,title,category,mall,price,status,created_at,owner_id').order('created_at', { ascending: false }).limit(100) : { data: [] };
  const nick = (id: string) => members.find((m) => m.id === id)?.nickname || '';
  const { data: sellers } = tab === 'sellers' ? await sb.from('sellers').select('user_id,business_type,display_name,business_no,contact_phone,toss_seller_id,status,created_at').order('created_at', { ascending: false }).limit(200) : { data: [] };
  const { data: orders } = tab === 'orders' ? await sb.from('orders').select('order_no,amount,status,created_at,buyer_id,seller_id').order('created_at', { ascending: false }).limit(100) : { data: [] };
  const { data: pays } = tab === 'orders' ? await sb.from('payouts').select('amount,fee,status') : { data: [] };
  const BT: Record<string, string> = { individual: '개인', individual_business: '개인사업자', corporate: '법인' };
  const SS: Record<string, string> = { draft: '심사 대기', review: '심사 중', active: '판매 중', paused: '멈춤' };
  return (
    <>
      <header className="hdr"><Logo /><span className="st" style={{ marginLeft: 6 }}>운영자</span></header>
      <div className="kpi"><Link href="/admin?s=wait"><b>{count.wait}</b><span>승인 대기</span></Link><Link href="/admin?s=ok"><b>{count.ok}</b><span>승인 회원</span></Link><Link href="/admin?tab=products"><b>{members.reduce((a, m) => a + m.products, 0)}</b><span>올린 딜</span></Link></div>
      <nav className="seg"><Link aria-current={tab === 'members' ? 'page' : undefined} href="/admin">회원</Link><Link aria-current={tab === 'products' ? 'page' : undefined} href="/admin?tab=products">딜</Link><Link aria-current={tab === 'sellers' ? 'page' : undefined} href="/admin?tab=sellers">판매자</Link><Link aria-current={tab === 'orders' ? 'page' : undefined} href="/admin?tab=orders">주문</Link></nav>
      {tab === 'sellers' && (<>
        <p className="help" style={{ marginTop: 12 }}>판매자 승인 방법: 토스페이먼츠 상점관리자 → 셀러 관리에서 이 판매자를 등록 → 받은 셀러 ID 를 아래 칸에 넣고 승인.</p>
        <div className="card list">{(sellers || []).map((x) => (
          <div className="row" key={x.user_id}><div className="grow"><b>{x.display_name}</b><span className={'st' + (x.status === 'active' ? ' ok' : x.status === 'paused' ? ' bad' : '')}>{SS[x.status]}</span>
            <div className="help">{nick(x.user_id)} · {BT[x.business_type]}{x.business_no ? ' · ' + x.business_no : ''} · {x.contact_phone}{x.toss_seller_id ? ' · 셀러 ID ' + x.toss_seller_id : ''}</div></div>
            <SellerActions id={x.user_id} status={x.status} sellerId={x.toss_seller_id || ''} /></div>))}
          {!(sellers || []).length && <p className="empty">판매자 신청이 없어요</p>}</div></>)}
      {tab === 'orders' && (<>
        <div className="kpi"><div><b>{(orders || []).filter((o) => o.status === 'paid').length}</b><span>결제 완료</span></div><div><b>{won((pays || []).filter((x) => x.status === 'scheduled').reduce((a, x) => a + x.amount, 0))}</b><span>정산 예정</span></div><div><b>{won((pays || []).reduce((a, x) => a + x.fee, 0))}</b><span>업투 수수료</span></div></div>
        <div className="card list">{(orders || []).filter((o) => o.status !== 'pending').map((o) => (
          <div className="row" key={o.order_no}><div className="grow"><b>{won(o.amount)}</b><div className="help">{o.order_no} · 구매 {nick(o.buyer_id)} → 판매 {nick(o.seller_id)} · {o.status} · {new Date(o.created_at).toLocaleString('ko-KR')}</div></div></div>))}
          {!(orders || []).some((o) => o.status !== 'pending') && <p className="empty">결제된 주문이 없어요</p>}</div>
        <p className="help">정산(판매자에게 보내기)은 토스페이먼츠 상점관리자의 지급대행 메뉴에서 실행해요. 환불은 토스 상점관리자에서 결제 취소로 해요.</p></>)}
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
      <p className="help" style={{ marginTop: 14 }}>정지하면 그 회원의 딜이 바로 숨겨져요. 포인트 +3,000(딜 1개 값)은 이벤트·보상용이에요.</p>
    </>
  );
}
