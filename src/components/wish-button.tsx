'use client';
import Link from 'next/link';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { toast } from '@/lib/toast';

export default function WishButton({ id, on, signedIn, next }: { id: string; on: boolean; signedIn: boolean; next: string }) {
  const [v, setV] = useState(on); const [busy, setBusy] = useState(false);
  if (!signedIn) return <Link className="upb" href={`/join?next=${encodeURIComponent(next)}&from=wish`}>♡ 찜</Link>;
  async function tap() {
    if (busy) return; setBusy(true); setV(!v);
    const { data, error } = await supabaseBrowser().rpc('toggle_wish', { p_product: id }); setBusy(false);
    if (error) { setV(v); toast('찜하지 못했어요. 다시 눌러 주세요'); return; }
    setV(!!data); toast(data ? '찜했어요 · MY 에서 볼 수 있어요' : '찜을 풀었어요');
  }
  return <button type="button" className={'upb' + (v ? ' on' : '')} aria-pressed={v} onClick={tap}>{v ? '♥' : '♡'} 찜</button>;
}
