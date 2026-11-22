import Link from 'next/link';
import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
type Row = { id: string; title: string; mall: string; price: number; list_price: number; photo_path: string | null };

export default async function Home() {
  let rows: Row[] = [], signedIn = false;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const sb = await supabaseServer();
    const [{ data }, { data: u }] = await Promise.all([
      sb.from('products').select('id,title,mall,price,list_price,photo_path').eq('status', 'live').order('created_at', { ascending: false }).limit(30),
      sb.auth.getUser(),
    ]);
    rows = (data as Row[]) || []; signedIn = !!u.user;
  }
  const photo = (p: string | null) => p ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-photos/${p}` : '';
  return (
    <>
      <header className="hdr"><Link className="wm" href="/"><i aria-hidden />UPTO</Link>
        <div className="r">{signedIn ? <Link className="sbtn" href="/my">MY</Link> : <><Link className="sbtn" href="/login">로그인</Link><Link className="sbtn pri" href="/signup">가입</Link></>}</div></header>
      <div className="page-h"><h1>핫딜 피드</h1><p>업투 회원이 올린 오늘의 딜</p></div>
      {rows.length === 0 ? <p className="empty">아직 올라온 딜이 없어요</p> : rows.map((r) => (
        <article className="deal" key={r.id}>
          <span className="tile">{r.photo_path && <img src={photo(r.photo_path)} alt="" loading="lazy" />}</span>
          <div><div className="meta"><b>{r.mall}</b></div><h3 className="ttl">{r.title}</h3>
            <div><span className="now">{r.price.toLocaleString('ko-KR')}원</span><span className="was">{r.list_price.toLocaleString('ko-KR')}원</span><span className="pct">−{Math.round((1 - r.price / r.list_price) * 100)}%</span></div></div>
        </article>
      ))}
    </>
  );
}
