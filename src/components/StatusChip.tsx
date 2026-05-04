// ──────────────────────────────────────────────────────────────
// 訪問ステータス用のチップ表示。アウトライン型(白背景+色枠+色文字+左ドット)。
// 全画面統一の固定スタイル (paddingX 10 / paddingY 4 / fontSize 10 / gap 3 /
//   dotSize 8 / borderWidth 1 / borderRadius 9999 / fontWeight 700)。
// ──────────────────────────────────────────────────────────────

import type { VisitStatus } from '../lib/types';
import { VISIT_STATUS_CONFIG } from '../lib/constants';

interface Props {
  status: VisitStatus;
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
