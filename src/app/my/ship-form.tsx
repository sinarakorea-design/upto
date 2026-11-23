'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { toast } from '@/lib/toast';

const COURIERS = ['CJ대한통운', '한진택배', '롯데택배', '우체국택배', '로젠택배', '기타'];
export default function ShipForm({ orderNo }: { orderNo: string }) {
  const router = useRouter(); const [c, setC] = useState(COURIERS[0]); const [t, setT] = useState(''); const [busy, setBusy] = useState(false);
  async function send() {
    if (t.replace(/[^0-9A-Za-z]/g, '').length < 6) { toast('송장번호를 확인해 주세요'); return; }
    setBusy(true); const { error } = await supabaseBrowser().rpc('mark_shipped', { p_order_no: orderNo, p_courier: c, p_tracking: t.trim() }); setBusy(false);
    if (error) { toast('저장하지 못했어요. 다시 눌러 주세요'); return; }
    toast('발송 처리했어요'); router.refresh();
  }
  return (
    <div className="row2" style={{ marginTop: 8 }}>
      <select className="sel" aria-label="택배사" value={c} onChange={(e) => setC(e.target.value)}>{COURIERS.map((x) => <option key={x}>{x}</option>)}</select>
      <input className="in num" style={{ height: 44 }} inputMode="numeric" placeholder="송장번호" aria-label="송장번호" value={t} onChange={(e) => setT(e.target.value)} />
      <button className="btn" style={{ gridColumn: '1 / -1', marginTop: 0, height: 44 }} type="button" disabled={busy} onClick={send}>발송 처리</button>
    </div>
  );
}
