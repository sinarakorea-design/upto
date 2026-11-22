import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase/server';
import { SUPABASE_URL } from '@/lib/env';

export const dynamic = 'force-dynamic';
type Row = { id: string; title: string; mall: string; price: number; list_price: number; photo_path: string | null; category: string };
const CATS: [string, string][] = [['all', '전체'], ['digital', '디지털'], ['food', '식품'], ['fashion', '패션'], ['beauty', '뷰티'], ['living', '생활'], ['baby', '유아'], ['game', '게임'], ['travel', '여행']];

export default async function Home({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const cat = (await searchParams).cat || 'all';
  let rows: Row[] = [], nick = '', signedIn = false;
  if (SUPABASE_URL) {
    const sb = await supabaseServer();
    let q = sb.from('products').select('id,title,mall,price,list_price,photo_path,category').eq('status', 'live').order('created_at', { ascending: false }).limit(40);
    if (cat !== 'all') q = q.eq('category', cat);
    const [{ data }, { data: c }] = await Promise.all([q, sb.auth.getClaims()]);
    rows = (data as Row[]) || []; signedIn = !!c?.claims?.sub;
    if (signedIn) { const { data: me } = await sb.from('profiles').select('nickname').eq('id', c!.claims.sub).maybeSingle(); nick = me?.nickname || ''; }
  }
  const here = cat === 'all' ? '/' : `/?cat=${cat}`, nx = encodeURIComponent(here);
  const photo = (p: string | null) => (p ? `${SUPABASE_URL}/storage/v1/object/public/product-photos/${p}` : '');
  return (
    <>
      <header className="hdr"><Link className="wm" href="/"><i aria-hidden />UPTO</Link>
        <div className="r">{signedIn ? <Link className="sbtn" href="/my">{nick ? `${nick}님` : 'MY'}</Link> : <Link className="sbtn pri" href={`/login?next=${nx}`}>로그인</Link>}</div></header>
      {!signedIn && (
        <Link className="hero join-hero" href={`/join?next=${nx}`}>
          <b>가입하고 1,000P 받기</b><span>목표가 알림 · 포인트 · 내 딜 올리기까지, 1분이면 끝나요 →</span>
        </Link>
      )}
      <nav className="chips" aria-label="카테고리">{CATS.map(([k, l]) => <Link key={k} className="chip" aria-current={k === cat ? 'page' : undefined} href={k === 'all' ? '/' : `/?cat=${k}`}>{l}</Link>)}</nav>
      <div className="sh"><h2>{cat === 'all' ? '핫딜 피드' : CATS.find((c) => c[0] === cat)?.[1] + ' 핫딜'}</h2></div>
      {rows.length === 0 ? (
        <div className="empty"><b>아직 올라온 딜이 없어요</b>{signedIn ? '승인 회원이 되면 포인트로 첫 딜을 올릴 수 있어요' : <Link href={`/join?next=${nx}&from=post`}>회원이 되어 첫 딜을 올려 보세요</Link>}</div>
      ) : rows.map((r) => (
        <article className="deal" key={r.id}>
          <span className="tile">{r.photo_path && <img src={photo(r.photo_path)} alt="" loading="lazy" />}</span>
          <div><div className="meta"><b>{r.mall}</b></div><h3 className="ttl">{r.title}</h3>
            <div><span className="now">{r.price.toLocaleString('ko-KR')}원</span><span className="was">{r.list_price.toLocaleString('ko-KR')}원</span><span className="pct">−{Math.round((1 - r.price / r.list_price) * 100)}%</span></div>
            {!signedIn && <Link className="upbtn" href={`/join?next=${nx}&from=up`}>▲ UP</Link>}</div>
        </article>
      ))}
      {!signedIn && <Link className="stick" href={`/join?next=${nx}`}>업투 회원 되기 · 1,000P 선물</Link>}
    </>
  );
}
