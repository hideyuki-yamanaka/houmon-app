'use client';

// 本物の FilterModal の chrome (ヘッダー + 地区 + カテゴリ) を再現するための
// 共通パーツ。各 v2 mock はこれを使って「期間セクション」だけ差し替えで提案する。

import { useState, type ReactNode } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';

// 実データ ─ 本部 (constants.ts ORG_TREE と同じ)
// ヤング タブ想定で 各 honbu の ヤング人数を入れる
export const REAL_HONBUS = [
  { key: '東旭川本部', short: '東旭川', n: 6 },
  { key: '豊岡本部',   short: '豊岡',   n: 22 },
  { key: '旭創価本部', short: '旭創価', n: 5 },
  { key: '東栄本部',   short: '東栄',   n: 9 },
];

// 実データ ─ 訪問カテゴリ (VISIT_STATUS_CONFIG の正確なラベル & 色)
// 「いける人」タブ想定でフィルタしてある
export const REAL_CATEGORIES_GO = [
  { key: 'visited',    label: '訪問済み',    dot: '#34C759', n: 12 },
  { key: 'unvisited',  label: '未訪問',     dot: '#FF9500', n: 30 },
  { key: 'met_self',   label: '本人に会えた', dot: '#34C759', n: 5  },
  { key: 'met_family', label: '家族に会えた', dot: '#34C759', n: 4  },
  { key: 'absent',     label: '不在',       dot: '#8E8E93', n: 3  },
];

// ヘッダー (本物の FilterModal と同じ)
export function FilterHeader({ count }: { count: number }) {
  return (
    <div className="px-4 py-3 border-b border-black/5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <SlidersHorizontal size={18} className="text-[#666]" />
        <div className="font-bold text-[15px]">フィルター</div>
        <div className="text-[11px] text-[var(--color-subtext)] ml-1">{count}件</div>
      </div>
      <button className="w-8 h-8 rounded-full flex items-center justify-center active:bg-[#F0F0F0]">
        <X size={18} className="text-[#666]" />
      </button>
    </div>
  );
}

// 地区セクション (本物の DistrictFilter を簡略再現)
export function DistrictSection({
  honbu,
  onHonbuChange,
  bu,
  onBuChange,
}: {
  honbu: string | null;
  onHonbuChange: (key: string | null) => void;
  bu: string | null;
  onBuChange: (key: string | null) => void;
}) {
  // 豊岡本部だけ部一覧を出す (実際の ORG_TREE と同じ)
  const bus = honbu === '豊岡本部'
    ? [
        { key: '豊岡部',       short: '豊岡部',   n: 9 },
        { key: '光陽部',       short: '光陽部',   n: 7 },
        { key: '豊岡中央支部', short: '中央',     n: 6 },
      ]
    : [];
  return (
    <section className="px-4 py-3.5 border-b border-black/5">
      <h3 className="text-[11px] font-bold text-[var(--color-subtext)] tracking-wide mb-2">地区</h3>
      <div className="flex gap-1.5 bg-[#F2F2F7] rounded-full p-1 mb-2">
        <button
          onClick={() => { onHonbuChange(null); onBuChange(null); }}
          className={`flex-1 py-1 rounded-full text-[12px] font-bold transition-colors ${
            honbu === null ? 'bg-white shadow-sm text-[#111]' : 'text-[var(--color-subtext)]'
          }`}
        >すべて(96)</button>
        <button
          className={`flex-1 py-1 rounded-full text-[12px] font-bold transition-colors bg-white shadow-sm text-[#111]`}
        >ヤング(42)</button>
        <button
          className={`flex-1 py-1 rounded-full text-[12px] font-bold transition-colors text-[var(--color-subtext)]`}
        >男子部(54)</button>
      </div>
      <div className="flex items-center gap-2 text-[11px]">
        <span className="text-[var(--color-subtext)] shrink-0">本部:</span>
        <div className="flex gap-2 overflow-x-auto">
          {REAL_HONBUS.map(h => (
            <button
              key={h.key}
              onClick={() => { onHonbuChange(h.key === honbu ? null : h.key); onBuChange(null); }}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                honbu === h.key ? 'bg-[#111] text-white' : 'text-[#222] bg-white border border-[#E5E5EA]'
              }`}
            >{h.short}({h.n})</button>
          ))}
        </div>
      </div>
      {bus.length > 0 && (
        <div className="flex items-center gap-2 text-[11px] mt-2">
          <span className="text-[var(--color-subtext)] shrink-0">部:</span>
          <div className="flex gap-2 overflow-x-auto">
            {bus.map(b => (
              <button
                key={b.key}
                onClick={() => onBuChange(b.key === bu ? null : b.key)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                  bu === b.key ? 'bg-[#111] text-white' : 'text-[#222] bg-white border border-[#E5E5EA]'
                }`}
              >{b.short}({b.n})</button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

// カテゴリセクション (実データ + 動的にタブによって絞ったもの。
// ここでは いける人 タブ想定で 5 カテゴリ表示。)
export function CategorySection({
  cat,
  onCatChange,
}: {
  cat: string | null;
  onCatChange: (key: string | null) => void;
}) {
  return (
    <section className="px-4 py-3.5">
      <h3 className="text-[11px] font-bold text-[var(--color-subtext)] tracking-wide mb-2">カテゴリ</h3>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => onCatChange(null)}
          className={`px-3 py-1.5 text-[12px] rounded-full border transition-colors ${
            cat === null ? 'bg-[#222] text-white border-[#222]' : 'bg-white text-[#222] border-[#E5E5EA]'
          }`}
        >すべて</button>
        {REAL_CATEGORIES_GO.map(c => (
          <button
            key={c.key}
            onClick={() => onCatChange(c.key === cat ? null : c.key)}
            className={`px-3 py-1.5 text-[12px] rounded-full border transition-colors inline-flex items-center gap-1.5 ${
              cat === c.key ? 'bg-[#222] text-white border-[#222]' : 'bg-white text-[#222] border-[#E5E5EA]'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
            {c.label}
          </button>
        ))}
      </div>
    </section>
  );
}

// 共通 chrome ラッパ。期間部分を children に差し替える。
export function FilterChrome({ count, periodSection }: { count: number; periodSection: ReactNode }) {
  const [honbu, setHonbu] = useState<string | null>(null);
  const [bu, setBu] = useState<string | null>(null);
  const [cat, setCat] = useState<string | null>(null);
  return (
    <div className="rounded-2xl border border-black/10 bg-white overflow-hidden shadow-sm">
      <FilterHeader count={count} />
      <DistrictSection honbu={honbu} onHonbuChange={setHonbu} bu={bu} onBuChange={setBu} />
      {periodSection}
      <CategorySection cat={cat} onCatChange={setCat} />
    </div>
  );
}
