'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { toast } from '@/lib/toast';

export default function DailyButton({ done }: { done: boolean }) {
  const router = useRouter(); const [off, setOff] = useState(done); const [busy, setBusy] = useState(false);
  async function tap() {
    setBusy(true); const { error } = await supabaseBrowser().rpc('claim_daily'); setBusy(false); setOff(true);
    toast(error ? (error.message.includes('already_today') ? '오늘은 이미 받았어요' : '받지 못했어요. 다시 눌러 주세요') : '출석 100P 를 받았어요');
    if (error && !error.message.includes('already_today')) setOff(false); else router.refresh();
  }
  return <button className="sbtn pri" type="button" disabled={off || busy} onClick={tap}>{off ? '오늘 출석 완료' : '출석하고 100P 받기'}</button>;
}
