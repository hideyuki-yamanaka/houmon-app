// ──────────────────────────────────────────────────────────────
// VisitAuthorChip — 訪問ログを書いた人を示すバッジ
//
// ヒデさん採択 (2026-05-03 mock v3 D + 余白調整):
//   - 色分け廃止 (グレースケールに統一)
//   - ふっくら 人型アイコン + 名前 太字 (gray-900)
//   - アイコンと文字の間は最小限 (gap-0.5)
//
// authorInfo は useTeamProfiles().lookup(userId) で取得。
// ──────────────────────────────────────────────────────────────

import type { AuthorInfo } from '../lib/useTeamProfiles';
import PersonIcon from './PersonIcon';

export function VisitAuthorChip({ author }: { author: AuthorInfo }) {
  if (!author.displayName) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-[12px] text-gray-900 font-bold whitespace-nowrap shrink-0">
      <PersonIcon size={13} />
      {author.displayName}
    </span>
  );
}
