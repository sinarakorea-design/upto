import type { Metadata, Viewport } from 'next';
import './globals.css';
import WelcomeToast from './welcome-toast';

export const metadata: Metadata = { title: 'UPTO', description: '오늘의 핫딜, 업투' };
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
