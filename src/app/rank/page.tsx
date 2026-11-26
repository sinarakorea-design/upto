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
        : rows.length === 0 ? <div className="empty"><b>아직 올라온 딜이 없어요</b>딜이 하나라도 올라오면 추천 수 순서로 여기에 바로 보여요<br /><Link href={uid ? '/post' : '/join?next=%2Fpost&from=post'}>첫 딜 올리고 1위 하기</Link></div>
        : rows.map((r, i) => <DealCard key={r.id} r={r} rank={i + 1} upOn={ups.has(r.id)} uid={uid} next="/rank" />)}
      <Tabs current="rank" />
    </>
  );
}
