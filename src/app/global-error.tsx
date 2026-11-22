'use client';
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (<html lang="ko"><body style={{ fontFamily: 'sans-serif', padding: 24 }}><h1>잠깐 문제가 생겼어요</h1><p>잠시 뒤 다시 시도해 주세요.</p><button onClick={reset} style={{ padding: '12px 20px' }}>다시 시도</button></body></html>);
}
