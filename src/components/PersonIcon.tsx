// ──────────────────────────────────────────────────────────────
// PersonIcon — 訪問ログ作者バッジ用 「ふっくら ちびキャラ」シルエット
//
// ヒデさん採択 (2026-05-03 mock v3 D 案):
//   - 頭大きめ、体ふっくら、塗りつぶし
//   - 親しみやすい雰囲気 (家庭訪問アプリの世界観に合わせて)
//
// 色は currentColor。呼び出し側で text-gray-900 等を指定する。
// ──────────────────────────────────────────────────────────────

interface Props {
  size?: number;
  className?: string;
}

export default function PersonIcon({ size = 13, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      {/* 頭 */}
      <circle cx="12" cy="8" r="5" />
      {/* 肩から下 (ちょっと丸みを帯びた半円) */}
      <path d="M3 22 C 3 16, 7 14, 12 14 C 17 14, 21 16, 21 22 Z" />
    </svg>
  );
}
