import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const isValidUrl = supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://');

export const isMockMode = !isValidUrl;

let _supabase: SupabaseClient | null = null;
if (!isMockMode) {
  _supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // ── iOS PWA でログイン状態を長期維持するための設定 ──
      // standalone PWA は Safari と完全独立した storage を持つので、
      // PWA 内で 1 回ログインすれば長く持続するように下記を明示。
      persistSession: true,            // セッションを localStorage に永続化
      autoRefreshToken: true,          // 期限切れる前に自動でリフレッシュ
      detectSessionInUrl: true,        // /auth/callback の URL fragment からセッション復元
      flowType: 'pkce',                // PKCE フロー(マジックリンク+OTPの両対応)
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  });
}

export const supabase = _supabase as SupabaseClient;
