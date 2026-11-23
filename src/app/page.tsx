import Link from 'next/link';
import Logo from '@/components/logo';
import Tabs from '@/components/tabs';
import Footer from '@/components/footer';
import DealCard from '@/components/deal-card';
import { supabaseServer } from '@/lib/supabase/server';
import { supabasePublic } from '@/lib/supabase/public';
import { myUps } from '@/lib/my-ups';
import { SUPABASE_URL } from '@/lib/env';
import { CATS, catName, type FeedRow } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const raw = (await searchParams).cat || 'all', cat = raw === 'all' || CATS.some((c) => c[0] === raw) ? raw : 'all';
  let rows: FeedRow[] = [], nick = '', uid: string | undefined, failed = false, ups = new Set<string>();
  if (SUPABASE_URL) {
    let q = supabasePublic().from('feed').select('*').order('created_at', { ascending: false }).limit(40);
    if (cat !== 'all') q = q.eq('category', cat);
    const sb = await supabaseServer();
    const [feed, { data: c }] = await Promise.all([q, sb.auth.getClaims()]);
    rows = (feed.data as FeedRow[]) || []; failed = !!feed.error; uid = c?.claims?.sub;
    if (uid) { const [{ data: me }, set] = await Promise.all([sb.from('profiles').select('nickname').eq('id', uid).maybeSingle(), myUps(sb, uid)]); nick = me?.nickname || ''; ups = set; }
  }
  const here = cat === 'all' ? '/' : `/?cat=${cat}`, nx = encodeURIComponent(here);
  return (
    <>
      <header className="hdr"><Logo />
        <div className="r">{uid ? <Link className="sbtn" href="/my">{nick ? `${nick}님` : 'MY'}</Link> : <Link className="sbtn pri" href={`/login?next=${nx}`}>로그인</Link>}</div></header>
      {!uid && (
        <Link className="hero join-hero" href={`/join?next=${nx}`}>
          <b>가입하고 5,000P 받기</b><span>UP 추천 · 찜 · 내 딜 올리기까지, 1분이면 끝나요 →</span>
        </Link>
      )}
      <nav className="chips" aria-label="카테고리"><Link className="chip" aria-current={cat === 'all' ? 'page' : undefined} href="/">전체</Link>{CATS.map(([k, l]) => <Link key={k} className="chip" aria-current={k === cat ? 'page' : undefined} href={`/?cat=${k}`}>{l}</Link>)}</nav>
      <div className="sh"><h2>{cat === 'all' ? '핫딜 피드' : catName(cat) + ' 핫딜'}</h2></div>
      {failed ? <div className="empty"><b>잠시 불러오지 못했어요</b><Link href={here}>다시 불러오기</Link></div>
        : rows.length === 0 ? (
        <div className="empty"><b>아직 올라온 딜이 없어요</b>{uid ? <Link href="/post">첫 딜을 올려 보세요</Link> : <Link href={`/join?next=${nx}&from=post`}>회원이 되어 첫 딜을 올려 보세요</Link>}</div>
      ) : rows.map((r) => <DealCard key={r.id} r={r} upOn={ups.has(r.id)} uid={uid} next={here} />)}
      <Footer />
      <Tabs current="home" />
    </>
  );
}
