'use client';

import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

const PERIODS = [
  { key: 'all', label: 'すべて' },
  { key: 'this_week', label: '今週' },
  { key: 'last_week', label: '先週' },
  { key: 'two_weeks', label: '2週間前' },
  { key: 'one_month', label: '1ヶ月' },
];

export default function PrototypePage() {
  const [a, setA] = useState('all');
  const [b, setB] = useState('all');
  const [c, setC] = useState('all');
  const [bOpen, setBOpen] = useState(false);

  return (
    <div className="min-h-full bg-[var(--color-bg)] p-4 pb-24">
      <h1 className="text-xl font-bold mb-6">期間フィルター UI 3案</h1>

      {/* 案A: iOS風セグメントコントロール */}
      <section className="mb-8">
        <div className="text-xs font-bold text-[var(--color-subtext)] mb-2">
          案A：iOS風セグメントコントロール
        </div>
        <div className="bg-[#EFEFF4] rounded-lg p-1 flex gap-1">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setA(p.key)}
              className={`flex-1 py-1.5 text-[12px] font-medium rounded-md transition-all whitespace-nowrap ${
                a === p.key
                  ? 'bg-white text-[var(--color-text)] shadow-sm'
                  : 'text-[var(--color-subtext)]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-2 text-[11px] text-[var(--color-subtext)]">選択中: {PERIODS.find(p => p.key === a)?.label}</div>
      </section>

      {/* 案B: ドロップダウン */}
      <section className="mb-8">
        <div className="text-xs font-bold text-[var(--color-subtext)] mb-2">
          案B：ドロップダウン
        </div>
        <div className="relative inline-block">
          <button
            onClick={() => setBOpen(!bOpen)}
            className="flex items-center gap-2 px-3 h-9 rounded-lg bg-white border border-[#E5E5EA] text-sm font-medium"
          >
            <Calendar size={16} className="text-[var(--color-subtext)]" />
            <span>期間：{PERIODS.find(p => p.key === b)?.label}</span>
            <ChevronDown size={14} className={`text-[var(--color-subtext)] transition-transform ${bOpen ? 'rotate-180' : ''}`} />
          </button>
          {bOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg z-10 overflow-hidden min-w-[140px]">
              {PERIODS.map(p => (
                <button
                  key={p.key}
                  onClick={() => { setB(p.key); setBOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm ${
                    b === p.key ? 'bg-[#F0F0F0] font-bold' : ''
                  } active:bg-[#E8E8E8] border-b border-[#F0F0F0] last:border-b-0`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 案C: カレンダーアイコン + 下線タブ */}
      <section className="mb-8">
        <div className="text-xs font-bold text-[var(--color-subtext)] mb-2">
          案C：アイコン + 下線タブ
        </div>
        <div className="flex items-center gap-3 border-b border-[#E5E5EA]">
          <Calendar size={16} className="text-[var(--color-subtext)] shrink-0" />
          <div className="flex gap-4 overflow-x-auto no-scrollbar">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setC(p.key)}
                className={`py-2 text-[13px] whitespace-nowrap transition-colors relative ${
                  c === p.key
                    ? 'text-[var(--color-text)] font-bold'
                    : 'text-[var(--color-subtext)]'
                }`}
              >
                {p.label}
                {c === p.key && (
                  <div className="absolute left-0 right-0 -bottom-px h-0.5 bg-[var(--color-text)]" />
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 text-[11px] text-[var(--color-subtext)]">選択中: {PERIODS.find(p => p.key === c)?.label}</div>
      </section>

      {/* 比較用: 現在の地区チップ */}
      <section className="mt-12 pt-6 border-t border-[#E5E5EA]">
        <div className="text-xs font-bold text-[var(--color-subtext)] mb-2">
          参考：現在の地区チップ（丸）
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          <button className="chip selected whitespace-nowrap">すべて</button>
          <button className="chip whitespace-nowrap">英雄</button>
          <button className="chip whitespace-nowrap">香城</button>
          <button className="chip whitespace-nowrap">正義</button>
          <button className="chip whitespace-nowrap">光陽</button>
        </div>
      </section>
    </div>
  );
}
