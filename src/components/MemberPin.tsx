import { getMemberOrgColor } from '../lib/constants';
import type { MemberCategory } from '../lib/types';

// ──────────────────────────────────────────────────────────────
// メンバーピン（SVG）
// マップ上のピン (MapView の createMemberPin) と同じビジュアルロジックを
// React コンポーネントとして使えるようにしたもの。
// メンバーカード等のリスト UI で使う。
//
// ルール:
//  - 訪問済み = 組織色で塗りつぶし + 白いドット
//  - 未訪問   = 白地 + 組織色ストローク + 組織色ドット
//  - 未分類   = フォールバックのグレー
// ──────────────────────────────────────────────────────────────

interface Props {
  member: {
    district: string;
    category?: MemberCategory;
    honbu?: string;
  };
  visited: boolean;
  /** SVG の幅 px。デフォ 28（マップ上のピンと同じ寸法） */
  width?: number;
  /** SVG の高さ px。デフォ 40 */
  height?: number;
}

export default function MemberPin({ member, visited, width = 28, height = 40 }: Props) {
  const orgColor = getMemberOrgColor(member);
  const fill = visited ? orgColor : '#FFFFFF';
  const dotColor = visited ? '#FFFFFF' : orgColor;
  const strokeWidth = visited ? 1 : 2;

  // viewBox を -2..30 / -2..42 に広げて stroke が切れないようにする
  return (
    <svg
      width={width}
      height={height}
      viewBox="-2 -2 32 44"
      fill="none"
      className="shrink-0"
      style={{ overflow: 'visible' }}
    >
      <path
        d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 40 14 40S28 24.5 28 14C28 6.268 21.732 0 14 0Z"
        fill={fill}
        stroke={orgColor}
        strokeWidth={strokeWidth}
      />
      <circle cx="14" cy="13.5" r="5" fill={dotColor} />
    </svg>
  );
}
