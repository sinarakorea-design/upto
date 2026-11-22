import Link from 'next/link';
export default function NotFound() {
  return (<div className="card" style={{ marginTop: 40 }}><h1 className="h1s">찾는 화면이 없어요</h1><p className="help">딜이 끝났거나 주소가 바뀌었어요.</p><Link className="btn" href="/">업투 홈으로</Link></div>);
}
