// 화면 위에 잠깐 뜨는 한 줄 알림
export function toast(m: string) {
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = m;
  document.body.append(t); setTimeout(() => t.remove(), 3000);
}
