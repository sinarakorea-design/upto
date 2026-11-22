'use client';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function LogoutButton() {
  const router = useRouter();
  return <button className="sbtn" type="button" onClick={async () => { await supabaseBrowser().auth.signOut(); router.replace('/'); router.refresh(); }}>로그아웃</button>;
}
