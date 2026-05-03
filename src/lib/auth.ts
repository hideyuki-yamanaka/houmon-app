'use client';

// ──────────────────────────────────────────────────────────────
// Supabase Auth ヘルパー(マジックリンク方式)
//
// マルチユーザー化(2026-05-03 着手) のための認証基盤。
//   - signInWithMagicLink(email): メアドにリンク送信
//   - signOut(): ログアウト
//   - useAuthUser(): 現在のユーザー(or null) を返す React hook
//
// 認証状態は Supabase が localStorage に保存・自動更新する。
// onAuthStateChange でログイン/ログアウトを購読する。
// ──────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { isMockMode, supabase } from './supabase';

/** マジックリンクをメールアドレスに送信。
 *  redirectTo はメール内リンクをクリックした後に戻ってくる URL(/auth/callback)。 */
export async function signInWithMagicLink(email: string): Promise<{ error?: string }> {
  if (isMockMode) return { error: 'mock mode: 認証は無効化されています' };
  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : undefined;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  if (error) return { error: error.message };
  return {};
}

/** 現在のセッションを破棄してログアウト */
export async function signOut(): Promise<void> {
  if (isMockMode) return;
  await supabase.auth.signOut();
}

/** 現在のログインユーザーを購読する hook
 *  - 初回マウント時に getSession() でユーザー復元
 *  - その後 onAuthStateChange でログイン/ログアウトを追跡
 *  - 戻り値: { user, loading } */
export function useAuthUser(): { user: User | null; loading: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isMockMode) {
      setLoading(false);
      return;
    }
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
