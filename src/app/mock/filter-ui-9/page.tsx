'use client';

// 案9: タイムライン (改良版)
// ヒデさんが「タイムライン形式も良さそう」と仰った方向の改良。
// 案5 の単純なつまみだけじゃなく、各期間バケツに「実メンバーのアバター」を
// 並べて見せる。スクロール可。Apple Photos の Years 表示 + Spotify Wrapped
// のタイムラインを参考に。

import Link from 'next/link';
import { useState } from 'react';
import { FilterChrome } from '../filter-ui-v2/_realChrome';

// 実本部の色 (constants.ts より)
const HONBU_COLORS: Record<string, string> = {
  東旭川: '#FF3B30', 豊岡: '#FF9500', 旭創価: '#34C759', 東栄: '#5AC8FA',
};

// 各バケツに含まれるメンバー サンプル
// (本部 by 色 + 苗字頭文字)
type Member = { initial: string; honbu: keyof typeof HONBU_COLORS };
const BUCKETS: { day: number; label: string; n: number; members: Member[] }[] = [
  { day: 0,  label: '本日',     n: 3,  members: [{ initial: '高', honbu: '豊岡' }, { initial: '佐', honbu: '東旭川' }, { initial: '山', honbu: '豊岡' }] },
  { day: 7,  label: '今週',     n: 12, members: [
    { initial: '高', honbu: '豊岡' }, { initial: '伊', honbu: '東旭川' }, { initial: '渡', honbu: '旭創価' }, { initial: '中', honbu: '豊岡' },
    { initial: '小', honbu: '東栄' }, { initial: '田', honbu: '豊岡' }, { initial: '加', honbu: '豊岡' },
  ] },
  { day: 14, label: '先週',     n: 8,  members: [
    { initial: '鈴', honbu: '豊岡' }, { initial: '吉', honbu: '東旭川' }, { initial: '木', honbu: '旭創価' }, { initial: '林', honbu: '豊岡' },
    { initial: '池', honbu: '東栄' },
  ] },
  { day: 21, label: '2週間前', n: 5,  members: [
    { initial: '森', honbu: '豊岡' }, { initial: '清', honbu: '東旭川' }, { initial: '岡', honbu: '豊岡' },
  ] },
  { day: 30, label: '1ヶ月以内', n: 7, members: [
    { initial: '原', honbu: '豊岡' }, { initial: '上', honbu: '旭創価' }, { initial: '前', honbu: '豊岡' },
    { initial: '西', honbu: '東栄' },
  ] },
];

