'use client';
import Link from 'next/link';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { toast } from '@/lib/toast';

// UP 추천: 누르면 바로 숫자가 바뀌고(먼저 보여 줌) 서버 결과로 맞춘다. 비회원은 가입 안내로.
export default function UpButton({ id, count, on, signedIn, own, next }: { id: string; count: number; on: boolean; signedIn: boolean; own?: boolean; next: string }) {
  const [s, setS] = useState({ on, count }); const [busy, setBusy] = useState(false);
  if (!signedIn) return <Link className="upb" href={`/join?next=${encodeURIComponent(next)}&from=up`} aria-label={`UP 추천 ${count}`}>▲ <b>{count}</b></Link>;
  async function tap() {
    if (busy) return;
    if (own) { toast('내 딜은 추천할 수 없어요'); return; }
    const prev = s; setS({ on: !s.on, count: Math.max(0, s.count + (s.on ? -1 : 1)) }); setBusy(true);
    const { data, error } = await supabaseBrowser().rpc('toggle_up', { p_product: id }); setBusy(false);
    const row = Array.isArray(data) ? data[0] : data;
    if (error || !row) { setS(prev); toast('추천하지 못했어요. 다시 눌러 주세요'); return; }
    setS({ on: row.is_on, count: row.total });
  }
  return <button type="button" className={'upb' + (s.on ? ' on' : '')} aria-pressed={s.on} aria-label={`UP 추천 ${s.count}`} onClick={tap}>▲ <b>{s.count}</b></button>;
}
