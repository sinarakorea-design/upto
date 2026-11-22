// Supabase Auth 오류를 사람이 읽는 말로
export function authError(message: string | undefined): string {
  const m = (message || '').toLowerCase();
  if (m.includes('already registered') || m.includes('already been registered')) return '이미 가입된 이메일이에요. 로그인해 주세요';
  if (m.includes('email not confirmed')) return '이메일 인증이 아직 안 됐어요. 메일함의 인증 링크를 눌러 주세요';
  if (m.includes('invalid login credentials')) return '이메일이나 비밀번호가 맞지 않아요';
  if (m.includes('password should be at least') || m.includes('weak')) return '비밀번호가 너무 쉬워요. 8자 이상, 영문과 숫자를 섞어 주세요';
  if (m.includes('rate limit') || m.includes('too many')) return '잠시 뒤 다시 시도해 주세요(요청이 너무 많아요)';
  if (m.includes('database error saving new user') || m.includes('duplicate')) return '이미 쓰는 닉네임이에요';
  if (m.includes('invalid email') || m.includes('unable to validate email')) return '이메일 주소를 확인해 주세요';
  return '잠시 문제가 생겼어요. 다시 시도해 주세요';
}
