import Link from 'next/link';
export default function Privacy() {
  return (<><header className="hdr"><Link className="wm" href="/"><i aria-hidden />UPTO</Link></header><div className="page-h"><h1>개인정보 처리방침</h1><p>수집 항목: 이메일, 닉네임, 비밀번호(암호화 저장, 업투도 볼 수 없음), 마케팅 수신 동의 여부. 정식 방침은 서비스 개시 전에 이 자리에 올립니다.</p></div></>);
}
