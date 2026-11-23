import { SUPABASE_URL } from './env';
export const won = (n: number) => n.toLocaleString('ko-KR') + '원';
export const off = (price: number, list: number) => (list > price ? Math.round((1 - price / list) * 100) : 0);
export const photoUrl = (p: string | null | undefined) => (p ? `${SUPABASE_URL}/storage/v1/object/public/product-photos/${p}` : '');
export const CATS: [string, string][] = [['digital', '디지털'], ['food', '식품'], ['fashion', '패션'], ['beauty', '뷰티'], ['living', '생활'], ['baby', '유아'], ['game', '게임'], ['travel', '여행']];
export const catName = (k: string) => CATS.find((c) => c[0] === k)?.[1] || k;
export const MALLS = ['쿠팡', '네이버', '11번가', 'G마켓', 'SSG', '컬리', '무신사', '올리브영', '토스쇼핑'];
export const POST_COST = 3000;
export type FeedRow = { id: string; title: string; category: string; mall: string; price: number; list_price: number; link: string | null; photo_path: string | null; ends_at: string | null; created_at: string; owner_id: string; seller: string };
// DB 함수가 돌려주는 오류를 사람이 읽는 말로
export function dbError(m: string | undefined): string {
  const s = m || '';
  if (s.includes('not_enough_points')) return `포인트가 모자라요(한 번에 ${POST_COST.toLocaleString('ko-KR')}P)`;
  if (s.includes('not_approved')) return '운영자 승인 뒤에 올릴 수 있어요';
  if (s.includes('daily_limit')) return '하루에 10개까지 올릴 수 있어요. 내일 다시 올려 주세요';
  if (s.includes('too_many_products')) return '30개까지 올릴 수 있어요. MY 에서 안 쓰는 상품을 내려 주세요';
  if (s.includes('not_signed_in')) return '다시 로그인해 주세요';
  if (s.includes('not_admin')) return '운영자만 할 수 있어요';
  if (s.includes('not_allowed')) return '내 상품만 바꿀 수 있어요';
  if (s.includes('check constraint') || s.includes('violates')) return '입력한 값을 다시 확인해 주세요';
  return '잠시 문제가 생겼어요. 다시 시도해 주세요';
}
