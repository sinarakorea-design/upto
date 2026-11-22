import { SUPABASE_URL, SUPABASE_KEY } from '@/lib/env';
import { createBrowserClient } from '@supabase/ssr';

export function supabaseBrowser() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
