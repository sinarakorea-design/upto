import Link from 'next/link';
import Logo from '@/components/logo';
import { supabaseServer } from '@/lib/supabase/server';
import { supabasePublic } from '@/lib/supabase/public';
import { SUPABASE_URL } from '@/lib/env';
import { CATS, catName, off, photoUrl, won, type FeedRow } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const raw = (await searchParams).cat || 'all', cat = raw === 'all' || CATS.some((c) => c[0] === raw) ? raw : 'all';
  let rows: FeedRow[] = [], nick = '', signedIn = false, failed = false;
  if (SUPABASE_URL) {
    let q = supabasePublic().from('feed').select('*').order('created_at', { ascending: false }).limit(40);
    if (cat !== 'all') q = q.eq('category', cat);
    const sb = await supabaseServer();
    const [feed, { data: c }] = await Promise.all([q, sb.auth.getClaims()]);
    rows = (feed.data as FeedRow[]) || []; failed = !!feed.error; signedIn = !!c?.claims?.sub;
    if (signedIn) { const { data: me } = await sb.from('profiles').select('nickname').eq('id', c!.claims.sub).maybeSingle(); nick = me?.nickname || ''; }
  }
  const here = cat === 'all' ? '/' : `/?cat=${cat}`, nx = encodeURIComponent(here);
  return (
    <>
      <header className="hdr"><Logo />
        <div className="r">{signedIn ? <><Link className="sbtn" href="/post">＋ 올리기</Link><Link className="sbtn" href="/my">{nick ? `${nick}님` : 'MY'}</Link></> : <Link className="sbtn pri" href={`/login?next=${nx}`}>로그인</Link>}</div></header>
      {!signedIn && (
        <Link className="hero join-hero" href={`/join?next=${nx}`}>
          <b>가입하고 5,000P 받기</b><span>목표가 알림 · 포인트 · 내 딜 올리기까지, 1분이면 끝나요 →</span>
        </Link>
      )}
      <nav className="chips" aria-label="카테고리"><Link className="chip" aria-current={cat === 'all' ? 'page' : undefined} href="/">전체</Link>{CATS.map(([k, l]) => <Link key={k} className="chip" aria-current={k === cat ? 'page' : undefined} href={`/?cat=${k}`}>{l}</Link>)}</nav>
      <div className="sh"><h2>{cat === 'all' ? '핫딜 피드' : catName(cat) + ' 핫딜'}</h2></div>
      {failed ? <div className="empty"><b>잠시 불러오지 못했어요</b><Link href={here}>다시 불러오기</Link></div>
        : rows.length === 0 ? (
        <div className="empty"><b>아직 올라온 딜이 없어요</b>{signedIn ? <Link href="/post">첫 딜을 올려 보세요</Link> : <Link href={`/join?next=${nx}&from=post`}>회원이 되어 첫 딜을 올려 보세요</Link>}</div>
      ) : rows.map((r) => (
        <Link className="deal" key={r.id} href={`/p/${r.id}`}>
          <span className="tile">{r.photo_path && <img src={photoUrl(r.photo_path)} alt="" loading="lazy" decoding="async" />}</span>
          <div><div className="meta"><b>{r.mall}</b> · {r.seller}</div><h3 className="ttl">{r.title}</h3>
            <div><span className="now">{won(r.price)}</span>{r.list_price > r.price && <><span className="was">{won(r.list_price)}</span><span className="pct">−{off(r.price, r.list_price)}%</span></>}</div></div>
        </Link>
      ))}
      {!signedIn && <Link className="stick" href={`/join?next=${nx}`}>업투 회원 되기 · 5,000P 선물</Link>}
    </>
  );
}
