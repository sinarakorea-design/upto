import Link from 'next/link';
import { redirect } from 'next/navigation';
import Logo from '@/components/logo';
import Tabs from '@/components/tabs';
import { supabaseServer } from '@/lib/supabase/server';
import { POST_COST, won } from '@/lib/format';
import LogoutButton from './logout';
import DailyButton from './daily-button';
import ShipForm from './ship-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'MY' };
const STATUS = { wait: ['승인 대기', ''], ok: ['승인 회원', 'ok'], blocked: ['이용 정지', 'bad'] } as const;
const OS: Record<string, string> = { paid: '결제 완료', canceled: '취소', refunded: '환불', settled: '정산 완료' };
const ORDER_COLS = 'order_no,amount,quantity,status,created_at,product_id,ship_name,ship_phone,ship_addr,ship_memo,courier,tracking_no,shipped_at';
type Order = { order_no: string; amount: number; quantity: number; status: string; created_at: string; product_id: string; ship_name: string | null; ship_phone: string | null; ship_addr: string | null; ship_memo: string | null; courier: string | null; tracking_no: string | null; shipped_at: string | null };

export default async function MyPage() {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getClaims();   // 서명 검증만, 인증 서버 왕복 없음
  const claims = data?.claims;
  if (!claims?.sub) redirect('/join?next=%2Fmy');
  const uid = claims.sub, today = 'daily:' + new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const [{ data: me }, { data: bal }, { data: mine }, { data: seller }, { data: bought }, { data: sold }, { data: payouts }, { data: daily }, { data: wishes }] = await Promise.all([
    sb.from('profiles').select('nickname, status, role').eq('id', uid).single(),
    sb.from('point_balance').select('balance').eq('user_id', uid).maybeSingle(),
    sb.from('products').select('id,title,price,status').eq('owner_id', uid).neq('status', 'removed').order('created_at', { ascending: false }).limit(30),
    sb.from('sellers').select('status').eq('user_id', uid).maybeSingle(),
    sb.from('orders').select(ORDER_COLS).eq('buyer_id', uid).neq('status', 'pending').order('created_at', { ascending: false }).limit(20),
    sb.from('orders').select(ORDER_COLS).eq('seller_id', uid).in('status', ['paid', 'settled']).order('created_at', { ascending: false }).limit(30),
    sb.from('payouts').select('amount,status').eq('seller_id', uid),
    sb.from('point_ledger').select('id').eq('user_id', uid).eq('reason', 'activity').eq('ref', today).maybeSingle(),
    sb.from('wishes').select('product_id').order('created_at', { ascending: false }).limit(30),
  ]);
  const orders = (bought as Order[]) || [], sales = (sold as Order[]) || [], wishIds = (wishes || []).map((w) => w.product_id as string);
  const ids = [...new Set([...orders, ...sales].map((o) => o.product_id).concat(wishIds))];
  const titles = new Map<string, { title: string; price: number }>();
  if (ids.length) { const { data: ps } = await sb.from('products').select('id,title,price').in('id', ids); (ps || []).forEach((x) => titles.set(x.id, x)); }
  const due = (payouts || []).filter((x) => x.status === 'scheduled' || x.status === 'requested').reduce((a, x) => a + x.amount, 0);
  const admin = me?.role === 'admin', st = STATUS[(me?.status as keyof typeof STATUS) || 'wait'], canPost = admin || me?.status === 'ok';
  const day = (s: string) => new Date(s).toLocaleDateString('ko-KR');
  return (
    <>
      <header className="hdr"><Logo /><div className="r"><LogoutButton /></div></header>
      <div className="page-h"><h1>{me?.nickname}님</h1><p>{claims.email as string}</p></div>
      <div className="card">
        <div className="kv"><span>회원 상태</span><span className={'st ' + st[1]}>{admin ? '운영자' : st[0]}</span></div>
        <div className="kv"><span>포인트 <b>{(bal?.balance ?? 0).toLocaleString('ko-KR')}P</b></span>{me?.status !== 'blocked' && <DailyButton done={!!daily} />}</div>
        <div className="kv"><span>판매자</span>{seller?.status === 'active' ? <span className="st ok">판매 중</span> : seller?.status === 'draft' ? <span className="st">심사 중</span> : seller?.status === 'paused' ? <span className="st bad">멈춤</span> : <Link className="sbtn" href="/seller">판매자 신청</Link>}</div>
        {seller?.status === 'active' && <div className="kv"><span>정산 예정</span><b>{won(due)}</b></div>}
      </div>
      {canPost ? <Link className="btn" href="/post">＋ 딜 올리기{admin ? '' : ` · ${POST_COST.toLocaleString('ko-KR')}P`}</Link>
        : me?.status === 'wait' ? <p className="notice">운영자가 승인하면 포인트로 딜을 올릴 수 있어요</p> : null}
      {admin && <Link className="btn line" href="/admin">운영자 화면</Link>}

      {sales.length > 0 && <><div className="sh"><h2>판매 내역 · 보낼 주문</h2></div><div className="card list">{sales.map((o) => (
        <div className="row col" key={o.order_no}><div><b>{titles.get(o.product_id)?.title || '주문'}</b> × {o.quantity}<div className="help">{won(o.amount)} · {day(o.created_at)} · {o.shipped_at ? '발송 완료' : '발송 대기'}</div></div>
          <div className="shipbox">{o.ship_name} · {o.ship_phone}<br />{o.ship_addr}{o.ship_memo && <><br />요청: {o.ship_memo}</>}{o.shipped_at && <><br /><b>{o.courier} {o.tracking_no}</b></>}</div>
          {!o.shipped_at && o.status === 'paid' && <ShipForm orderNo={o.order_no} />}</div>))}</div></>}

      {orders.length > 0 && <><div className="sh"><h2>주문 내역</h2></div><div className="card list">{orders.map((o) => (
        <Link className="row" key={o.order_no} href={`/p/${o.product_id}`}><div className="grow"><b>{titles.get(o.product_id)?.title || '주문'}</b>
          <div className="help">{won(o.amount)} · {OS[o.status] || o.status} · {day(o.created_at)}{o.shipped_at ? ` · 발송: ${o.courier} ${o.tracking_no}` : o.status === 'paid' ? ' · 발송 준비 중' : ''}</div></div><span className="go">›</span></Link>))}</div></>}

      {wishIds.length > 0 && <><div className="sh"><h2>찜</h2></div><div className="card list">{wishIds.filter((id) => titles.has(id)).map((id) => (
        <Link className="row" key={id} href={`/p/${id}`}><div className="grow"><b>{titles.get(id)!.title}</b><div className="help">{won(titles.get(id)!.price)}</div></div><span className="go">›</span></Link>))}</div></>}

      <div className="sh"><h2>내가 올린 딜</h2></div>
      {(mine || []).length ? <div className="card list">{mine!.map((p) => (
        <Link className="row" key={p.id} href={`/p/${p.id}`}><div className="grow"><b>{p.title}</b><div className="help">{won(p.price)} · {p.status === 'live' ? '보이는 중' : '숨김'}</div></div><span className="go">›</span></Link>))}</div>
        : <p className="empty">아직 올린 딜이 없어요</p>}
      <Tabs current="my" />
    </>
  );
}
