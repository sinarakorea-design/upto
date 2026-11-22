// MY 로 넘어가는 순간 바로 보이는 자리(서버가 정보를 가져오는 동안)
export default function Loading() {
  return (
    <>
      <header className="hdr"><span className="wm"><i aria-hidden />UPTO</span></header>
      <div className="page-h"><h1>MY</h1><p>불러오는 중…</p></div>
      <div className="card" aria-busy="true">
        <div className="kv"><span>닉네임</span><b>·</b></div>
        <div className="kv"><span>회원 상태</span><b>·</b></div>
        <div className="kv"><span>포인트</span><b>·</b></div>
      </div>
    </>
  );
}
