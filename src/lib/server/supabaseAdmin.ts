// ──────────────────────────────────────────────────────────────
// supabaseAdmin — サーバーサイド専用 (RLS バイパス) Supabase client
//
// Web Push 配信ロジックで「他のチームメンバーの subscription」を取得するなど、
// RLS では本人しか読めないデータを参照するために使う。
//
// ⚠️ SERVICE_ROLE_KEY は絶対にクライアント側に漏らさない (NEXT_PUBLIC_ 接頭辞禁止)。
// ──────────────────────────────────────────────────────────────

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY が未設定です (Vercel env に追加してください)');
  }
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}
