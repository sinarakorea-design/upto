import type { SupabaseClient } from '@supabase/supabase-js';
// 로그인한 회원이 추천한 딜 id 모음(권한 규칙이 내 것만 돌려준다)
export async function myUps(sb: SupabaseClient, uid?: string): Promise<Set<string>> {
  if (!uid) return new Set();
  const { data } = await sb.from('ups').select('product_id').limit(1000);
  return new Set((data || []).map((x) => x.product_id as string));
}
