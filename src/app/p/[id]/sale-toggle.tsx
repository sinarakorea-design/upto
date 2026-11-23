'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

const MSG: Record<string, string> = { seller_not_ready: '판매자 승인 뒤에 켤 수 있어요', bad_stock: '재고를 확인해 주세요', not_allowed: '내 딜만 바꿀 수 있어요' };
export default function SaleToggle({ id, onSale, stock }: { id: string; onSale: boolean; stock: number | null }) {
  const router = useRouter(); const [n, setN] = useState(stock == null ? '' : String(stock)); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  async function set(on: boolean) {
    setBusy(true); setErr('');
    const v = n.trim() === '' ? null : Math.max(0, parseInt(n, 10) || 0);
    const { error } = await supabaseBrowser().rpc('set_product_sale', { p_id: id, p_enabled: on, p_stock: v });
    setBusy(false); if (error) { setErr(MSG[Object.keys(MSG).find((k) => error.message.includes(k)) || ''] || '바꾸지 못했어요'); return; }
    router.refresh();
  }
  return (
    <div className="card">
      <b>업투에서 바로 팔기</b>
      <div className="row2" style={{ alignItems: 'end' }}>
        <div><label className="lab" htmlFor="st">재고 <small>비우면 무제한</small></label><input className="in num" id="st" inputMode="numeric" value={n} onChange={(e) => setN(e.target.value.replace(/[^0-9]/g, ''))} /></div>
        <button className={'btn' + (onSale ? ' line' : '')} style={{ marginTop: 0 }} type="button" disabled={busy} onClick={() => set(!onSale)}>{onSale ? '판매 끄기' : '판매 켜기'}</button>
      </div>
      {err && <p className="err">{err}</p>}
    </div>
  );
}
