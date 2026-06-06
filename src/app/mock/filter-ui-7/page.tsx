'use client';

// 案7: カレンダー ヒートマップ
// GitHub contribution / Apple Activity ring 風。過去 8 週を方眼で表示。
// 各セル = 1 日。色の濃さでその日に「最終訪問になった人」の数。
// タップで「ここから前」をしきい値に設定。

import Link from 'next/link';
import { useState } from 'react';
import { FilterChrome } from '../filter-ui-v2/_realChrome';

// 8 週 × 7 日 = 56 日分の活動ヒート (本物っぽい分布)
// 訪問が多い: 月木曜の夜、休日も少しあり
// pseudo seed (Math.random 不使用)
function genHeat(weeks: number): { day: number; intensity: number }[][] {
  const out: { day: number; intensity: number }[][] = [];
  for (let w = 0; w < weeks; w++) {
    const week: { day: number; intensity: number }[] = [];
    for (let d = 0; d < 7; d++) {
      // 月(0), 火(1), 水(2), 木(3), 金(4), 土(5), 日(6)
      // 月木に集中
      let base = 0;
      if (d === 0 || d === 3) base = 3;
      else if (d === 1 || d === 5) base = 1;
      else if (d === 4) base = 2;
      // 古い週は活動が少し落ちる
      if (w >= 4) base = Math.max(0, base - 1);
      if (w === 7) base = Math.max(0, base - 1);
      week.push({ day: w * 7 + d, intensity: base });
    }
    out.push(week);
  }
  return out;
}
const HEAT = genHeat(8);
const DAYS_LABEL = ['月', '火', '水', '木', '金', '土', '日'];

function intensityColor(i: number, selected: boolean): string {
  if (selected) return 'bg-[#FF9500]';
  if (i === 0) return 'bg-[#F2F2F7]';
  if (i === 1) return 'bg-[#FFE4B5]';
  if (i === 2) return 'bg-[#FFC069]';
  return 'bg-[#FF9500]';
}

function PeriodSection({
  cutoffDays,
  onCutoffChange,
}: {
  cutoffDays: number;
  onCutoffChange: (d: number) => void;
}) {
  return (
    <section className="px-4 py-3.5 border-b border-black/5">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-[11px] font-bold text-[var(--color-subtext)] tracking-wide">最終訪問からの期間</h3>
        <span className="text-[10px] text-[#FF9500] font-bold">{cutoffDays}日以内 ・ 26人</span>
      </div>
      <div className="rounded-xl bg-[#FAFAFA] border border-black/5 px-2.5 py-3">
        {/* 凡例 */}
        <div className="flex items-center justify-between mb-2 text-[9px] text-[var(--color-subtext)]">
          <span>← 過去 8 週間</span>
          <span>本日 →</span>
        </div>
        <div className="flex gap-1.5">
          {/* 曜日ラベル */}
          <div className="flex flex-col gap-0.5 justify-around text-[8px] text-[var(--color-subtext)] font-bold pr-0.5">
            {DAYS_LABEL.map(d => <div key={d} className="h-3 leading-3">{d}</div>)}
          </div>
          {/* ヒートグリッド */}
          <div className="flex-1 grid grid-rows-7 grid-flow-col gap-0.5">
            {HEAT.flatMap((week, wi) => week.map((cell, di) => {
              const fromToday = (HEAT.length - 1 - wi) * 7 + (6 - di);
              const selected = fromToday <= cutoffDays;
              return (
                <button
                  key={`${wi}-${di}`}
                  onClick={() => onCutoffChange(fromToday)}
                  className={`h-3 rounded-sm transition-colors ${intensityColor(cell.intensity, selected)}`}
                  aria-label={`${fromToday}日前`}
                />
              );
            }))}
          </div>
        </div>
        {/* 凡例 */}
        <div className="flex items-center gap-1.5 mt-2.5 text-[9px] text-[var(--color-subtext)] justify-end">
          <span>少</span>
          <div className="w-2.5 h-2.5 rounded-sm bg-[#F2F2F7]" />
          <div className="w-2.5 h-2.5 rounded-sm bg-[#FFE4B5]" />
          <div className="w-2.5 h-2.5 rounded-sm bg-[#FFC069]" />
          <div className="w-2.5 h-2.5 rounded-sm bg-[#FF9500]" />
          <span>多</span>
        </div>
      </div>

      {/* プリセット */}
      <div className="flex gap-1.5 mt-2.5 flex-wrap">
        {[
          { label: '今週',      d: 7 },
          { label: '今月',      d: 30 },
          { label: '2ヶ月以内', d: 60 },
          { label: 'すべて',    d: 365 },
        ].map(p => (
          <button key={p.label} onClick={() => onCutoffChange(p.d)}
                  className={`px-3 py-1 text-[11px] rounded-full font-semibold ${
                    cutoffDays === p.d
                      ? 'bg-[#FF9500] text-white'
                      : 'bg-white border border-[#E5E5EA] text-[#222]'
                  }`}>{p.label}</button>
        ))}
      </div>
    </section>
  );
}

export default function Page() {
  const [cutoff, setCutoff] = useState(30);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="px-4 pt-6 pb-3 max-w-md mx-auto">
        <Link href="/mock/filter-ui-v2" className="text-xs text-[var(--color-subtext)] underline">← 一覧へ戻る</Link>
        <h1 className="text-xl font-bold mt-2">案7 カレンダー ヒートマップ</h1>
        <p className="text-xs text-[var(--color-subtext)] mt-1">
          GitHub / Apple Activity 風。過去 8 週を方眼で表示、訪問あった日が濃い。
          セルをタップで「ここから前」を絞る。
        </p>
      </header>

      <div className="max-w-md mx-auto px-4">
        <FilterChrome
          count={26}
          periodSection={<PeriodSection cutoffDays={cutoff} onCutoffChange={setCutoff} />}
        />

        <div className="mt-4 mb-12 text-[12px] text-[var(--color-subtext)] leading-relaxed">
          <p className="mb-1"><b>👍 良いところ</b>: 「自分が最近どのくらい訪問してるか」を視覚で振り返れる (副産物)</p>
          <p className="mb-1"><b>🤔 弱いところ</b>: 「期間を選ぶ」と「自分の活動を見る」が混ざる。情報量多めで判断遅れがち</p>
        </div>
      </div>
    </div>
  );
}
