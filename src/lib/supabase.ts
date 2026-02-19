import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,   // 세션을 로컬 스토리지에 저장하여 새로고침해도 유지
    autoRefreshToken: true, // 토큰 만료 전 자동으로 리프레시 토큰 사용
    detectSessionInUrl: true // 이메일 로그인/소셜 로그인 후 URL에서 세션 자동 추출
  }
});