'use client';

// 案4: セグメント + 縦リスト
// 上のセグメントコントロールで「地区/期間/カテゴリ」を切替。
// 選択中セクションは 大きな縦リストで 見やすく。

import Link from 'next/link';
import { useState } from 'react';
import { X, Check } from 'lucide-react';

type Sect = 'district' | 'period' | 'category';
const PERIODS = [
  { key: 'today', label: '本日',       n: 3   },
  { key: 'week',  label: '今週',       n: 12  },
  { key: 'last',  label: '先週',       n: 8   },
  { key: 'two',   label: '2 週間前',   n: 5   },
  { key: 'month', label: '1ヶ月以内',  n: 25  },
];
const CATEGORIES = [
  { key: 'unvisited', label: '未訪問',   dot: '#FF9500', n: 30 },
  { key: 'visited',   label: '訪問済み', dot: '#34C759', n: 12 },
  { key: 'met_self',  label: '本人会えた', dot: '#34C759', n: 5 },
  { key: 'met_fam',   label: '家族会えた', dot: '#34C759', n: 4 },
  { key: 'absent',    label: '不在',     dot: '#8E8E93', n: 3 },
];
const DISTRICTS = [
  { key: 'all',   label: 'すべて',  n: 96 },
  { key: 'young', label: 'ヤング',  n: 42 },
  { key: 'boys',  label: '男子部',  n: 54 },
];

export default function Page() {
  const [sect, setSect] = useState<Sect>('period');
  const [district, setDistrict] = useState<string | null>('young');
  const [period, setPeriod] = useState<string | null>('week');
  const [cat, setCat] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="px-4 pt-6 pb-3 max-w-md mx-auto">
        <Link href="/mock/filter-ui" className="text-xs text-[var(--color-subtext)] underline">← 一覧へ戻る</Link>
        <h1 className="text-xl font-bold mt-2">案4 セグメント + 縦リスト</h1>
        <p className="text-xs text-[var(--color-subtext)] mt-1">上タブで切替 → 大きな縦リストで選ぶ。1 セクションずつ集中。</p>
      </header>

      <div className="max-w-md mx-auto px-4">
        <div className="rounded-2xl border border-black/10 bg-white overflow-hidden shadow-sm">
          {/* ヘッダ + セグメント */}
          <div className="px-4 pt-3 pb-3 border-b border-black/5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-[15px]">フィルター ・ 42件</div>
              <button className="w-8 h-8 rounded-full flex items-center justify-center active:bg-[#F0F0F0]">
                <X size={18} className="text-[#666]" />
              </button>
            </div>
            <div className="flex gap-1 bg-[#F2F2F7] rounded-full p-1">
              {(['district','period','category'] as Sect[]).map(s => {
                const active = sect === s;
                const label = s === 'district' ? '地区' : s === 'period' ? '期間' : 'カテゴリ';
                const value = s === 'district'
                  ? DISTRICTS.find(d => d.key === district)?.label ?? null
                  : s === 'period'
                    ? PERIODS.find(p => p.key === period)?.label ?? null
                    : CATEGORIES.find(c => c.key === cat)?.label ?? null;
                return (
                  <button key={s} onClick={() => setSect(s)}
                          className={`flex-1 py-1.5 rounded-full flex flex-col items-center transition-colors ${active ? 'bg-white shadow-sm' : ''}`}>
                    <span className={`text-[12px] font-bold ${active ? 'text-[#111]' : 'text-[var(--color-subtext)]'}`}>{label}</span>
                    {value && <span className={`text-[10px] mt-0.5 ${active ? 'text-[#666]' : 'text-[var(--color-subtext)]/80'}`}>{value}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 選択中セクションの 縦リスト */}
          <div className="max-h-[420px] overflow-y-auto">
            {sect === 'district' && (
              <>
                {DISTRICTS.map(d => (
                  <button key={d.key} onClick={() => setDistrict(d.key === 'all' ? null : d.key)}
                          className="w-full flex items-center justify-between px-4 py-3.5 border-b border-black/5 active:bg-[#FAFAFA] text-left">
                    <div>
                      <div className="text-[14px] font-bold">{d.label}</div>
                      <div className="text-[10px] text-[var(--color-subtext)] mt-0.5">{d.n} 人</div>
                    </div>
                    {(district ?? 'all') === d.key && <Check size={20} className="text-[#111]" />}
                  </button>
                ))}
              </>
            )}
            {sect === 'period' && (
              <>
                <button onClick={() => setPeriod(null)}
                        className="w-full flex items-center justify-between px-4 py-3.5 border-b border-black/5 active:bg-[#FAFAFA] text-left">
                  <div className="text-[14px] font-bold">すべて</div>
                  {period === null && <Check size={20} className="text-[#111]" />}
                </button>
                {PERIODS.map(p => (
                  <button key={p.key} onClick={() => setPeriod(p.key === period ? null : p.key)}
                          className="w-full flex items-center justify-between px-4 py-3.5 border-b border-black/5 active:bg-[#FAFAFA] text-left">
                    <div>
                      <div className="text-[14px] font-bold">{p.label}</div>
                      <div className="text-[10px] text-[var(--color-subtext)] mt-0.5">{p.n} 人</div>
                    </div>
                    {period === p.key && <Check size={20} className="text-[#111]" />}
                  </button>
                ))}
              </>
            )}
            {sect === 'category' && (
              <>
                <button onClick={() => setCat(null)}
                        className="w-full flex items-center justify-between px-4 py-3.5 border-b border-black/5 active:bg-[#FAFAFA] text-left">
                  <div className="text-[14px] font-bold">すべて</div>
                  {cat === null && <Check size={20} className="text-[#111]" />}
                </button>
                {CATEGORIES.map(c => (
                  <button key={c.key} onClick={() => setCat(c.key === cat ? null : c.key)}
                          className="w-full flex items-center justify-between px-4 py-3.5 border-b border-black/5 active:bg-[#FAFAFA] text-left">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.dot }} />
                      <div>
                        <div className="text-[14px] font-bold">{c.label}</div>
                        <div className="text-[10px] text-[var(--color-subtext)] mt-0.5">{c.n} 人</div>
                      </div>
                    </div>
                    {cat === c.key && <Check size={20} className="text-[#111]" />}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="mt-4 mb-12 text-[12px] text-[var(--color-subtext)] leading-relaxed">
          <p className="mb-1"><b>👍 良いところ</b>: 1 つのセクションに集中できる。縦リストで超見やすい。設定アプリ風</p>
          <p className="mb-1"><b>🤔 弱いところ</b>: タブ切替の手間。「全項目同時に決めたい」時 ちょい不便</p>
        </div>
      </div>
    </div>
  );
}
