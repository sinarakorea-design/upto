import { redirect } from 'next/navigation';
import Logo from '@/components/logo';
import { supabaseServer } from '@/lib/supabase/server';
import SellerForm from './seller-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: '판매자 신청', robots: { index: false } };

export default async function SellerPage() {
  const sb = await supabaseServer();
  const { data: c } = await sb.auth.getClaims(); const uid = c?.claims?.sub;
  if (!uid) redirect('/join?next=%2Fseller');
  const { data: s } = await sb.from('sellers').select('business_type,display_name,business_no,contact_phone,status').eq('user_id', uid).maybeSingle();
  const head = <header className="hdr"><Logo /></header>;
  if (s && s.status !== 'draft') return <>{head}<div className="hero"><b>{s.status === 'active' ? '판매자 승인 완료' : '판매가 멈춘 상태예요'}</b><span>{s.status === 'active' ? '내 딜 화면에서 "판매 켜기"를 누르면 업투에서 바로 팔 수 있어요' : '운영자에게 문의해 주세요'}</span></div></>;
  return <>{head}<div className="page-h"><h1>판매자 신청</h1><p>업투에서 결제받고 정산받으려면 신청해 주세요</p></div><SellerForm uid={uid} initial={s} /></>;
}
