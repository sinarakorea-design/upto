import Link from 'next/link';
import Logo from '@/components/logo';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { safeNext, withNext } from '@/lib/next-url';

export const dynamic = 'force-dynamic';

// 회원이 아닌 사람에게 가입을 권하는 랜딩. 로그인한 사람은 원래 보던 곳으로 바로 돌려보낸다.
export default async function JoinPage({ searchParams }: { searchParams: Promise<{ next?: string; from?: string }> }) {
  const sp = await searchParams, next = safeNext(sp.next);
  const sb = await supabaseServer();
  const { data } = await sb.auth.getClaims();
  if (data?.claims?.sub) redirect(next);
  const why = { up: 'UP 추천은 회원만 할 수 있어요', wish: '찜은 회원만 할 수 있어요', post: '상품 올리기는 회원만 할 수 있어요', buy: '구매는 회원만 할 수 있어요' }[sp.from || ''];
  return (
    <>
      <header className="hdr"><Logo /><div className="r"><Link className="sbtn" href={withNext('/login', next)}>로그인</Link></div></header>
      {why && <p className="notice">{why}</p>}
      <section className="land">
        <p className="kicker">오늘의 최저가, 업투</p>
        <h1>핫딜은 놓치지 않고<br />좋은 딜은 내가 올리고</h1>
        <p className="lede">가입하면 바로 <b>5,000P</b>를 드려요. 포인트로 내가 찾은 딜을 업투에 올릴 수 있어요.</p>
        <Link className="btn" href={withNext('/signup', next)}>1분 가입하고 5,000P 받기</Link>
        <Link className="btn line" href={withNext('/login', next)}>이미 회원이에요 · 로그인</Link>
      </section>
      <section className="perks" aria-label="회원 혜택">
        <div><b>▲</b><strong>UP 추천 · 찜</strong><span>좋은 딜을 추천하고 찜해 두세요</span></div>
        <div><b>P</b><strong>포인트 적립</strong><span>가입 5,000P · 매일 출석 100P</span></div>
        <div><b>＋</b><strong>내 딜 올리기</strong><span>승인 회원은 포인트로 업투 룸에 올려요</span></div>
      </section>
      <section className="how" aria-label="가입 순서">
        <h2>가입은 이렇게</h2>
        <ol><li><b>1</b>이메일·닉네임·비밀번호</li><li><b>2</b>메일의 인증 링크 누르기</li><li><b>3</b>보던 화면으로 자동 복귀</li></ol>
      </section>
      <p className="foot">가입하면 <Link href="/terms">이용약관</Link>과 <Link href="/privacy">개인정보 처리방침</Link>을 확인할 수 있어요</p>
    </>
  );
}
