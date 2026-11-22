'use client';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { CATS, MALLS, dbError, off, won } from '@/lib/format';

// 사진은 올리기 전에 폰에서 줄인다(긴 변 1280px JPEG): 저장·전송 비용을 아끼고 느린 망에서도 빨리 올라간다.
async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) throw new Error('photo');
  const k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error('photo'))), 'image/jpeg', 0.85));
}
const num = (v: string) => { const n = parseInt(v.replace(/[^0-9]/g, ''), 10); return isFinite(n) ? n : 0; };

export default function PostForm({ uid, seller, balance, cost }: { uid: string; seller: string; balance: number; cost: number }) {
  const router = useRouter();
  const sb = useMemo(() => supabaseBrowser(), []);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [title, setTitle] = useState(''); const [cat, setCat] = useState(''); const [mall, setMall] = useState(''); const [mallEtc, setMallEtc] = useState('');
  const [was, setWas] = useState(''); const [price, setPrice] = useState(''); const [link, setLink] = useState(''); const [hours, setHours] = useState(0);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const m = mall === '직접' ? mallEtc.trim() : mall, p = num(price), w = num(was);
  const problem = !title.trim() ? '상품명을 적어 주세요' : title.trim().length < 2 ? '상품명을 2자 이상 적어 주세요' : !cat ? '카테고리를 골라 주세요' : !m ? '쇼핑몰을 골라 주세요'
    : p < 10 || w < 10 ? '가격을 적어 주세요' : w < p ? '할인가가 원래 가격보다 높아요' : link && !/^https:\/\/\S{4,}$/.test(link.trim()) ? '링크는 https:// 로 시작해야 해요'
    : balance < cost ? `포인트가 ${(cost - balance).toLocaleString('ko-KR')}P 모자라요` : '';
  async function pick(f?: File) {
    if (!f) return;
    try { const blob = await shrink(f); setPhoto({ blob, url: URL.createObjectURL(blob) }); } catch { setErr('이 사진은 열 수 없어요. 다른 사진을 골라 주세요'); }
  }
  async function submit() {
    if (problem || busy) { setErr(problem); return; }
    setBusy(true); setErr('');
    let path: string | null = null;
    if (photo) {
      path = `${uid}/${crypto.randomUUID()}.jpg`;
      const up = await sb.storage.from('product-photos').upload(path, photo.blob, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false });
      if (up.error) { setBusy(false); setErr('사진을 올리지 못했어요. 다시 눌러 주세요'); return; }
    }
    const { data, error } = await sb.rpc('post_product', { p_title: title.trim(), p_category: cat, p_mall: m, p_price: p, p_list_price: w, p_link: link.trim() || null, p_photo_path: path, p_hours: hours || null });
    if (error) { if (path) await sb.storage.from('product-photos').remove([path]); setBusy(false); setErr(dbError(error.message)); return; }
    router.replace(`/p/${data}?posted=1`);
  }
  return (
    <>
      <div className="page-h"><h1>딜 올리기</h1><p>{cost ? `한 번에 ${cost.toLocaleString('ko-KR')}P · 지금 ${balance.toLocaleString('ko-KR')}P` : '운영자는 무료로 올려요'}</p></div>
      <div className="card">
        <label className="photo-in"><input type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0])} aria-label="상품 사진" />
          <span className="pb">{photo ? <img src={photo.url} alt="" /> : '+'}</span><span><b>{photo ? '사진 바꾸기' : '사진 넣기'}</b><span className="help">정사각형이 예뻐요 · 선택</span></span></label>
        <label className="lab" htmlFor="t">상품명</label><input className="in" id="t" maxLength={60} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예) 에어팟 프로 2세대 USB-C" />
        <span className="lab">카테고리</span><div className="chips wrap">{CATS.map(([k, l]) => <button key={k} type="button" className="chip" aria-pressed={cat === k} onClick={() => setCat(k)}>{l}</button>)}</div>
        <span className="lab">쇼핑몰</span><div className="chips wrap">{[...MALLS, '직접'].map((x) => <button key={x} type="button" className="chip" aria-pressed={mall === x} onClick={() => setMall(x)}>{x === '직접' ? '직접 입력' : x}</button>)}</div>
        {mall === '직접' && <input className="in" style={{ marginTop: 8 }} maxLength={20} value={mallEtc} onChange={(e) => setMallEtc(e.target.value)} placeholder="쇼핑몰 이름" />}
        <div className="row2">
          <div><label className="lab" htmlFor="w">원래 가격</label><input className="in num" id="w" inputMode="numeric" value={was} onChange={(e) => setWas(e.target.value)} onBlur={() => setWas(w ? w.toLocaleString('ko-KR') : '')} placeholder="0" /></div>
          <div><label className="lab" htmlFor="p">할인 가격</label><input className="in num" id="p" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} onBlur={() => setPrice(p ? p.toLocaleString('ko-KR') : '')} placeholder="0" /></div>
        </div>
        <label className="lab" htmlFor="l">상품 링크 <small>선택 · https://</small></label><input className="in" id="l" inputMode="url" maxLength={300} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
        <span className="lab">마감 <small>선택</small></span><div className="chips wrap">{[[0, '없음'], [6, '6시간'], [24, '하루'], [72, '3일']].map(([h, l]) => <button key={h} type="button" className="chip" aria-pressed={hours === h} onClick={() => setHours(h as number)}>{l}</button>)}</div>
        <span className="lab">업투에 이렇게 보여요</span>
        <div className="deal preview"><span className="tile">{photo && <img src={photo.url} alt="" />}</span>
          <div><div className="meta"><b>{m || '쇼핑몰'}</b> · {seller}</div><h3 className="ttl">{title.trim() || '상품명이 여기에 보여요'}</h3>
            <div><span className="now">{won(p)}</span>{w > p && p > 0 && <><span className="was">{won(w)}</span><span className="pct">−{off(p, w)}%</span></>}</div></div></div>
        {err && <p className="err" role="alert">{err}</p>}
      </div>
      <div className="barfix"><button className="btn" type="button" onClick={submit} disabled={busy || !!problem}>{busy ? '올리는 중…' : cost ? `${cost.toLocaleString('ko-KR')}P로 올리기` : '올리기'}</button>{problem && !busy && <p className="help center">{problem}</p>}</div>
    </>
  );
}
