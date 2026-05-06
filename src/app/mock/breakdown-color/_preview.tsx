'use client';

// 訪問ログ内訳カードの色テーマ比較用プレビュー (mock 専用)
// 本物の log/page.tsx のレイアウトを最小限に再現し、theme で色だけ差し替える。

export type ColorTheme = {
  name: string;
  caption: string;
  // スタックバーの色
  bar: { met: string; absent: string; unknown: string; moved: string };
  // 4ブロックの色 (fg = 文字・数字、bg = 背景)
  blocks: {
    met: { fg: string; bg: string };
    absent: { fg: string; bg: string };
    unknown: { fg: string; bg: string };
    moved: { fg: string; bg: string };
  };
};

// 比較用の固定サンプル (実データに近い値)
const COUNTS = {
  met_self: 32,
  met_family: 18,
  refused: 4,
  absent: 28,
  unknown: 6,
  moved: 4,
};

export function BreakdownPreview({ theme }: { theme: ColorTheme }) {
  const met = COUNTS.met_self + COUNTS.met_family + COUNTS.refused;
  const total = met + COUNTS.absent + COUNTS.unknown + COUNTS.moved;
  const metRate = Math.round((met / total) * 100);
  const pct = (n: number) => Math.round((n / total) * 100);

  const blocks: {
    key: string;
    label: string;
    count: number;
    sub: string;
    fg: string;
    bg: string;
  }[] = [
    {
      key: 'met',
      label: '会えた',
      count: met,
      sub: `本人 ${COUNTS.met_self} / 家族 ${COUNTS.met_family} / 拒否 ${COUNTS.refused}`,
      fg: theme.blocks.met.fg,
      bg: theme.blocks.met.bg,
    },
    {
      key: 'absent',
      label: '不在',
      count: COUNTS.absent,
      sub: `${COUNTS.absent} 件`,
      fg: theme.blocks.absent.fg,
      bg: theme.blocks.absent.bg,
    },
    {
      key: 'unknown',
      label: '住所不明',
      count: COUNTS.unknown,
      sub: `${COUNTS.unknown} 件`,
      fg: theme.blocks.unknown.fg,
      bg: theme.blocks.unknown.bg,
    },
    {
      key: 'moved',
      label: '転居',
      count: COUNTS.moved,
      sub: `${COUNTS.moved} 件`,
      fg: theme.blocks.moved.fg,
      bg: theme.blocks.moved.bg,
    },
  ];

  // スタックバーの順 (会えた → 不在 → 住所不明 → 転居)
  const barSegments = [
    { count: met, color: theme.bar.met },
    { count: COUNTS.absent, color: theme.bar.absent },
    { count: COUNTS.unknown, color: theme.bar.unknown },
    { count: COUNTS.moved, color: theme.bar.moved },
  ];

  return (
    <div className="ios-card flex flex-col" style={{ padding: '2.125rem' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold leading-tight">訪問ログ内訳</h3>
          <p className="text-xs mt-0.5 text-[var(--color-subtext)] font-medium">直近12週分</p>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[11px] font-medium text-[var(--color-subtext)] whitespace-nowrap">
            会えた確率
          </span>
          <span
            className="tabular-nums leading-none text-[#111]"
            style={{
              fontSize: '4rem',
              fontWeight: 700,
              letterSpacing: '-0.03em',
            }}
          >
            {metRate}
          </span>
          <span className="text-sm font-bold text-[#111]">%</span>
        </div>
      </div>

      <div className="mt-auto">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-[var(--color-subtext)]">カテゴリ別の割合</span>
          <span className="text-[12px] font-bold">全 {total} 件</span>
        </div>
        <div
          className="flex rounded-full overflow-hidden bg-[#F3F4F6] mb-3"
          style={{ height: '0.875rem' }}
        >
          {barSegments.map((seg, i) => {
            if (seg.count === 0) return null;
            const w = (seg.count / total) * 100;
            return (
              <div
                key={i}
                className="h-full"
                style={{ width: `${w}%`, backgroundColor: seg.color }}
              />
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {blocks.map(b => (
            <div
              key={b.key}
              className="rounded-xl p-3"
              style={{ backgroundColor: b.bg }}
            >
              <div className="text-[11px] font-bold" style={{ color: b.fg }}>
                {b.label}
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span
                  className="font-extrabold tabular-nums leading-none"
                  style={{
                    color: b.fg,
                    fontSize: '1.875rem',
                    letterSpacing: '-0.04em',
                  }}
                >
                  {pct(b.count)}
                </span>
                <span className="text-[12px] font-bold" style={{ color: b.fg }}>
                  %
                </span>
              </div>
              <div className="text-[10px] mt-1" style={{ color: b.fg, opacity: 0.85 }}>
                {b.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── 5つのカラーテーマ ──────────────────────────────────────────

export const THEMES: ColorTheme[] = [
  {
    name: '案1 ブルー基調 (現状)',
    caption: '青で「会えた」を表現。落ち着いた業務アプリらしい配色。',
    bar: { met: '#3B82F6', absent: '#9CA3AF', unknown: '#F59E0B', moved: '#8B5CF6' },
    blocks: {
      met:     { fg: '#1D4ED8', bg: '#DBEAFE' },
      absent:  { fg: '#374151', bg: '#F3F4F6' },
      unknown: { fg: '#92400E', bg: '#FEF3C7' },
      moved:   { fg: '#5B21B6', bg: '#EDE9FE' },
    },
  },
  {
    name: '案2 信号機系',
    caption: '会えた=緑(達成)、住所不明=オレンジ、転居=赤。状態が一目でわかる。',
    bar: { met: '#10B981', absent: '#9CA3AF', unknown: '#F97316', moved: '#EF4444' },
    blocks: {
      met:     { fg: '#047857', bg: '#D1FAE5' },
      absent:  { fg: '#374151', bg: '#F3F4F6' },
      unknown: { fg: '#9A3412', bg: '#FFEDD5' },
      moved:   { fg: '#B91C1C', bg: '#FEE2E2' },
    },
  },
  {
    name: '案3 モノトーン',
    caption: '深ネイビー+グレー濃淡。ミニマルで上品、データに集中できる。',
    bar: { met: '#1E293B', absent: '#94A3B8', unknown: '#CBD5E1', moved: '#64748B' },
    blocks: {
      met:     { fg: '#0F172A', bg: '#E2E8F0' },
      absent:  { fg: '#475569', bg: '#F1F5F9' },
      unknown: { fg: '#64748B', bg: '#F8FAFC' },
      moved:   { fg: '#334155', bg: '#E2E8F0' },
    },
  },
  {
    name: '案4 iOS純正カラー',
    caption: 'systemBlue / systemOrange / systemPurple ベース。鮮やかでポップ。',
    bar: { met: '#007AFF', absent: '#8E8E93', unknown: '#FF9500', moved: '#AF52DE' },
    blocks: {
      met:     { fg: '#0040DD', bg: '#E1EFFF' },
      absent:  { fg: '#3C3C43', bg: '#F2F2F7' },
      unknown: { fg: '#C2410C', bg: '#FFEAD0' },
      moved:   { fg: '#7B2DBF', bg: '#F3E8FF' },
    },
  },
  {
    name: '案5 アースカラー (採用版)',
    caption: '会えた=アース系の青/サンド/アンバー/ローズ。温かみのある低彩度トーンで統一。本番反映済み。',
    bar: { met: '#4F6D8C', absent: '#A8A29E', unknown: '#D97706', moved: '#9F1239' },
    blocks: {
      met:     { fg: '#2A3E54', bg: '#DCE3EC' },
      absent:  { fg: '#44403C', bg: '#F5F5F4' },
      unknown: { fg: '#92400E', bg: '#FEF3C7' },
      moved:   { fg: '#9F1239', bg: '#FFE4E6' },
    },
  },
];
