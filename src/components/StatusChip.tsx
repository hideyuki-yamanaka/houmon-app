// ──────────────────────────────────────────────────────────────
// 訪問ステータス用のチップ表示。アウトライン型(白背景+色枠+色文字+左ドット)。
//
// ヒデさん指示 (2026-05-03 v3):
//   /mock/status-chip-tuner で確定した値で全画面統一。
//   旧 size='sm' / 'md' バリエーションは廃止 (常に同じ見た目)。
//   size prop は後方互換のため残すが 中身は無視。
//
// 確定値 (px):
//   paddingX 10  paddingY 4   fontSize 10  gap 3
//   dotSize  8   borderWidth 1   borderRadius 9999  fontWeight 700
// ──────────────────────────────────────────────────────────────

import type { VisitStatus } from '../lib/types';
import { VISIT_STATUS_CONFIG } from '../lib/constants';

interface Props {
  status: VisitStatus;
  /** @deprecated サイズバリエーション廃止。指定しても無視される(後方互換のため残す)。 */
  size?: 'sm' | 'md';
}

export default function StatusChip({ status }: Props) {
  const c = VISIT_STATUS_CONFIG[status];
  if (!c) return null;
  return (
    <span
      className="inline-flex items-center bg-white whitespace-nowrap"
      style={{
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 4,
        paddingBottom: 4,
        fontSize: 10,
        gap: 3,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: c.border,
        borderRadius: 9999,
        color: c.text,
        fontWeight: 700,
        lineHeight: 1.2,
      }}
    >
      <span
        className="inline-block shrink-0 rounded-full"
        style={{ width: 8, height: 8, background: c.dot }}
      />
      {c.label}
    </span>
  );
}
