'use client';
import Script from 'next/script';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { won } from '@/lib/format';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { TossPayments?: any } }
const ERR: Record<string, string> = { not_for_sale: '지금은 살 수 없는 딜이에요', sold_out: '재고가 모자라요', own_product: '내가 올린 딜은 살 수 없어요', seller_not_ready: '판매자 준비가 아직 안 됐어요', too_many_pending: '잠시 뒤 다시 시도해 주세요', bad_shipping: '받는 분 정보를 확인해 주세요', bad_quantity: '수량을 확인해 주세요', not_signed_in: '다시 로그인해 주세요' };

type Last = { ship_name: string | null; ship_phone: string | null; ship_addr: string | null } | null;
export default function Checkout({ productId, price, maxQty, customerKey, clientKey, email, last }: { productId: string; price: number; maxQty: number; customerKey: string; clientKey: string; email: string; last: Last }) {
  const sb = useMemo(() => supabaseBrowser(), []);
  const widgets = useRef<any>(null);
  const [sdk, setSdk] = useState(false); const [ready, setReady] = useState(false); const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const [name, setName] = useState(last?.ship_name || ''); const [phone, setPhone] = useState(last?.ship_phone || ''); const [addr, setAddr] = useState(last?.ship_addr || ''); const [memo, setMemo] = useState('');
  const amount = price * qty, digits = phone.replace(/[^0-9]/g, '');
  const shipProblem = name.trim().length < 2 ? '받는 분 이름을 적어 주세요' : digits.length < 9 || digits.length > 11 ? '연락처를 확인해 주세요' : addr.trim().length < 8 ? '주소를 자세히 적어 주세요' : '';

  // 결제 UI(토스가 그린다)를 한 번만 그린다
  useEffect(() => {
    if (!sdk || widgets.current || !window.TossPayments) return;
    (async () => {
      try {
        const w = window.TossPayments(clientKey).widgets({ customerKey });
        await w.setAmount({ currency: 'KRW', value: price });
        await Promise.all([w.renderPaymentMethods({ selector: '#toss-methods', variantKey: 'DEFAULT' }), w.renderAgreement({ selector: '#toss-agreement', variantKey: 'AGREEMENT' })]);
        widgets.current = w; setReady(true);
      } catch { setErr('결제 화면을 불러오지 못했어요. 새로 고쳐 주세요'); }
    })();
  }, [sdk, clientKey, customerKey, price]);
  useEffect(() => { if (widgets.current) widgets.current.setAmount({ currency: 'KRW', value: amount }); }, [amount]);

  async function pay() {
    if (!ready || busy) return;
    if (shipProblem) { setErr(shipProblem); return; }
    setBusy(true); setErr('');
    const { data, error } = await sb.rpc('create_order', { p_product: productId, p_qty: qty, p_name: name.trim(), p_phone: digits, p_addr: addr.trim(), p_memo: memo.trim() || null });
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) { setBusy(false); setErr(ERR[Object.keys(ERR).find((k) => error?.message?.includes(k)) || ''] || '주문을 만들지 못했어요. 다시 눌러 주세요'); return; }
    if (row.amount !== amount) { setBusy(false); setErr('가격이 바뀌었어요. 새로 고쳐 주세요'); return; }
    try {
      await widgets.current.requestPayment({ orderId: row.order_no, orderName: row.order_name, successUrl: `${location.origin}/pay/success`, failUrl: `${location.origin}/pay/fail?p=${productId}`, customerEmail: email || undefined });
    } catch (e: any) { setBusy(false); if (e?.code !== 'USER_CANCEL') setErr(e?.message || '결제를 시작하지 못했어요'); }
  }
  return (
    <>
      <Script src="https://js.tosspayments.com/v2/standard" strategy="afterInteractive" onReady={() => setSdk(true)} />
      <div className="card qty">
        <span>수량</span>
        <div className="stepper"><button type="button" aria-label="하나 빼기" disabled={qty <= 1} onClick={() => setQty(qty - 1)}>−</button><b>{qty}</b><button type="button" aria-label="하나 더하기" disabled={qty >= maxQty} onClick={() => setQty(qty + 1)}>＋</button></div>
      </div>
      <div className="card">
        <b>받는 분</b>
        <label className="lab" htmlFor="sn">이름</label><input className="in" id="sn" maxLength={20} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="lab" htmlFor="sp">연락처</label><input className="in num" id="sp" inputMode="tel" maxLength={13} autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="휴대폰 번호" />
        <label className="lab" htmlFor="sa">주소 <small>동·호수까지</small></label><input className="in" id="sa" maxLength={150} autoComplete="street-address" value={addr} onChange={(e) => setAddr(e.target.value)} />
        <label className="lab" htmlFor="sm">배송 요청 <small>선택</small></label><input className="in" id="sm" maxLength={100} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예) 문 앞에 놓아 주세요" />
        <p className="help">받는 분 정보는 이 주문의 판매자에게만 전달돼요.</p>
      </div>
      <div id="toss-methods" />
      <div id="toss-agreement" />
      {!ready && !err && <p className="help center">결제 화면을 불러오는 중…</p>}
      {err && <p className="err" role="alert">{err}</p>}
      <div className="barfix"><button className="btn" type="button" disabled={!ready || busy} onClick={pay}>{busy ? '결제 진행 중…' : `${won(amount)} 결제하기`}</button></div>
    </>
  );
}
