import Link from 'next/link';
import Logo from '@/components/logo';

export const metadata = { title: '결제 실패', robots: { index: false } };
const MSG: Record<string, string> = { PAY_PROCESS_CANCELED: '결제를 취소했어요', PAY_PROCESS_ABORTED: '결제가 중단됐어요', REJECT_CARD_COMPANY: '카드사에서 결제를 거절했어요' };

export default async function PayFail({ searchParams }: { searchParams: Promise<{ code?: string; message?: string; p?: string }> }) {
  const sp = await searchParams, back = sp.p && /^[0-9a-f-]{36}$/.test(sp.p) ? `/checkout/${sp.p}` : '/';
  return (
    <>
      <header className="hdr"><Logo /></header>
      <div className="hero bad"><b>{MSG[sp.code || ''] || '결제하지 못했어요'}</b><span>돈은 빠져나가지 않았어요{sp.message ? ` · ${sp.message.slice(0, 80)}` : ''}</span></div>
      <Link className="btn" href={back}>다시 결제하기</Link>
      <Link className="btn line" href="/">업투 홈</Link>
    </>
  );
}
