// ──────────────────────────────────────────────────────────────
// 訪問ステータス用のチップ表示。アウトライン型(白背景+色枠+色文字+左ドット)。
// 2026-04-26: ヒデさん採用案 C をベースに全画面で共通化。
//
// 使用例:
//   <StatusChip status={visit.status} />
//   <StatusChip status={visit.status} size="sm" />
// ──────────────────────────────────────────────────────────────

import type { VisitStatus } from '../lib/types';
import { VISIT_STATUS_CONFIG } from '../lib/constants';

interface Props {
  status: VisitStatus;
  /** サイズ感:
   *   md(default) — 標準カード/詳細ページ用
   *   sm         — ボトムシートの訪問ログ行・カレンダーの密リスト用 */
  size?: 'sm' | 'md';
}

export default function StatusChip({ status, size = 'md' }: Props) {
  const c = VISIT_STATUS_CONFIG[status];
  if (!c) return null;
  const isSm = size === 'sm';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-white font-bold whitespace-nowrap ${
        isSm ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-[12px]'
      }`}
      style={{
        border: `1.5px solid ${c.border}`,
        color: c.text,
      }}
    >
      <span
        className={`rounded-full shrink-0 ${isSm ? 'w-1.5 h-1.5' : 'w-2 h-2'}`}
        style={{ background: c.dot }}
      />
      {c.label}
    </span>
  );
}
