'use client';
import Link from 'next/link';
// 어느 화면이 터져도 이 화면으로 받는다(앱 전체가 하얘지지 않게)
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (<div className="card" style={{ marginTop: 40 }}><h1 className="h1s">잠깐 문제가 생겼어요</h1><p className="help">잠시 뒤 다시 시도해 주세요. 계속되면 운영자에게 알려 주세요.</p>
    <button className="btn" type="button" onClick={reset}>다시 시도</button><Link className="btn line" href="/">홈으로</Link></div>);
}
