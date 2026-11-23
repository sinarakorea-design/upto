'use client';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

type S = { business_type: string; display_name: string; business_no: string | null; contact_phone: string | null } | null;
const TYPES: [string, string][] = [['individual', '개인'], ['individual_business', '개인사업자'], ['corporate', '법인']];

export default function SellerForm({ uid, initial }: { uid: string; initial: S }) {
  const router = useRouter(); const sb = useMemo(() => supabaseBrowser(), []);
  const [type, setType] = useState(initial?.business_type || 'individual'); const [name, setName] = useState(initial?.display_name || '');
  const [bno, setBno] = useState(initial?.business_no || ''); const [phone, setPhone] = useState(initial?.contact_phone || '');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [done, setDone] = useState(!!initial);
  const biz = type !== 'individual', digits = (v: string) => v.replace(/[^0-9]/g, '');
  const problem = !name.trim() ? '상점 이름을 적어 주세요' : biz && digits(bno).length !== 10 ? '사업자등록번호 10자리를 적어 주세요' : digits(phone).length < 10 ? '연락처를 적어 주세요' : '';
  async function save() {
    if (problem) { setErr(problem); return; }
    setBusy(true); setErr('');
    const row = { business_type: type, display_name: name.trim().slice(0, 30), business_no: biz ? digits(bno) : null, contact_phone: digits(phone) };
    const { error } = initial ? await sb.from('sellers').update(row).eq('user_id', uid) : await sb.from('sellers').insert({ user_id: uid, ...row });
    setBusy(false); if (error) { setErr('저장하지 못했어요. 다시 눌러 주세요'); return; }
    setDone(true); router.refresh();
  }
  return (
    <>
      {done && <p className="notice">신청을 받았어요. 운영자가 확인하면 판매를 켤 수 있어요(보통 1~3일)</p>}
      <div className="card">
        <span className="lab">판매자 종류</span><div className="chips wrap">{TYPES.map(([k, l]) => <button key={k} type="button" className="chip" aria-pressed={type === k} onClick={() => setType(k)}>{l}</button>)}</div>
        <label className="lab" htmlFor="n">상점 이름 <small>구매자에게 보여요</small></label><input className="in" id="n" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} />
        {biz && <><label className="lab" htmlFor="b">사업자등록번호</label><input className="in num" id="b" inputMode="numeric" maxLength={12} value={bno} onChange={(e) => setBno(e.target.value)} placeholder="숫자 10자리" /></>}
        <label className="lab" htmlFor="ph">연락처</label><input className="in num" id="ph" inputMode="tel" maxLength={13} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="휴대폰 번호" />
        <p className="help">정산 계좌는 운영자가 토스페이먼츠에 등록할 때 따로 받아요(업투에는 저장하지 않아요).</p>
        {err && <p className="err">{err}</p>}
        <button className="btn" type="button" disabled={busy} onClick={save}>{busy ? '저장 중…' : initial ? '신청 내용 고치기' : '판매자 신청하기'}</button>
      </div>
    </>
  );
}
