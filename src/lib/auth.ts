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
import { getOwnerDisplayNames } from './sharing';

/** メールにログインリンク + 6 桁コードを送る。
 *  - Safari で開ける人は メール内のリンクをタップでログイン
 *  - PWA 等でリンクが使えない人は メール内の 6 桁コードを アプリで入力してログイン
 *  redirectTo はメール内リンクをクリックした後に戻ってくる URL(/auth/callback)。
 *  ※ Supabase メールテンプレートに `{{ .Token }}` を含めておく必要あり。 */
export async function signInWithEmailOtp(email: string): Promise<{ error?: string }> {
  if (isMockMode) return { error: 'mock mode: 認証は無効化されています' };
  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : undefined;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  });
  if (error) return { error: error.message };
  return {};
}

/** メールに届いた 6 桁コードで認証。
 *  iOS PWA で マジックリンクが使えない時の フォールバック。 */
export async function verifyEmailOtp(
  email: string,
  token: string,
): Promise<{ error?: string }> {
  if (isMockMode) return { error: 'mock mode: 認証は無効化されています' };
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  if (error) return { error: error.message };
  return {};
}

/** @deprecated signInWithEmailOtp に統一。後方互換のため残す。 */
export const signInWithMagicLink = signInWithEmailOtp;

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

// ──────────────────────────────────────────────────────────────
// useOwnerContext — 自分が「オーナー本人」か「招待された人」かの判定
//
//   - team_memberships に自分が member_id で乗っていれば 招待された人
//     (= ownerId に他人の id が入る、自分のデータを持っていない可能性)
//   - 乗ってなければ オーナー (= 自分用にデータを持っている人)
//
//   招待された人の場合、ownerName を get_owner_display_names RPC で解決して
//   バナー等で表示する用に返す。
//
// 戻り値:
//   { isOwner: boolean, ownerName: string | null, ownerId: string | null,
//     loading: boolean }
//
//   ※ 自分も他人のデータも両方見られるケース(将来的に自分の data + 誰かの data)
//      は考えていない。当面 1 オーナー = ヒデさん の前提で OK。
// ──────────────────────────────────────────────────────────────
export function useOwnerContext(): {
  isOwner: boolean;
  ownerName: string | null;
  ownerId: string | null;
  loading: boolean;
} {
  const { user, loading: userLoading } = useAuthUser();
  const [isOwner, setIsOwner] = useState(true);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      setIsOwner(true);
      setOwnerName(null);
      setOwnerId(null);
      setLoading(false);
      return;
    }
    if (isMockMode) {
      setIsOwner(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      // 自分が member_id として team_memberships に乗っているか確認
      const { data: tmRows, error } = await supabase
        .from('team_memberships')
        .select('owner_id')
        .eq('member_id', user.id)
        .limit(1);
      if (cancelled) return;
      if (error) {
        console.error('[useOwnerContext] team_memberships query failed', error);
        setIsOwner(true);
        setLoading(false);
        return;
      }
      const ownerRow = (tmRows ?? [])[0];
      if (!ownerRow) {
        // 招待されていない → 自分がオーナー
        setIsOwner(true);
        setOwnerName(null);
        setOwnerId(user.id);
        setLoading(false);
        return;
      }
      // 招待された人 → オーナー名を解決
      setIsOwner(false);
      setOwnerId(ownerRow.owner_id);
      const names = await getOwnerDisplayNames();
      if (cancelled) return;
      const found = names.find(n => n.owner_id === ownerRow.owner_id);
      setOwnerName(found?.display_name ?? null);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, userLoading]);

  return { isOwner, ownerName, ownerId, loading };
}
