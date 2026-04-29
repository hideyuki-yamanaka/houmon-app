'use client';

// ──────────────────────────────────────────────────────────────
// 「訪問ログ内訳」カードの 5 パターン比較ページ
// ヒデさん要望(2026-04-26):
//   - 現状: タイトル + Hero(18%) + 細い積み上げバー + レジェンド だけで中央スカスカ
//   - 求めるもの: 中央が実用的に埋まり、PC/スマホ両方で良い見た目
//   - 5 パターンの mock を出して、選んでもらってから本実装
//
// サンプルデータは現実の分布(全 22 件)に近い数値を使う。
// ──────────────────────────────────────────────────────────────

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

type StatusKey =
  | 'met_self'
  | 'met_family'
  | 'absent'
  | 'refused'
  | 'unknown_address'
  | 'moved';

const ORDER: StatusKey[] = ['met_self', 'met_family', 'absent', 'refused', 'unknown_address', 'moved'];

const STATUS_LABEL: Record<StatusKey, string> = {
  met_self: '本人に会えた',
  met_family: '家族に会えた',
  absent: '不在',
  refused: '拒否',
  unknown_address: '住所不明',
  moved: '転居',
};

const STATUS_HEX: Record<StatusKey, string> = {
  met_self: '#10B981',
  met_family: '#34D399',
  absent: '#6B7280',
  refused: '#EF4444',
  unknown_address: '#F59E0B',
  moved: '#8B5CF6',
};

// 実データに近いサンプル(全 22 件)
const COUNTS: Record<StatusKey, number> = {
  met_self: 1,
  met_family: 3,
  absent: 8,
  refused: 1,
  unknown_address: 7,
  moved: 2,
};
const TOTAL = ORDER.reduce((a, k) => a + COUNTS[k], 0);
const MET_RATE = Math.round(((COUNTS.met_self + COUNTS.met_family) / TOTAL) * 100);
const MAX = Math.max(...ORDER.map(k => COUNTS[k]));

