import type { Metadata, Viewport } from 'next';
import './globals.css';
import WelcomeToast from './welcome-toast';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://upto-eight.vercel.app'),
  title: { default: '업투 UPTO · 오늘의 최저가 핫딜', template: '%s · 업투' },
  description: '지금 제일 싼 가격만 모은 핫딜, 업투. 회원이 직접 찾은 딜을 올리고 함께 추천해요.',
  openGraph: { siteName: '업투 UPTO', locale: 'ko_KR', type: 'website', images: ['/og.png'] },
  appleWebApp: { title: '업투', capable: true, statusBarStyle: 'default' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#2946F5' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap" />
      </head>
      <body><div className="app">{children}</div><WelcomeToast /></body>
    </html>
  );
}
