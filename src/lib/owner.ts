import 'server-only';
import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';

// 대표 계정(마스터) 자동 지정: 인증된 로그인 이메일의 해시가 아래와 같으면 운영자로 올린다. 이메일 원문은 코드에 두지 않는다.
const OWNER_EMAIL_SHA256 = 'f352b8ea9e6fbcf13d1de492ae3bc18fe2dad33d7ee507b875e35513e83cf786';

export async function ensureOwnerAdmin(uid: string, email: unknown, role: string | undefined): Promise<boolean> {
  if (role === 'admin' || typeof email !== 'string' || !email) return false;
  if (createHash('sha256').update(email.trim().toLowerCase()).digest('hex') !== OWNER_EMAIL_SHA256) return false;
  const admin = supabaseAdmin(); if (!admin) return false;
  const { error } = await admin.from('profiles').update({ role: 'admin', status: 'ok', approved_at: new Date().toISOString() }).eq('id', uid);
  return !error;
}
