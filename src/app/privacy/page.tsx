import Logo from '@/components/logo';
import { COMPANY as C, SERVICE, TERMS_DATE } from '@/lib/company';

export const metadata = { title: '개인정보 처리방침' };
const who = C.name || '회사';

export default function Privacy() {
  return (
    <>
      <header className="hdr"><Logo /></header>
      <div className="page-h"><h1>개인정보 처리방침</h1><p>시행일 {TERMS_DATE}</p></div>
      <div className="doc">
        <p className="draft">초안입니다. 정식 서비스 전에 법률 검토를 거쳐 확정합니다.</p>
        <p>{who}(이하 “회사”)는 {SERVICE} 운영에 꼭 필요한 개인정보만 수집하고, 아래와 같이 처리합니다.</p>
        <h2>1. 수집하는 항목과 목적</h2>
        <table><thead><tr><th>언제</th><th>항목</th><th>목적</th></tr></thead><tbody>
          <tr><td>회원가입</td><td>이메일, 닉네임, 비밀번호(암호화 저장), 마케팅 수신 동의 여부</td><td>본인 확인, 계정 관리, 알림</td></tr>
          <tr><td>판매자 신청</td><td>상점 이름, 판매자 종류, 사업자등록번호(사업자), 연락처</td><td>판매자 심사, 정산</td></tr>
          <tr><td>구매</td><td>받는 분 이름·연락처·주소·배송 요청, 주문·결제 내역</td><td>배송, 주문 처리, 환불</td></tr>
          <tr><td>자동 수집</td><td>접속 기록, 쿠키(로그인 유지)</td><td>보안, 부정 이용 방지</td></tr>
        </tbody></table>
        <p>카드번호 등 결제 수단 정보는 회사가 저장하지 않고 결제대행사(토스페이먼츠)가 처리합니다.</p>
        <h2>2. 보유 기간</h2>
        <ul><li>회원 정보: 탈퇴할 때까지(탈퇴하면 바로 파기)</li><li>계약·청약철회 기록, 대금 결제·재화 공급 기록: 5년(전자상거래법)</li><li>소비자 불만·분쟁 처리 기록: 3년(전자상거래법)</li><li>접속 기록: 3개월(통신비밀보호법)</li></ul>
        <h2>3. 제3자 제공</h2>
        <p>구매가 이뤄지면 배송을 위해 해당 주문의 판매자에게 받는 분 이름·연락처·주소·배송 요청을 제공합니다. 그 밖에는 법에 따른 요청이 있거나 회원이 동의한 경우에만 제공합니다.</p>
        <h2>4. 처리 위탁</h2>
        <table><thead><tr><th>맡는 곳</th><th>맡기는 일</th></tr></thead><tbody>
          <tr><td>Supabase Inc.</td><td>회원·주문 데이터 보관, 로그인 인증, 사진 보관</td></tr>
          <tr><td>Vercel Inc.</td><td>서비스 화면 제공(호스팅)</td></tr>
          <tr><td>토스페이먼츠(주)</td><td>결제 처리, 판매 대금 지급대행</td></tr>
        </tbody></table>
        <p>Supabase Inc., Vercel Inc. 는 해외 사업자로, 서비스 제공 과정에서 위 정보가 해당 사업자의 서버에서 처리될 수 있습니다.</p>
        <h2>5. 회원의 권리</h2>
        <p>회원은 언제든 자신의 정보를 보고, 고치고, 지우거나 처리를 멈춰 달라고 요청할 수 있습니다. MY 화면에서 직접 하거나 아래 연락처로 요청하면 지체 없이 처리합니다.</p>
        <h2>6. 안전하게 지키는 방법</h2>
        <ul><li>비밀번호는 암호화해 저장하며 회사도 알 수 없습니다.</li><li>모든 통신은 암호화(HTTPS)합니다.</li><li>회원은 자기 정보만, 판매자는 자기 주문의 배송 정보만 볼 수 있게 데이터베이스 권한을 나눕니다.</li></ul>
        <h2>7. 쿠키</h2>
        <p>로그인 상태를 유지하는 데 쿠키를 씁니다. 브라우저 설정에서 쿠키를 막을 수 있지만 그러면 로그인이 유지되지 않습니다.</p>
        <h2>8. 개인정보 보호책임자</h2>
        <p>{[C.privacyOfficer, C.email, C.phone].filter(Boolean).join(' · ') || '정식 서비스 전에 이 자리에 안내합니다.'}</p>
        <h2>9. 방침의 변경</h2>
        <p>이 방침을 바꿀 때는 시행 7일 전부터 서비스 화면에 알립니다.</p>
      </div>
    </>
  );
}
