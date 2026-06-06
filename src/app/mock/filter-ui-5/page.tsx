'use client';

// 案5: ヴィジュアル タイムライン
// 期間を 水平タイムラインで指定。「今日 ─ 1週間 ─ 1ヶ月 ─ それ以上」を
// 1 本のバーで表現、つまみで「ここから前」を選ぶ。視覚的に時間感覚が掴める。

import Link from 'next/link';
import { useState } from 'react';
import { X, SlidersHorizontal } from 'lucide-react';

const TICKS = [
  { day: 0,   label: '今日' },
  { day: 7,   label: '1週間' },
  { day: 14,  label: '2週間' },
  { day: 30,  label: '1ヶ月' },
  { day: 90,  label: '3ヶ月' },
  { day: 180, label: 'それ以上' },
];

const CATEGORIES = [
  { key: 'unvisited', label: '未訪問',   dot: '#FF9500', n: 30 },
  { key: 'visited',   label: '訪問済み', dot: '#34C759', n: 12 },
  { key: 'met_self',  label: '本人会えた', dot: '#34C759', n: 5 },
  { key: 'met_fam',   label: '家族会えた', dot: '#34C759', n: 4 },
  { key: 'absent',    label: '不在',     dot: '#8E8E93', n: 3 },
];

export default function Page() {
  const [tick, setTick] = useState<number>(1); // 0=なし, 1..n=該当
  const [cat, setCat] = useState<string | null>(null);

  const selected = TICKS[tick];

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="px-4 pt-6 pb-3 max-w-md mx-auto">
        <Link href="/mock/filter-ui" className="text-xs text-[var(--color-subtext)] underline">← 一覧へ戻る</Link>
        <h1 className="text-xl font-bold mt-2">案5 ヴィジュアル タイムライン</h1>
        <p className="text-xs text-[var(--color-subtext)] mt-1">期間を水平タイムラインで指定。時間感覚がビジュアルで掴める。</p>
      </header>

      <div className="max-w-md mx-auto px-4">
        <div className="rounded-2xl border border-black/10 bg-white overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-black/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-[#666]" />
              <div className="font-bold text-[15px]">フィルター</div>
              <div className="text-[11px] text-[var(--color-subtext)] ml-1">42件</div>
            </div>
            <button className="w-8 h-8 rounded-full flex items-center justify-center active:bg-[#F0F0F0]">
              <X size={18} className="text-[#666]" />
            </button>
          </div>

          {/* タイムライン */}
          <section className="px-5 py-5 border-b border-black/5">
            <h3 className="text-[11px] font-bold text-[var(--color-subtext)] tracking-wide mb-2">最終訪問からの期間</h3>
            <div className="rounded-2xl bg-gradient-to-br from-[#F0F7FF] to-[#FAFCFE] border border-[#E0EAF5] px-3 py-4">
              <div className="text-center mb-3">
                <div className="text-[10px] text-[var(--color-subtext)]">過去</div>
                <div className="text-[20px] font-extrabold mt-0.5">{selected.label} 以内</div>
              </div>
              {/* レール */}
              <div className="relative h-12 mt-2 mb-1">
                <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-1 bg-[#E5E5EA] rounded-full" />
                <div className="absolute left-2 top-1/2 -translate-y-1/2 h-1 bg-[#4A90C2] rounded-full"
                     style={{ width: `calc((100% - 16px) * ${tick / (TICKS.length - 1)})` }} />
                {TICKS.map((t, i) => {
                  const pct = i / (TICKS.length - 1);
                  const active = i === tick;
                  return (
                    <button key={i} onClick={() => setTick(i)}
                            className="absolute top-1/2 -translate-y-1/2"
                            style={{ left: `calc(8px + (100% - 16px) * ${pct} - 16px)` }}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        active
                          ? 'bg-[#4A90C2] text-white shadow-[0_3px_8px_rgba(74,144,194,0.4)] scale-110'
                          : i < tick
                            ? 'bg-[#4A90C2] text-white opacity-50'
                            : 'bg-white border-2 border-[#E5E5EA] text-[#999]'
                      }`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-current" />
                      </div>
                    </button>
                  );
                })}
              </div>
              {/* 目盛ラベル */}
              <div className="flex justify-between mt-1 text-[9px] text-[var(--color-subtext)] font-bold px-1">
                {TICKS.map((t, i) => (
                  <span key={i} className={i === tick ? 'text-[#4A90C2]' : ''}>{t.label}</span>
                ))}
              </div>
            </div>
            <div className="text-center text-[10px] text-[var(--color-subtext)] mt-2">
              つまみをタップして 期間を選ぶ
            </div>
          </section>

          {/* カテゴリ (案1風コンパクトグリッド) */}
          <section className="px-4 py-4">
            <h3 className="text-[11px] font-bold text-[var(--color-subtext)] tracking-wide mb-2.5">訪問カテゴリ</h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setCat(null)}
                      className={`rounded-xl border-2 px-3 py-2.5 text-left font-bold text-[13px] ${
                        cat === null ? 'bg-[#111] text-white border-[#111]' : 'bg-white border-[#E5E5EA]'
                      }`}>すべて</button>
              {CATEGORIES.map(c => (
                <button key={c.key} onClick={() => setCat(c.key === cat ? null : c.key)}
                        className={`rounded-xl border-2 px-3 py-2.5 text-left flex items-center justify-between ${
                          cat === c.key ? 'bg-[#111] text-white border-[#111]' : 'bg-white border-[#E5E5EA]'
                        }`}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: c.dot }} />
                    <div className="text-[13px] font-bold">{c.label}</div>
                  </div>
                  <div className={`text-[10px] ${cat === c.key ? 'text-white/70' : 'text-[#888]'}`}>{c.n}</div>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-4 mb-12 text-[12px] text-[var(--color-subtext)] leading-relaxed">
          <p className="mb-1"><b>👍 良いところ</b>: 「3週間前」「2ヶ月前」みたいな細かい指定がアナログ感覚で出来る</p>
          <p className="mb-1"><b>🤔 弱いところ</b>: 装飾的でかさ高い。実装も少し凝る。範囲指定は離散値のみ</p>
        </div>
      </div>
    </div>
  );
}
