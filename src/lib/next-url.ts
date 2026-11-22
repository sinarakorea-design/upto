// 가입·로그인 뒤 돌아갈 주소. 이 사이트 안의 경로만 받는다(다른 사이트로 튀는 공격 차단).
export function safeNext(v: string | null | undefined, fallback = '/'): string {
  if (!v || typeof v !== 'string') return fallback;
  if (!v.startsWith('/') || v.startsWith('//') || v.startsWith('/\\') || v.length > 300) return fallback;
  if (/^\/(login|signup|join|verify|auth)(\/|\?|$)/.test(v)) return fallback;   // 가입 화면으로 되돌아가는 고리 방지
  return v;
}
export const withNext = (path: string, next: string) => next && next !== '/' ? `${path}?next=${encodeURIComponent(next)}` : path;
