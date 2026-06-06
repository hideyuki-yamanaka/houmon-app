'use client';

// 案6: ヒストグラム + レンジスライダー
// Airbnb / Booking の価格フィルタ風。横方向に「最終訪問から何日」が並んで、
// 各バケツの人数をバーで見せる。下のスライダー (左右つまみ) で範囲指定。
// 「先週〜2 週間前の人だけ」みたいな指定が直感的にできる。

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { FilterChrome } from '../filter-ui-v2/_realChrome';

// 各バケツの実データ風 分布 (96 人想定)
// 0=今日, 30=1ヶ月以上前
const BUCKETS = [
  { day: 0,  label: '本日',   n: 3 },
  { day: 3,  label: '3日前',  n: 6 },
  { day: 7,  label: '今週',   n: 12 },
  { day: 10, label: '10日',   n: 8 },
  { day: 14, label: '先週',   n: 8 },
  { day: 21, label: '2週間',  n: 5 },
  { day: 30, label: '1ヶ月',  n: 7 },
  { day: 60, label: '2ヶ月',  n: 14 },
  { day: 90, label: '3ヶ月+', n: 33 },
];

function PeriodSection({
  rangeMin, rangeMax, onRangeChange,
}: {
  rangeMin: number;
  rangeMax: number;
  onRangeChange: (lo: number, hi: number) => void;
}) {
  const maxN = Math.max(...BUCKETS.map(b => b.n));
  const total = useMemo(
    () => BUCKETS
      .filter((_, i) => i >= rangeMin && i <= rangeMax)
      .reduce((a, b) => a + b.n, 0),
    [rangeMin, rangeMax],
  );

  return (
    <section className="px-4 py-3.5 border-b border-black/5">
      <div className="flex items-baseline justify-between mb-2.5">
        <h3 className="text-[11px] font-bold text-[var(--color-subtext)] tracking-wide">最終訪問からの期間</h3>
        <span className="text-[10px] text-[var(--color-subtext)]">該当 {total} 人</span>
      </div>

      {/* ヒストグラム */}
      <div className="flex items-end gap-[3px] h-20 px-1 mb-1">
        {BUCKETS.map((b, i) => {
          const within = i >= rangeMin && i <= rangeMax;
          const heightPct = (b.n / maxN) * 100;
          return (
            <button
              key={i}
              onClick={() => {
                // バーをタップしたら そのバケツ単独に絞る
                onRangeChange(i, i);
              }}
              className="flex-1 flex flex-col items-center group"
              style={{ height: '100%' }}>
              <div className="flex-1 w-full flex items-end">
                <div
                  className={`w-full rounded-t-sm transition-colors ${
                    within ? 'bg-[#FF9500]' : 'bg-[#E5E5EA]'
                  }`}
                  style={{ height: `${heightPct}%`, minHeight: 4 }}
                />
              </div>
              <div className={`text-[8px] mt-1 font-bold ${within ? 'text-[#FF9500]' : 'text-[#999]'}`}>
                {b.n}
              </div>
            </button>
          );
        })}
      </div>

      {/* レンジスライダー (両端つまみ) */}
      <div className="relative h-10 mt-2">
        {/* レール */}
        <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-1 bg-[#E5E5EA] rounded-full" />
        {/* 選択範囲 */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 bg-[#FF9500] rounded-full"
          style={{
            left: `calc(8px + (100% - 16px) * ${rangeMin / (BUCKETS.length - 1)})`,
            right: `calc(8px + (100% - 16px) * ${1 - rangeMax / (BUCKETS.length - 1)})`,
          }}
        />
        {/* つまみ */}
        {[rangeMin, rangeMax].map((tick, idx) => {
          const pct = tick / (BUCKETS.length - 1);
          return (
            <div key={idx}
                 className="absolute top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border-[3px] border-[#FF9500] shadow-md flex items-center justify-center"
                 style={{ left: `calc(8px + (100% - 16px) * ${pct} - 14px)` }}>
              <div className="w-1 h-1 rounded-full bg-[#FF9500]" />
            </div>
          );
        })}
      </div>

      {/* 期間ラベル */}
      <div className="flex justify-between text-[9px] text-[var(--color-subtext)] font-bold mt-0.5 px-1">
        <span className="text-[#FF9500]">{BUCKETS[rangeMin].label}</span>
        <span>〜</span>
        <span className="text-[#FF9500]">{BUCKETS[rangeMax].label}</span>
      </div>

      {/* プリセットチップ (Booking 風) */}
      <div className="flex gap-1.5 mt-3 flex-wrap">
        <button onClick={() => onRangeChange(0, BUCKETS.length - 1)}
                className="px-3 py-1 text-[11px] rounded-full bg-white border border-[#E5E5EA] font-semibold active:bg-[#FAFAFA]">
          すべて
        </button>
        <button onClick={() => onRangeChange(0, 2)}
                className="px-3 py-1 text-[11px] rounded-full bg-white border border-[#E5E5EA] font-semibold active:bg-[#FAFAFA]">
          今週以内
        </button>
        <button onClick={() => onRangeChange(0, 6)}
                className="px-3 py-1 text-[11px] rounded-full bg-white border border-[#E5E5EA] font-semibold active:bg-[#FAFAFA]">
          1ヶ月以内
        </button>
        <button onClick={() => onRangeChange(7, BUCKETS.length - 1)}
                className="px-3 py-1 text-[11px] rounded-full bg-white border border-[#E5E5EA] font-semibold active:bg-[#FAFAFA]">
          1ヶ月以上前
        </button>
      </div>
    </section>
  );
}

export default function Page() {
  const [rangeMin, setRangeMin] = useState(0);
  const [rangeMax, setRangeMax] = useState(6);  // 0〜6 = 本日〜1ヶ月

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="px-4 pt-6 pb-3 max-w-md mx-auto">
        <Link href="/mock/filter-ui-v2" className="text-xs text-[var(--color-subtext)] underline">← 一覧へ戻る</Link>
        <h1 className="text-xl font-bold mt-2">案6 ヒストグラム + レンジスライダー</h1>
        <p className="text-xs text-[var(--color-subtext)] mt-1">
          Airbnb / Booking の価格フィルタ風。バーの高さで「何人いるか」が一目、
          つまみで範囲指定。今選んでる期間に何人いるかも上に表示。
        </p>
      </header>

      <div className="max-w-md mx-auto px-4">
        <FilterChrome
          count={51}
          periodSection={
            <PeriodSection rangeMin={rangeMin} rangeMax={rangeMax}
                           onRangeChange={(lo, hi) => { setRangeMin(lo); setRangeMax(hi); }} />
          }
        />

        <div className="mt-4 mb-12 text-[12px] text-[var(--color-subtext)] leading-relaxed">
          <p className="mb-1"><b>👍 良いところ</b>: 分布が即わかる。「2 週間前の人が一気に減るな」みたいな気づき</p>
          <p className="mb-1"><b>🤔 弱いところ</b>: つまみのドラッグは実装少し凝る (バー タップ + プリセットで代用も可)</p>
        </div>
      </div>
    </div>
  );
}
