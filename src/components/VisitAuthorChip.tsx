// ──────────────────────────────────────────────────────────────
// VisitAuthorChip — 訪問ログを書いた人を示すチップ (Pattern C)
//
// ヒデさん採択 (2026-05-03 mock 比較):
//   - 左カラーストライプ + 名前チップ (ドット無し版)
//   - スクロール中も色だけで誰のか即分かる
//
// 使い方:
//   <VisitAuthorChip author={authorInfo} />            ← チップ単体
//   <AuthorStripeCard author={authorInfo}>...</...>   ← 左ストライプ付きカード
//
// authorInfo は useTeamProfiles().lookup(userId) で取得。
// ──────────────────────────────────────────────────────────────

import type { ReactNode } from 'react';
import type { AuthorInfo } from '../lib/useTeamProfiles';

/** 名前チップ単体。日付ヘッダの隣などに置く想定。 */
export function VisitAuthorChip({ author }: { author: AuthorInfo }) {
  if (!author.displayName) return null;
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
      style={{ background: author.color.bg, color: author.color.text }}
    >
      {author.displayName}
    </span>
  );
}

/** 訪問ログ本体カードのラッパ。左に 4px の色ストライプ。
 *  既存の ios-card と組み合わせて使える。 */
export function AuthorStripeCard({
  author,
  children,
  className = '',
}: {
  author: AuthorInfo;
  children: ReactNode;
  className?: string;
}) {
  // 不明 (author.userId が null) なら ストライプ無しで普通に表示
  const stripe = author.userId
    ? { borderLeft: `4px solid ${author.color.border}` }
    : undefined;
  return (
    <div className={`ios-card ${className}`} style={stripe}>
      {children}
    </div>
  );
}
