'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { dbError } from '@/lib/format';

function useRun() {
  const router = useRouter(); const [busy, setBusy] = useState(false);
  const run = async (fn: string, args: Record<string, unknown>) => {
    setBusy(true); const { error } = await supabaseBrowser().rpc(fn, args); setBusy(false);
    if (error) alertLine(dbError(error.message)); else router.refresh();
  };
  return { busy, run };
}
function alertLine(m: string) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.append(t); setTimeout(() => t.remove(), 3000); }

export function MemberActions({ id, status }: { id: string; status: string }) {
  const { busy, run } = useRun();
  return (
    <div className="acts">
      {status !== 'ok' && <button className="sbtn pri" disabled={busy} onClick={() => run('admin_set_member', { p_user: id, p_status: 'ok' })}>승인</button>}
      {status !== 'blocked' && <button className="sbtn" disabled={busy} onClick={() => run('admin_set_member', { p_user: id, p_status: 'blocked' })}>정지</button>}
      {status === 'blocked' && <button className="sbtn" disabled={busy} onClick={() => run('admin_set_member', { p_user: id, p_status: 'wait' })}>정지 풀기</button>}
      <button className="sbtn" disabled={busy} onClick={() => run('admin_grant_points', { p_user: id, p_delta: 3000, p_note: '운영자 지급' })}>+3,000P</button>
    </div>
  );
}
export function ProductActions({ id, status }: { id: string; status: string }) {
  const { busy, run } = useRun();
  if (status === 'removed') return null;
  return <div className="acts">{status === 'live'
    ? <button className="sbtn" disabled={busy} onClick={() => run('set_product_status', { p_id: id, p_status: 'hidden' })}>숨기기</button>
    : <button className="sbtn" disabled={busy} onClick={() => run('set_product_status', { p_id: id, p_status: 'live' })}>보이기</button>}</div>;
}
