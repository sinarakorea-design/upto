import Link from 'next/link';
import { notFound } from 'next/navigation';
import Logo from '@/components/logo';
import { supabaseServer } from '@/lib/supabase/server';
import { catName, off, photoUrl, won } from '@/lib/format';
import OwnerActions from './owner-actions';
import SaleToggle from './sale-toggle';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const sb = await supabaseServer();
  const { data } = await sb.from('feed').select('title,price,photo_path').eq('id', id).maybeSingle();
  return data ? { title: data.title, description: `${won(data.price)} · 업투 핫딜`, openGraph: { images: data.photo_path ? [photoUrl(data.photo_path)] : undefined } } : { title: '없는 딜' };
}

export default async function DealPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ posted?: string }> }) {
  const { id } = await params; if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const posted = (await searchParams).posted === '1';
  const sb = await supabaseServer();
  const [{ data: d }, { data: c }] = await Promise.all([sb.from('feed').select('*').eq('id', id).maybeSingle(), sb.auth.getClaims()]);
  const uid = c?.claims?.sub;
  let own = null as null | { id: string; title: string; status: string; owner_id: string };
  if (!d && uid) { const { data } = await sb.from('products').select('id,title,status,owner_id').eq('id', id).maybeSingle(); own = data; }   // 숨긴 상품은 주인·운영자만
  if (!d && !own) notFound();
  const isAdmin = uid ? (await sb.from('profiles').select('role').eq('id', uid).maybeSingle()).data?.role === 'admin' : false;
  const canEdit = !!uid && (isAdmin || uid === (d?.owner_id || own?.owner_id));
  const sellerActive = !!d && canEdit ? (await sb.from('sellers').select('status').eq('user_id', d.owner_id).maybeSingle()).data?.status === 'active' : false;
  if (!d && own) return (<><header className="hdr"><Logo /></header><div className="card"><h1 className="h1s">{own.title}</h1><p className="help">지금 숨김 상태라 다른 사람에게 보이지 않아요.</p>{canEdit && <OwnerActions id={id} status={own.status} />}</div></>);
  const p = d!;
  return (
    <>
      <header className="hdr"><Logo /><div className="r"><Link className="sbtn" href={`/?cat=${p.category}`}>{catName(p.category)}</Link></div></header>
      {posted && <p className="notice">업투에 올라갔어요! 피드에는 20초 안에 보여요</p>}
      <div className="big-photo">{p.photo_path ? <img src={photoUrl(p.photo_path)} alt={p.title} /> : <span>사진 없음</span>}</div>
      <div className="meta" style={{ marginTop: 14 }}><b>{p.mall}</b> · {p.seller}{p.ends_at && <> · <span className="urgent">{new Date(p.ends_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 마감</span></>}</div>
      <h1 className="dtitle">{p.title}</h1>
      <div><span className="now big">{won(p.price)}</span>{p.list_price > p.price && <><span className="was">{won(p.list_price)}</span><span className="pct">−{off(p.price, p.list_price)}%</span></>}</div>
      <p className="help">가격은 올린 회원이 적은 값이에요. 쇼핑몰에서 최종 가격을 꼭 확인해 주세요.</p>
      {p.on_sale && p.stock !== 0 && uid !== p.owner_id && <Link className="btn" href={`/checkout/${id}`}>구매하기{p.stock != null ? ` · 남은 ${p.stock}개` : ''}</Link>}
      {p.on_sale && p.stock === 0 && <p className="notice">품절됐어요</p>}
      {p.link ? <a className={'btn' + (p.on_sale ? ' line' : '')} href={p.link} target="_blank" rel="noopener noreferrer nofollow ugc">원래 쇼핑몰에서 보기</a> : !p.on_sale && <p className="help">링크가 없는 딜이에요</p>}
      {canEdit && sellerActive && <SaleToggle id={id} onSale={!!p.on_sale} stock={p.stock ?? null} />}
      {canEdit && <OwnerActions id={id} status="live" />}
    </>
  );
}
