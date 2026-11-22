import Link from 'next/link';

// 업투 마크: 위로 꺾인 화살표 + 바닥선(가격이 바닥을 찍고 오르는 순간)
export function Mark({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 14.5 12 7.5l7 7" /><path d="M4.5 20h15" />
    </svg>
  );
}
export default function Logo() {
  return <Link className="wm" href="/" aria-label="업투 홈"><span className="wm-m"><Mark /></span>UPTO</Link>;
}
