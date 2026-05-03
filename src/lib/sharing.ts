'use client';

// ──────────────────────────────────────────────────────────────
// 共有 (チーム招待) 関連の クライアント API ラッパー
//
// Supabase クライアント越しに RPC / テーブル直叩きを行う。
// メール送信が絡むものだけ Next.js の API Route (/api/invite/send) を経由する。
//
// 戻り値はすべて Promise。エラー時は例外を投げる代わりに
// { ok:false, ... } / null を返す軽い方針 (UI 側で扱いやすく)。
// ──────────────────────────────────────────────────────────────

import { isMockMode, supabase } from './supabase';
import type { InviteTokenRow, TeamRole } from './types';

// ─── 招待トークン (リンク発行 / 一覧 / 取消) ────────────────────

/** 自分用に invite_tokens を 1 行 INSERT し、その行を返す.
 *  メール送信なし (UI 側で URL コピー / Web Share / QR にする想定). */
export async function issueInviteLink(
  role: TeamRole,
  note?: string,
): Promise<InviteTokenRow | null> {
  if (isMockMode) return null;
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return null;

  const { data, error } = await supabase
    .from('invite_tokens')
    .insert({ owner_id: uid, role, note: note ?? null })
    .select('*')
    .single();
  if (error) {
    console.error('[sharing] issueInviteLink failed', error);
    return null;
  }
  return data as InviteTokenRow;
}

/** 自分が発行した招待トークン一覧 (新しい順) */
export async function listInviteTokens(): Promise<InviteTokenRow[]> {
  if (isMockMode) return [];
  const { data, error } = await supabase
    .from('invite_tokens')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[sharing] listInviteTokens failed', error);
    return [];
  }
  return (data ?? []) as InviteTokenRow[];
}

/** 招待トークンを物理削除 (RLS で自分のしか消せない) */
export async function revokeInviteToken(token: string): Promise<boolean> {
  if (isMockMode) return false;
  const { error } = await supabase.from('invite_tokens').delete().eq('token', token);
  if (error) {
    console.error('[sharing] revokeInviteToken failed', error);
    return false;
  }
  return true;
}

// ─── チームメンバー (共有してる人) 管理 ────────────────────────

export interface TeamMemberInfo {
  member_id: string;
  email: string | null;
  role: TeamRole;
  invited_at: string;
}

/** list_team_members_for_owner RPC を叩いて 自分のチーム一覧を取得 */
export async function listTeamMembers(): Promise<TeamMemberInfo[]> {
  if (isMockMode) return [];
  const { data, error } = await supabase.rpc('list_team_members_for_owner');
  if (error) {
    console.error('[sharing] listTeamMembers failed', error);
    return [];
  }
  return (data ?? []) as TeamMemberInfo[];
}

/** team_memberships.role を変更 (RLS で自分がオーナーの行のみ) */
export async function updateTeamMemberRole(
  member_id: string,
  role: TeamRole,
): Promise<boolean> {
  if (isMockMode) return false;
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return false;

  const { error } = await supabase
    .from('team_memberships')
    .update({ role })
    .eq('owner_id', uid)
    .eq('member_id', member_id);
  if (error) {
    console.error('[sharing] updateTeamMemberRole failed', error);
    return false;
  }
  return true;
}

/** チームから外す (team_memberships 物理削除) */
export async function removeTeamMember(member_id: string): Promise<boolean> {
  if (isMockMode) return false;
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return false;

  const { error } = await supabase
    .from('team_memberships')
    .delete()
    .eq('owner_id', uid)
    .eq('member_id', member_id);
  if (error) {
    console.error('[sharing] removeTeamMember failed', error);
    return false;
  }
  return true;
}

// ─── 招待リンク 消費 (ログイン後 /invite/[token] で呼ぶ) ────────

export type RedeemResult =
  | { ok: true; owner_id: string; role: TeamRole }
  | {
      ok: false;
      reason: 'self' | 'expired' | 'used' | 'not_found' | 'unauthenticated' | 'unknown';
    };

/** redeem_invite_token RPC を呼んで結果を返す */
export async function redeemInviteToken(token: string): Promise<RedeemResult> {
  if (isMockMode) return { ok: false, reason: 'unknown' };
  const { data, error } = await supabase.rpc('redeem_invite_token', { p_token: token });
  if (error) {
    console.error('[sharing] redeemInviteToken failed', error);
    return { ok: false, reason: 'unknown' };
  }
  // data は JSONB ({ ok, ... })
  const obj = (data ?? {}) as Record<string, unknown>;
  if (obj.ok === true && typeof obj.owner_id === 'string' && typeof obj.role === 'string') {
    return {
      ok: true,
      owner_id: obj.owner_id,
      role: obj.role as TeamRole,
    };
  }
  const reason = typeof obj.reason === 'string' ? obj.reason : 'unknown';
  if (
    reason === 'self' ||
    reason === 'expired' ||
    reason === 'used' ||
    reason === 'not_found' ||
    reason === 'unauthenticated'
  ) {
    return { ok: false, reason };
  }
  return { ok: false, reason: 'unknown' };
}

// ─── オーナー名 (バナー等で表示) ───────────────────────────────

export interface OwnerDisplayName {
  owner_id: string;
  display_name: string;
}

/** get_owner_display_names RPC で 自分が見られる オーナー の表示名を取得 */
export async function getOwnerDisplayNames(): Promise<OwnerDisplayName[]> {
  if (isMockMode) return [];
  const { data, error } = await supabase.rpc('get_owner_display_names');
  if (error) {
    console.error('[sharing] getOwnerDisplayNames failed', error);
    return [];
  }
  return (data ?? []) as OwnerDisplayName[];
}

// ─── メール招待送信 (Resend 経由) ──────────────────────────────

export interface SendInviteResult {
  ok: boolean;
  token?: string;
  error?: string;
}

/** /api/invite/send に POST して、メール送信 + invite_tokens INSERT を 1 リクエストで完結.
 *  サーバー側で auth セッションを Cookie 経由で確認するため、
 *  ログイン済みのブラウザからしか成功しない. */
export async function sendInviteByEmail(
  email: string,
  role: TeamRole,
): Promise<SendInviteResult> {
  if (isMockMode) return { ok: false, error: 'mock mode: 送信は無効化されてます' };

  // RLS でサーバー側の Service Role を使うため、Supabase の access token を
  // ヘッダで渡す (Next.js の API Route が anon SDK で auth.uid() を取れるように).
  const { data: sess } = await supabase.auth.getSession();
  const accessToken = sess.session?.access_token;
  if (!accessToken) {
    return { ok: false, error: 'ログインしてへんで' };
  }

  try {
    const res = await fetch('/api/invite/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ email, role }),
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return {
        ok: false,
        error: typeof json.error === 'string' ? json.error : `HTTP ${res.status}`,
      };
    }
    return {
      ok: true,
      token: typeof json.token === 'string' ? json.token : undefined,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'ネットワークエラー' };
  }
}

// ─── 招待リンク URL (UI 側で表示・コピー・QR 化に使う) ──────────

/** token から完全な招待リンク URL を組み立てる.
 *  サーバーレンダ時は absolute URL が分からんので空文字を返す → クライアント側で再評価. */
export function buildInviteUrl(token: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/invite/${token}`;
}
