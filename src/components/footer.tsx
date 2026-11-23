import Link from 'next/link';
import { COMPANY as C } from '@/lib/company';

export default function Footer() {
  const rows = [C.name && `상호 ${C.name}`, C.ceo && `대표 ${C.ceo}`, C.bizNo && `사업자등록번호 ${C.bizNo}`, C.mailOrderNo && `통신판매업 신고 ${C.mailOrderNo}`, C.address, C.phone && `고객센터 ${C.phone}`, C.email].filter(Boolean);
  return (
    <footer className="ft">
      <p><Link href="/terms">이용약관</Link> · <Link href="/privacy"><b>개인정보 처리방침</b></Link></p>
      {rows.length > 0 && <p>{rows.join(' · ')}</p>}
      <p>업투는 통신판매중개자이며 통신판매의 당사자가 아닙니다. 상품·거래 정보와 책임은 각 판매자에게 있습니다.</p>
    </footer>
  );
}
