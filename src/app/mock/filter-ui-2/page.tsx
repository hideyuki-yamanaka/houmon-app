'use client';

// 案2: 横スクロールカルーセル
// 期間の選択肢を 太めの大カードで 横スクロール。1 件あたりが大きいので
// 視認性◎、Apple Music の プレイリスト風。カテゴリは下に縦リスト。

import Link from 'next/link';
import { useState } from 'react';
import { X, SlidersHorizontal, Check } from 'lucide-react';

const PERIODS = [
  { key: 'today', label: '本日',       icon: '☀', n: 3   },
  { key: 'week',  label: '今週',       icon: '📅', n: 12  },
  { key: 'last',  label: '先週',       icon: '🗓', n: 8   },
  { key: 'two',   label: '2 週間前',   icon: '📆', n: 5   },
  { key: 'month', label: '1ヶ月以内',  icon: '🌙', n: 25  },
];

const CATEGORIES = [
  { key: 'unvisited', label: '未訪問',   dot: '#FF9500', n: 30 },
  { key: 'visited',   label: '訪問済み', dot: '#34C759', n: 12 },
  { key: 'met_self',  label: '本人会えた', dot: '#34C759', n: 5 },
  { key: 'met_fam',   label: '家族会えた', dot: '#34C759', n: 4 },
  { key: 'absent',    label: '不在',     dot: '#8E8E93', n: 3 },
];

export default function Page() {
  const [period, setPeriod] = useState<string | null>('week');
  const [cat, setCat] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="px-4 pt-6 pb-3 max-w-md mx-auto">
        <Link href="/mock/filter-ui" className="text-xs text-[var(--color-subtext)] underline">← 一覧へ戻る</Link>
        <h1 className="text-xl font-bold mt-2">案2 横スクロールカルーセル</h1>
        <p className="text-xs text-[var(--color-subtext)] mt-1">期間は横スワイプで選ぶ。1 枚 1 枚がでかい。</p>
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

          {/* 期間 (横スクロール) */}
          <section className="py-4 border-b border-black/5">
            <h3 className="text-[11px] font-bold text-[var(--color-subtext)] tracking-wide mb-2.5 px-4">最終訪問からの期間</h3>
            <div className="flex gap-2.5 px-4 overflow-x-auto pb-1.5" style={{ scrollSnapType: 'x mandatory' }}>
              <button onClick={() => setPeriod(null)}
                      className={`shrink-0 w-28 rounded-2xl border-2 px-3 py-4 text-left transition-colors active:scale-[0.98] ${
                        period === null ? 'bg-[#111] text-white border-[#111]' : 'bg-white border-[#E5E5EA]'
                      }`}
                      style={{ scrollSnapAlign: 'start' }}>
                <div className="text-[28px] mb-1">🌐</div>
                <div className="text-[13px] font-bold">すべて</div>
                <div className={`text-[10px] mt-0.5 ${period === null ? 'text-white/70' : 'text-[var(--color-subtext)]'}`}>絞らない</div>
              </button>
              {PERIODS.map(p => (
                <button key={p.key}
                        onClick={() => setPeriod(p.key === period ? null : p.key)}
                        className={`shrink-0 w-28 rounded-2xl border-2 px-3 py-4 text-left transition-colors active:scale-[0.98] ${
                          period === p.key ? 'bg-[#111] text-white border-[#111]' : 'bg-white border-[#E5E5EA]'
                        }`}
                        style={{ scrollSnapAlign: 'start' }}>
                  <div className="text-[28px] mb-1">{p.icon}</div>
                  <div className="text-[13px] font-bold">{p.label}</div>
                  <div className={`text-[10px] mt-0.5 ${period === p.key ? 'text-white/70' : 'text-[var(--color-subtext)]'}`}>{p.n} 人</div>
                </button>
              ))}
            </div>
            <div className="text-center text-[10px] text-[var(--color-subtext)] mt-1.5">← スワイプで切替 →</div>
          </section>

          {/* カテゴリ (縦リスト) */}
          <section className="py-4">
            <h3 className="text-[11px] font-bold text-[var(--color-subtext)] tracking-wide mb-2 px-4">訪問カテゴリ</h3>
            <button onClick={() => setCat(null)}
                    className={`w-full flex items-center justify-between px-4 py-3 border-b border-black/5 active:bg-[#FAFAFA] ${cat === null ? 'bg-[#F8F8F8]' : ''}`}>
              <div className="text-[14px] font-bold">すべて</div>
              {cat === null && <Check size={18} className="text-[#111]" />}
            </button>
            {CATEGORIES.map(c => (
              <button key={c.key} onClick={() => setCat(c.key === cat ? null : c.key)}
                      className={`w-full flex items-center justify-between px-4 py-3 border-b border-black/5 active:bg-[#FAFAFA] ${cat === c.key ? 'bg-[#F8F8F8]' : ''}`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.dot }} />
                  <div className="text-[14px] font-bold">{c.label}</div>
                  <div className="text-[10px] text-[var(--color-subtext)] ml-1">{c.n} 人</div>
                </div>
                {cat === c.key && <Check size={18} className="text-[#111]" />}
              </button>
            ))}
          </section>
        </div>

        <div className="mt-4 mb-12 text-[12px] text-[var(--color-subtext)] leading-relaxed">
          <p className="mb-1"><b>👍 良いところ</b>: 期間の各選択肢が大きく見える。スワイプで選べる楽しさ</p>
          <p className="mb-1"><b>🤔 弱いところ</b>: 「すべての候補」を一目で見たい時に横スクロール必要</p>
        </div>
      </div>
    </div>
  );
}
