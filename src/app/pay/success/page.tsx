import Link from 'next/link';
import Logo from '@/components/logo';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { tossSecret } from '@/lib/toss';
import { won } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: '결제 결과', robots: { index: false } };

// 토스가 돌려보낸 결제를 서버에서 확인한다: ① 우리 주문 금액과 같은지 ② 토스 승인 API ③ DB 에 한 번만 반영
async function confirm(paymentKey: string, orderId: string, amount: number): Promise<{ ok: boolean; msg: string }> {
  const admin = supabaseAdmin();
  if (!admin) return { ok: false, msg: '결제 설정이 아직 끝나지 않았어요(운영자 확인 필요). 돈은 빠져나가지 않았어요' };
  const { data: o } = await admin.from('orders').select('amount,status').eq('order_no', orderId).maybeSingle();
  if (!o) return { ok: false, msg: '주문을 찾지 못했어요' };
  if (o.status === 'paid') return { ok: true, msg: '이미 결제가 끝난 주문이에요' };
  if (o.amount !== amount) return { ok: false, msg: '결제 금액이 주문과 달라 결제하지 않았어요' };
  const res = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST', cache: 'no-store',
    headers: { Authorization: 'Basic ' + Buffer.from(tossSecret() + ':').toString('base64'), 'Content-Type': 'application/json', 'Idempotency-Key': orderId },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, msg: body?.message || '결제 승인에 실패했어요. 돈은 빠져나가지 않았어요' };
  const { data: r } = await admin.rpc('mark_order_paid', { p_order_no: orderId, p_payment_key: paymentKey, p_amount: amount, p_method: body?.method || null, p_raw: body });
  return r === 'ok' || r === 'already' ? { ok: true, msg: '결제가 끝났어요' } : { ok: false, msg: '결제는 됐지만 기록에 문제가 있어요. 운영자가 확인할게요' };
}

export default async function PaySuccess({ searchParams }: { searchParams: Promise<{ paymentKey?: string; orderId?: string; amount?: string }> }) {
  const sp = await searchParams, amount = Number(sp.amount);
  const r = sp.paymentKey && sp.orderId && Number.isInteger(amount) && amount > 0 ? await confirm(sp.paymentKey, sp.orderId, amount) : { ok: false, msg: '결제 정보가 올바르지 않아요' };
  return (
    <>
      <header className="hdr"><Logo /></header>
      <div className={'hero' + (r.ok ? '' : ' bad')}><b>{r.ok ? '결제 완료' : '결제가 끝나지 않았어요'}</b><span>{r.msg}{r.ok && Number.isInteger(amount) ? ` · ${won(amount)}` : ''}</span></div>
      <Link className="btn" href="/my">주문 내역 보기</Link>
      <Link className="btn line" href="/">업투 홈</Link>
    </>
  );
}
