import { createClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from '@/lib/env';

// 로그인과 무관한 공개 데이터(피드)용. 응답을 20초 캐시해 사람이 몰려도 DB 를 덜 부른다.
export const supabasePublic = (seconds = 20) =>
  createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, next: { revalidate: seconds, tags: ['feed'] } }) },
  });
