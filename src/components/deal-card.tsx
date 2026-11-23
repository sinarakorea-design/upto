import Link from 'next/link';
import UpButton from './up-button';
import { off, photoUrl, won, type FeedRow } from '@/lib/format';

export default function DealCard({ r, rank, upOn, uid, next }: { r: FeedRow; rank?: number; upOn: boolean; uid?: string; next: string }) {
  return (
    <article className="deal">
      <span className="tile">{r.photo_path && <img src={photoUrl(r.photo_path)} alt="" loading="lazy" decoding="async" />}{rank && <i className="rk">{rank}</i>}</span>
      <div>
        <div className="meta"><b>{r.mall}</b> · {r.seller}{r.on_sale && <span className="buy-tag">바로구매</span>}</div>
        <h3 className="ttl"><Link className="stretch" href={`/p/${r.id}`}>{r.title}</Link></h3>
        <div><span className="now">{won(r.price)}</span>{r.list_price > r.price && <><span className="was">{won(r.list_price)}</span><span className="pct">−{off(r.price, r.list_price)}%</span></>}</div>
        <div className="foot"><UpButton id={r.id} count={r.ups ?? 0} on={upOn} signedIn={!!uid} own={uid === r.owner_id} next={next} /></div>
      </div>
    </article>
  );
}
