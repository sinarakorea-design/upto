import type { MetadataRoute } from 'next';
// 폰 '홈 화면에 추가'로 앱처럼 쓰게 한다(스토어 앱 전 단계)
export default function manifest(): MetadataRoute.Manifest {
  return { name: '업투 UPTO', short_name: '업투', description: '오늘의 최저가 핫딜, 업투', start_url: '/', display: 'standalone', background_color: '#F4F6FB', theme_color: '#2946F5', lang: 'ko',
    icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] };
}
