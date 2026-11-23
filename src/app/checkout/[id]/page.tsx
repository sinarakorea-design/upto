import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import Logo from '@/components/logo';
import { supabaseServer } from '@/lib/supabase/server';
import { off, photoUrl, won } from '@/lib/format';
import { TOSS_CLIENT_KEY } from '@/lib/toss';
import Checkout from './checkout';

export const dynamic = 'force-dynamic';
export const metadata = { title: '구매하기', robots: { index: false } };

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const sb = await supabaseServer();
  const { data: c } = await sb.auth.getClaims(); const uid = c?.claims?.sub;
  if (!uid) redirect(`/join?next=${encodeURIComponent('/checkout/' + id)}&from=buy`);
  const { data: p } = await sb.from('feed').select('id,title,price,list_price,photo_path,on_sale,stock,owner_id,seller').eq('id', id).maybeSingle();
  if (!p) notFound();
  const head = <header className="hdr"><Logo /></header>;
  if (!p.on_sale) return <>{head}<div className="card"><h1 className="h1s">지금은 살 수 없는 딜이에요</h1><Link className="btn" href={`/p/${id}`}>딜로 돌아가기</Link></div></>;
  if (p.owner_id === uid) return <>{head}<div className="card"><h1 className="h1s">내가 올린 딜은 살 수 없어요</h1><Link className="btn" href={`/p/${id}`}>딜로 돌아가기</Link></div></>;
  if (p.stock === 0) return <>{head}<div className="card"><h1 className="h1s">품절됐어요</h1><Link className="btn" href={`/p/${id}`}>딜로 돌아가기</Link></div></>;
  return (
    <>
      {head}
      <div className="page-h"><h1>구매하기</h1><p>{p.seller} 판매 · 결제는 토스페이먼츠로 안전하게</p></div>
      <div className="deal" style={{ borderBottom: 0 }}><span className="tile">{p.photo_path && <img src={photoUrl(p.photo_path)} alt="" />}</span>
        <div><h3 className="ttl">{p.title}</h3><div><span className="now">{won(p.price)}</span>{p.list_price > p.price && <span className="pct">−{off(p.price, p.list_price)}%</span>}</div></div></div>
      <Checkout productId={id} price={p.price} maxQty={Math.min(10, p.stock ?? 10)} customerKey={uid} clientKey={TOSS_CLIENT_KEY} email={(c?.claims?.email as string) || ''} />
    </>
  );
}