// ── 共通ヘッダー: 左=タイトル+「会えた確率」、右=18% ──
function CardHeader() {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-lg font-bold leading-tight">訪問ログ内訳</h3>
        <p className="text-xs mt-0.5 text-[var(--color-subtext)] font-medium">会えた確率</p>
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className="font-extrabold tabular-nums leading-none text-[#111]"
          style={{ fontSize: '4rem', letterSpacing: '-0.06em' }}
        >
          {MET_RATE}
        </span>
        <span className="text-sm font-bold text-[#111]">%</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 A: 横棒ランキング型
//   各カテゴリを 1 行ずつ「色付きラベル+件数+横棒」で並べる。
//   PC でも縦に整然と並んで埋まる。家庭訪問の回数カードと統一感あり。
// ──────────────────────────────────────────────────────────────
function PatternA() {
  return (
    <div>
      <CardHeader />
      <div className="space-y-2.5">
        {ORDER.map(k => {
          const c = COUNTS[k];
          const pct = (c / MAX) * 100;
          return (
            <div key={k}>
              <div className="flex items-baseline justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_HEX[k] }} />
                  <span className="text-[13px] font-semibold text-[#111]">{STATUS_LABEL[k]}</span>
                </div>
                <span className="text-[15px] font-extrabold tabular-nums text-[#111]">
                  {c}
                  <span className="text-[10px] font-normal text-[#9CA3AF] ml-0.5">件</span>
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-[#F3F4F6] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: STATUS_HEX[k] }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 B: 2x3 グリッドカード型
//   6 カテゴリを 2 列 3 行のタイルで均等に並べる。
//   各タイル: 色ドット + ラベル + 大きな件数 + 全体に対する %
//   中央が綺麗に埋まる。並列比較しやすい。
// ──────────────────────────────────────────────────────────────
function PatternB() {
  return (
    <div>
      <CardHeader />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {ORDER.map(k => {
          const c = COUNTS[k];
          const pct = TOTAL > 0 ? Math.round((c / TOTAL) * 100) : 0;
          return (
            <div
              key={k}
              className="rounded-xl bg-[#FAFAFA] border border-[#F0F0F0] p-3 flex flex-col"
            >
              <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_HEX[k] }} />
                <span className="text-[11px] font-semibold text-[var(--color-subtext)] truncate">
                  {STATUS_LABEL[k]}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[26px] font-extrabold tabular-nums leading-none text-[#111]">
                  {c}
                </span>
                <span className="text-[10px] text-[#9CA3AF]">件 · {pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 C: ドーナツ + 凡例(右側) サイドバイサイド
//   左: ドーナツチャート(中央に「全 22 件」)
//   右: ステータスのレジェンド + 件数 + %
//   中央が明確に埋まる、視覚的なインパクト◎
// ──────────────────────────────────────────────────────────────
function PatternC() {
  // ドーナツの始点/終点角度を計算
  const RADIUS = 50;
  const STROKE = 18;
  const C = 2 * Math.PI * RADIUS;
  let acc = 0;
  const arcs = ORDER.map(k => {
    const c = COUNTS[k];
    const pct = TOTAL > 0 ? c / TOTAL : 0;
    const len = pct * C;
    const arc = { k, len, offset: acc };
    acc += len;
    return arc;
  });

  return (
    <div>
      <CardHeader />
      <div className="flex items-center gap-4">
        {/* ドーナツ */}
        <div className="relative shrink-0" style={{ width: 140, height: 140 }}>
          <svg viewBox="0 0 140 140" width="140" height="140" className="-rotate-90">
            <circle cx="70" cy="70" r={RADIUS} stroke="#F3F4F6" strokeWidth={STROKE} fill="none" />
            {arcs.map(a => (
              <circle
                key={a.k}
                cx="70"
                cy="70"
                r={RADIUS}
                fill="none"
                stroke={STATUS_HEX[a.k]}
                strokeWidth={STROKE}
                strokeDasharray={`${a.len} ${C - a.len}`}
                strokeDashoffset={-a.offset}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] text-[#9CA3AF]">全</span>
            <span className="text-[28px] font-extrabold tabular-nums leading-none text-[#111]">
              {TOTAL}
            </span>
            <span className="text-[10px] text-[#9CA3AF]">件</span>
          </div>
        </div>
        {/* レジェンド */}
        <div className="flex-1 grid grid-cols-1 gap-1.5">
          {ORDER.map(k => {
            const c = COUNTS[k];
            const pct = TOTAL > 0 ? Math.round((c / TOTAL) * 100) : 0;
            return (
              <div key={k} className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS_HEX[k] }} />
                <span className="text-[12px] flex-1 truncate text-[var(--color-subtext)]">
                  {STATUS_LABEL[k]}
                </span>
                <span className="text-[12px] font-extrabold tabular-nums text-[#111]">
                  {c}
                  <span className="text-[10px] font-normal text-[#9CA3AF] ml-0.5">/ {pct}%</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 D: 縦積みバー(stacked vertical) + 横レジェンド
//   - 最大値カテゴリを基準に、各カテゴリを縦バーで並べる
//   - 縦長の "ヒストグラム的" レイアウトで真ん中をしっかり埋める
//   - PC では横に余裕、スマホでも縦に整列
// ──────────────────────────────────────────────────────────────
function PatternD() {
  return (
    <div>
      <CardHeader />
      <div className="flex items-end gap-2.5 h-[180px]">
        {ORDER.map(k => {
          const c = COUNTS[k];
          const heightPct = MAX > 0 ? (c / MAX) * 100 : 0;
          return (
            <div key={k} className="flex-1 flex flex-col items-center justify-end h-full">
              {/* 件数 */}
              <span className="text-[14px] font-extrabold tabular-nums text-[#111] leading-none mb-1">
                {c}
              </span>
              {/* バー */}
              <div
                className="w-full rounded-t-md transition-all"
                style={{
                  height: `${heightPct}%`,
                  minHeight: 4,
                  background: STATUS_HEX[k],
                }}
              />
              {/* 下ラベル(2 行分) */}
              <span className="text-[9px] text-[#6B7280] mt-1 text-center leading-tight whitespace-pre-line">
                {STATUS_LABEL[k].replace('に会えた', '\nに会えた')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 E: スタックバー + ハイライトインサイト + ミニドリル
//   - 上部: スタックバー(現状の積み上げ)
//   - 下部: 「会えた」(本人+家族) と「会えてない」(不在/拒否/不明/転居)
//          の 2 大ブロックに分けて大数字で見せる
//   - 一番ボリュームのあるカテゴリを「最多」として強調
// ──────────────────────────────────────────────────────────────
function PatternE() {
  const metTotal = COUNTS.met_self + COUNTS.met_family;
  const notMetTotal = TOTAL - metTotal;
  const top = ORDER.reduce(
    (best, k) => (COUNTS[k] > COUNTS[best] ? k : best),
    ORDER[0],
  );
  return (
    <div>
      <CardHeader />
      {/* スタックバー */}
      <div className="flex rounded-full overflow-hidden bg-[#F3F4F6] mb-3" style={{ height: 14 }}>
        {ORDER.map(k => {
          const c = COUNTS[k];
          if (c === 0) return null;
          const pct = (c / TOTAL) * 100;
          return (
            <div
              key={k}
              className="h-full"
              style={{ width: `${pct}%`, background: STATUS_HEX[k] }}
              title={`${STATUS_LABEL[k]}: ${c}件`}
            />
          );
        })}
      </div>
      {/* 2 大ブロック */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-xl bg-[#ECFDF5] p-3">
          <div className="text-[11px] font-bold text-[#10B981]">会えた</div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-[28px] font-extrabold tabular-nums leading-none text-[#10B981]">
              {metTotal}
            </span>
            <span className="text-[11px] text-[#10B981]">件</span>
          </div>
          <div className="text-[10px] text-[#10B981]/80 mt-1">
            (本人 {COUNTS.met_self} / 家族 {COUNTS.met_family})
          </div>
        </div>
        <div className="rounded-xl bg-[#F3F4F6] p-3">
          <div className="text-[11px] font-bold text-[var(--color-subtext)]">会えてない</div>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-[28px] font-extrabold tabular-nums leading-none text-[#6B7280]">
              {notMetTotal}
            </span>
            <span className="text-[11px] text-[#6B7280]">件</span>
          </div>
          <div className="text-[10px] text-[var(--color-subtext)] mt-1">
            最多: {STATUS_LABEL[top]}({COUNTS[top]})
          </div>
        </div>
      </div>
      {/* レジェンド(コンパクト) */}
      <div className="grid grid-cols-3 gap-x-3 gap-y-1">
        {ORDER.map(k => (
          <div key={k} className="flex items-center gap-1.5 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STATUS_HEX[k] }} />
            <span className="text-[10.5px] truncate flex-1 text-[var(--color-subtext)]">
              {STATUS_LABEL[k]}
            </span>
            <span className="text-[11px] font-bold tabular-nums">{COUNTS[k]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// メインページ
// ──────────────────────────────────────────────────────────────
export default function DashboardBreakdownMockPage() {
  const patterns: { key: string; title: string; desc: string; node: React.ReactNode }[] = [
    {
      key: 'A',
      title: 'A. 横棒ランキング型',
      desc: '各カテゴリを 1 行ずつ「ラベル+件数+横棒」で表示。家庭訪問の回数カードと並びの統一感◎',
      node: <PatternA />,
    },
    {
      key: 'B',
      title: 'B. 2×3 グリッドカード型',
      desc: '6 カテゴリを正方形タイルで均等配置。中央が綺麗に埋まり、並列比較しやすい',
      node: <PatternB />,
    },
    {
      key: 'C',
      title: 'C. ドーナツ + 凡例',
      desc: '左にドーナツ(中央に全件数)、右にレジェンド。視覚インパクト◎',
      node: <PatternC />,
    },
    {
      key: 'D',
      title: 'D. 縦バー(ヒストグラム)',
      desc: '6 カテゴリを縦バーで並べる。エネルギッシュで縦の量感が伝わる',
      node: <PatternD />,
    },
    {
      key: 'E',
      title: 'E. インサイト型(2 大ブロック)',
      desc: '会えた / 会えてない の 2 大ブロック + 最多カテゴリ。一目で結論が分かる',
      node: <PatternE />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-20">
      <nav className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[#E5E7EB] px-4 py-3 flex items-center gap-2">
        <Link href="/log" className="flex items-center gap-1 text-[var(--color-primary)]">
          <ChevronLeft size={22} />
          <span className="text-sm">戻る</span>
        </Link>
        <h1 className="flex-1 text-center text-base font-bold">訪問ログ内訳 5 案</h1>
        <div className="w-14" />
      </nav>

      <section className="px-4 pt-4">
        <p className="text-[13px] text-[#374151] leading-relaxed">
          現状の「訪問ログ内訳」カードは中央スカスカで、全体像をパッと掴みづらい。
          中身が実用的に埋まる &amp; PC/スマホ両方で映える 5 パターンを並べてみた。
        </p>
        <p className="text-[11px] text-[#9CA3AF] mt-1">
          ※ サンプルデータ表示。本番値は変動。
        </p>
      </section>

      <div className="px-4 pt-6 space-y-6">
        {patterns.map(p => (
          <section key={p.key}>
            <h2 className="text-[15px] font-bold mb-1">{p.title}</h2>
            <p className="text-[12px] text-[#6B7280] mb-3">{p.desc}</p>
            <div
              className="ios-card hover:!opacity-100"
              style={{ padding: '2.125rem' }}
            >
              {p.node}
            </div>
          </section>
        ))}
      </div>

      <section className="px-4 pt-8">
        <p className="text-[12px] text-[#6B7280] leading-relaxed">
          A〜E のうち気に入った案 + 細かいリクエスト(色／数字サイズ等)を教えてくれたら、
          ダッシュボードの訪問ログ内訳カードを本実装するで。
        </p>
      </section>
    </div>
  );
}
