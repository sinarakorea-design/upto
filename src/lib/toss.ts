// 토스페이먼츠 키. 정식 키를 넣기 전에는 토스 공식 문서의 테스트 키(실제 돈 안 나감)로 동작한다.
export const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || 'test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm';
export const tossSecret = () => process.env.TOSS_SECRET_KEY || 'test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6';   // 서버에서만 import
export const isTestMode = () => tossSecret().startsWith('test_');
