import Link from 'next/link';

const I = {
  home: <path d="M4 11.5 12 4l8 7.5V20h-5.5v-5.5h-5V20H4z" />,
  rank: <><path d="M5 20V10" /><path d="M12 20V4" /><path d="M19 20v-7" /></>,
  post: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  my: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
};
const TABS: [keyof typeof I, string, string][] = [['home', '/', '홈'], ['rank', '/rank', '랭킹'], ['post', '/post', '올리기'], ['my', '/my', 'MY']];

// 아래 고정 메뉴 4개: 어디서든 한 번에 간다
export default function Tabs({ current }: { current: keyof typeof I }) {
  return (
    <nav className="tabbar" aria-label="주 메뉴">
      {TABS.map(([k, href, label]) => (
        <Link key={k} href={href} aria-current={k === current ? 'page' : undefined}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{I[k]}</svg>{label}
        </Link>
      ))}
    </nav>
  );
}
