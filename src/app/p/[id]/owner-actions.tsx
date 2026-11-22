'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { dbError } from '@/lib/format';

export default function OwnerActions({ id, status }: { id: string; status: string }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [sure, setSure] = useState(false); const [err, setErr] = useState('');
  async function set(s: 'live' | 'hidden' | 'removed') {
    setBusy(true); setErr('');
    const { error } = await supabaseBrowser().rpc('set_product_status', { p_id: id, p_status: s });
    setBusy(false); if (error) { setErr(dbError(error.message)); return; }
    if (s === 'removed') router.replace('/my'); else router.refresh();
  }
  return (
    <div className="owner">
      {status === 'live' ? <button className="btn line" type="button" disabled={busy} onClick={() => set('hidden')}>숨기기</button> : <button className="btn line" type="button" disabled={busy} onClick={() => set('live')}>다시 보이기</button>}
      <button className="btn ghost-bad" type="button" disabled={busy} onClick={() => (sure ? set('removed') : setSure(true))}>{sure ? '한 번 더 누르면 삭제돼요' : '삭제'}</button>
      {err && <p className="err">{err}</p>}
    </div>
  );
}