function PeriodSection({
  cutoffIdx,
  onCutoffChange,
}: {
  cutoffIdx: number;
  onCutoffChange: (i: number) => void;
}) {
  const total = BUCKETS.filter((_, i) => i <= cutoffIdx).reduce((a, b) => a + b.n, 0);
  return (
    <section className="px-4 py-3.5 border-b border-black/5">
      <div className="flex items-baseline justify-between mb-2.5">
        <h3 className="text-[11px] font-bold text-[var(--color-subtext)] tracking-wide">最終訪問からの期間</h3>
        <span className="text-[10px] text-[var(--color-subtext)]">
          {BUCKETS[cutoffIdx].label} 以内 ・ <b className="text-[#FF9500]">{total} 人</b>
        </span>
      </div>

      {/* タイムライン本体 */}
      <div className="relative rounded-2xl bg-gradient-to-br from-[#FFF8E1] to-[#FFFDF5] border border-[#F0CB80]/40 px-3 py-4 overflow-hidden">
        {/* 水平ライン */}
        <div className="absolute left-6 right-6 top-[18px] h-[2px] bg-[#E5C170]/40" />
        <div
          className="absolute left-6 top-[18px] h-[2px] bg-[#FF9500] transition-all"
          style={{ width: `calc((100% - 48px) * ${cutoffIdx / (BUCKETS.length - 1)})` }}
        />

        {/* 各バケツ */}
        <div className="flex items-start justify-between relative">
          {BUCKETS.map((b, i) => {
            const inside = i <= cutoffIdx;
            return (
              <button
                key={i}
                onClick={() => onCutoffChange(i)}
                className="flex flex-col items-center flex-1 group">
                {/* ノード */}
                <div className={`w-9 h-9 rounded-full border-[3px] flex items-center justify-center transition-all ${
                  i === cutoffIdx
                    ? 'border-[#FF9500] bg-[#FF9500] text-white scale-110 shadow-[0_3px_8px_rgba(255,149,0,0.4)]'
                    : inside
                      ? 'border-[#FF9500] bg-white text-[#FF9500]'
                      : 'border-[#E5E5EA] bg-white text-[#999]'
                }`}>
                  <div className="text-[11px] font-extrabold leading-none">{b.n}</div>
                </div>
                {/* ラベル */}
                <div className={`text-[9px] mt-1.5 font-bold ${
                  i === cutoffIdx ? 'text-[#FF9500]' : inside ? 'text-[#222]' : 'text-[var(--color-subtext)]'
                }`}>
                  {b.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* 該当アバター プレビュー (選択中バケツの中身) */}
        <div className="mt-3 pt-3 border-t border-[#F0CB80]/30">
          <div className="text-[9px] text-[var(--color-subtext)] mb-1.5 font-bold">
            {BUCKETS[cutoffIdx].label} 内 ({BUCKETS[cutoffIdx].n} 人) のメンバー
          </div>
          <div className="flex items-center">
            {BUCKETS[cutoffIdx].members.slice(0, 8).map((m, i) => (
              <div key={i}
                   className="w-7 h-7 rounded-full border-2 border-white text-white text-[11px] font-bold flex items-center justify-center shrink-0"
                   style={{ background: HONBU_COLORS[m.honbu], marginLeft: i === 0 ? 0 : -6 }}>
                {m.initial}
              </div>
            ))}
            {BUCKETS[cutoffIdx].n > BUCKETS[cutoffIdx].members.length && (
              <div className="w-7 h-7 rounded-full border-2 border-white bg-[#888] text-white text-[10px] font-bold flex items-center justify-center -ml-1.5">
                +{BUCKETS[cutoffIdx].n - BUCKETS[cutoffIdx].members.length}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 凡例 */}
      <div className="mt-2 flex items-center justify-center gap-3 text-[9px] text-[var(--color-subtext)]">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#FF3B30]" /><span>東旭川</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#FF9500]" /><span>豊岡</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#34C759]" /><span>旭創価</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-[#5AC8FA]" /><span>東栄</span>
        </div>
      </div>
    </section>
  );
}

export default function Page() {
  const [cutoff, setCutoff] = useState(1);  // 今週まで

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="px-4 pt-6 pb-3 max-w-md mx-auto">
        <Link href="/mock/filter-ui-v2" className="text-xs text-[var(--color-subtext)] underline">← 一覧へ戻る</Link>
        <h1 className="text-xl font-bold mt-2">案9 タイムライン (改良版)</h1>
        <p className="text-xs text-[var(--color-subtext)] mt-1">
          ヒデさん指摘の方向を強化。各バケツに実メンバーの頭文字アバター
          (本部色で色分け) を並べて「誰がそこにいるか」も見える。
        </p>
      </header>

      <div className="max-w-md mx-auto px-4">
        <FilterChrome
          count={BUCKETS.slice(0, cutoff + 1).reduce((a, b) => a + b.n, 0)}
          periodSection={<PeriodSection cutoffIdx={cutoff} onCutoffChange={setCutoff} />}
        />

        <div className="mt-4 mb-12 text-[12px] text-[var(--color-subtext)] leading-relaxed">
          <p className="mb-1"><b>👍 良いところ</b>: 「期間 × 本部分布」が一目。タイムラインで時間感覚も掴める</p>
          <p className="mb-1"><b>🤔 弱いところ</b>: 情報量がやや多い。ピン色とアバター色が並ぶので 色管理が大事</p>
        </div>
      </div>
    </div>
  );
}
