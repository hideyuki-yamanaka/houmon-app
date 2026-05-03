// ──────────────────────────────────────────────────────────────
// プロフィール (display_name) と 自動色割り当ての ユーティリティ。
//
//   - profiles テーブル: user_id (PK) + display_name のみ
//   - 色は user_id を hash して 8 色パレットから自動算出する (DB に持たない)
//     → 同じユーザーは いつ どの端末で見ても 同じ色 で表示される
//
// 公開 API:
//   getMyProfile()                — 自分の profile を1件取得
//   updateMyDisplayName(name)     — 自分の display_name を更新
//   getTeamProfiles()             — 自分のチーム全員の profile (RPC)
//   colorForUser(userId)          — user_id から色を決定 (text + bg + border)
// ──────────────────────────────────────────────────────────────

import { isMockMode, supabase } from './supabase';

export interface Profile {
  user_id: string;
  display_name: string;
}

export interface AuthorColor {
  /** チップ等の文字色 */
  text: string;
  /** チップの背景色 (薄め) */
  bg: string;
  /** カードの左ストライプ等に使う濃い色 */
  border: string;
}

// ── 8 色パレット (彩度・明度・色相 を散らしてある) ──
//   [text, bg, border] の順
const PALETTE: ReadonlyArray<AuthorColor> = [
  { text: '#0EA5E9', bg: '#E0F2FE', border: '#0EA5E9' }, // sky
  { text: '#A855F7', bg: '#F3E8FF', border: '#A855F7' }, // purple
  { text: '#10B981', bg: '#D1FAE5', border: '#10B981' }, // emerald
  { text: '#F59E0B', bg: '#FEF3C7', border: '#F59E0B' }, // amber
  { text: '#EC4899', bg: '#FCE7F3', border: '#EC4899' }, // pink
  { text: '#06B6D4', bg: '#CFFAFE', border: '#06B6D4' }, // cyan
  { text: '#EF4444', bg: '#FEE2E2', border: '#EF4444' }, // red
  { text: '#84CC16', bg: '#ECFCCB', border: '#84CC16' }, // lime
];

/** 文字列から決定的なハッシュ値 (FNV-1a 32bit) を生成。
 *  user_id (UUID 文字列) を入力 → 0..N-1 の index に落とすため。
 *  暗号学的強度は不要、衝突しても 8 色のうちどれかに当たるだけなので。 */
function hashStringFnv1a(s: string): number {
  let h = 0x811c9dc5; // FNV offset basis (32-bit)
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    // FNV prime 32-bit = 16777619
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** user_id から色を決定。同じ user_id は常に同じ色。
 *  null / undefined / 空文字の場合は中立色 (グレー) を返す。 */
export function colorForUser(userId: string | null | undefined): AuthorColor {
  if (!userId) {
    return { text: '#6B7280', bg: '#F3F4F6', border: '#9CA3AF' };
  }
  const idx = hashStringFnv1a(userId) % PALETTE.length;
  return PALETTE[idx];
}

/** イニシャル (日本語名なら先頭1文字、英字ならアッパー1文字) */
export function initialOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed.slice(0, 1);
}

// ──────────────────────────────────────────────────────────────
// プロフィール 取得・更新
// ──────────────────────────────────────────────────────────────

/** 自分の profile を取得。未作成なら null。
 *  通常は trigger で作られてるはずやけど、保険で null を許容。 */
export async function getMyProfile(): Promise<Profile | null> {
  if (isMockMode) return null;
  const { data: sess } = await supabase.auth.getUser();
  const me = sess.user;
  if (!me) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .eq('user_id', me.id)
    .maybeSingle();
  if (error) {
    console.error('[profile] getMyProfile failed', error);
    return null;
  }
  return data as Profile | null;
}

/** 自分の display_name を更新 (upsert)。
 *  trigger で profile 行は作られてるはずやけど、ない場合は INSERT になるよう upsert。
 *  ヒデさん指示 (2026-05-03): 訪問ログのバッジに表示するので 5 文字以内に厳格化。 */
export const DISPLAY_NAME_MAX = 5;

export async function updateMyDisplayName(displayName: string): Promise<{ ok: boolean; error?: string }> {
  if (isMockMode) return { ok: false, error: 'mock mode: 更新は無効化されてます' };
  const trimmed = displayName.trim();
  if (!trimmed) return { ok: false, error: '名前を入力してな' };
  if (trimmed.length > DISPLAY_NAME_MAX) {
    return { ok: false, error: `${DISPLAY_NAME_MAX} 文字以内で入力してな` };
  }

  const { data: sess } = await supabase.auth.getUser();
  const me = sess.user;
  if (!me) return { ok: false, error: 'ログインしてへんで' };

  const { error } = await supabase
    .from('profiles')
    .upsert(
      { user_id: me.id, display_name: trimmed, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** 自分のチーム全員の profile を取得 (get_team_profiles RPC)。
 *  画面ロード時に1回叩いて Map にしとくと、各 visit の created_by 表示で再利用できる。 */
export async function getTeamProfiles(): Promise<Profile[]> {
  if (isMockMode) return [];
  const { data, error } = await supabase.rpc('get_team_profiles');
  if (error) {
    console.error('[profile] getTeamProfiles failed', error);
    return [];
  }
  return (data ?? []) as Profile[];
}
