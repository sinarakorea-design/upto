import Link from 'next/link';
import Logo from '@/components/logo';
import Tabs from '@/components/tabs';
import DealCard from '@/components/deal-card';
import { supabaseServer } from '@/lib/supabase/server';
import { supabasePublic } from '@/lib/supabase/public';
import { myUps } from '@/lib/my-ups';
import type { FeedRow } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: '오늘의 UP Top 50' };

// 최근 24시간 추천 수 순서. 같으면 전체 추천 수, 그다음 최신 순.
export default async function RankPage() {
  const sb = await supabaseServer();
  const [feed, { data: c }] = await Promise.all([
    supabasePublic(60).from('feed').select('*').order('ups_today', { ascending: false }).order('ups', { ascending: false }).order('created_at', { ascending: false }).limit(50),
    sb.auth.getClaims(),
  ]);
  const uid = c?.claims?.sub, rows = (feed.data as FeedRow[]) || [], ups = await myUps(sb, uid);
  return (
    <>
      <header className="hdr"><Logo /></header>
      <div className="hero"><b>오늘의 UP Top 50</b><span>최근 24시간 동안 회원들이 가장 많이 추천한 딜 · 1분마다 갱신</span></div>
      {feed.error ? <div className="empty"><b>잠시 불러오지 못했어요</b><Link href="/rank">다시 불러오기</Link></div>
        : rows.length === 0 ? <div className="empty"><b>아직 순위가 없어요</b><Link href="/">피드에서 마음에 드는 딜에 ▲ UP 을 눌러 보세요</Link></div>
        : rows.map((r, i) => <DealCard key={r.id} r={r} rank={i + 1} upOn={ups.has(r.id)} uid={uid} next="/rank" />)}
      <Tabs current="rank" />
    </>
  );
}
