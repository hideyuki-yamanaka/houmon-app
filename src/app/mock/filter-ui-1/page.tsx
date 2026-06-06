'use client';

// 案1: 大きいタイルカード (2列)
// 期間/カテゴリの選択肢を 2 列の太めのカードにする。タップ領域でかい、
// 件数バッジが目に入る、選択中は太枠+背景塗りで明確。

import Link from 'next/link';
import { useState } from 'react';
import { X, SlidersHorizontal } from 'lucide-react';

const PERIODS = [
  { key: 'today', label: '本日',       sub: '今日訪問した人',    n: 3   },
  { key: 'week',  label: '今週',       sub: '7 日以内',         n: 12  },
  { key: 'last',  label: '先週',       sub: '8-14 日前',        n: 8   },
  { key: 'two',   label: '2 週間前',   sub: '15-21 日前',       n: 5   },
  { key: 'month', label: '1ヶ月以内',  sub: '30 日以内',        n: 25  },
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
  const [cat, setCat] = useState<string | null>('unvisited');

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="px-4 pt-6 pb-3 max-w-md mx-auto">
        <Link href="/mock/filter-ui" className="text-xs text-[var(--color-subtext)] underline">← 一覧へ戻る</Link>
        <h1 className="text-xl font-bold mt-2">案1 大きいタイルカード (2列)</h1>
        <p className="text-xs text-[var(--color-subtext)] mt-1">タップ領域でかめ、件数も同時に表示。指で触りやすい。</p>
      </header>

      <div className="max-w-md mx-auto px-4">
        <div className="rounded-2xl border border-black/10 bg-white overflow-hidden shadow-sm">
          {/* モーダルヘッダ */}
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

          {/* 期間 */}
          <section className="px-4 py-4 border-b border-black/5">
            <h3 className="text-[11px] font-bold text-[var(--color-subtext)] tracking-wide mb-2.5">最終訪問からの期間</h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setPeriod(null)}
                      className={`rounded-xl border-2 px-3 py-3 text-left transition-colors active:scale-[0.98] ${
                        period === null ? 'bg-[#111] text-white border-[#111]' : 'bg-white border-[#E5E5EA]'
                      }`}>
                <div className="text-[13px] font-bold">すべて</div>
                <div className={`text-[10px] mt-0.5 ${period === null ? 'text-white/70' : 'text-[var(--color-subtext)]'}`}>絞り込まない</div>
              </button>
              {PERIODS.map(p => (
                <button key={p.key}
                        onClick={() => setPeriod(p.key === period ? null : p.key)}
                        className={`rounded-xl border-2 px-3 py-3 text-left transition-colors active:scale-[0.98] flex items-start justify-between ${
                          period === p.key ? 'bg-[#111] text-white border-[#111]' : 'bg-white border-[#E5E5EA]'
                        }`}>
                  <div>
                    <div className="text-[13px] font-bold">{p.label}</div>
                    <div className={`text-[10px] mt-0.5 ${period === p.key ? 'text-white/70' : 'text-[var(--color-subtext)]'}`}>{p.sub}</div>
                  </div>
                  <div className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
                    period === p.key ? 'bg-white/20 text-white' : 'bg-[#F0F0F0] text-[#666]'
                  }`}>{p.n}</div>
                </button>
              ))}
            </div>
          </section>

          {/* カテゴリ */}
          <section className="px-4 py-4">
            <h3 className="text-[11px] font-bold text-[var(--color-subtext)] tracking-wide mb-2.5">訪問カテゴリ</h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setCat(null)}
                      className={`rounded-xl border-2 px-3 py-3 text-left transition-colors flex items-center justify-between ${
                        cat === null ? 'bg-[#111] text-white border-[#111]' : 'bg-white border-[#E5E5EA]'
                      }`}>
                <div className="text-[13px] font-bold">すべて</div>
              </button>
              {CATEGORIES.map(c => (
                <button key={c.key}
                        onClick={() => setCat(c.key === cat ? null : c.key)}
                        className={`rounded-xl border-2 px-3 py-3 text-left transition-colors flex items-center justify-between ${
                          cat === c.key ? 'bg-[#111] text-white border-[#111]' : 'bg-white border-[#E5E5EA]'
                        }`}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: c.dot }} />
                    <div className="text-[13px] font-bold">{c.label}</div>
                  </div>
                  <div className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
                    cat === c.key ? 'bg-white/20 text-white' : 'bg-[#F0F0F0] text-[#666]'
                  }`}>{c.n}</div>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-4 mb-12 text-[12px] text-[var(--color-subtext)] leading-relaxed">
          <p className="mb-1"><b>👍 良いところ</b>: タップ領域でかい・件数バッジで「ここ選んだら 0件」を防げる</p>
          <p className="mb-1"><b>🤔 弱いところ</b>: 縦に長くなる。期間が増えるとスクロールが必要</p>
        </div>
      </div>
    </div>
  );
}
