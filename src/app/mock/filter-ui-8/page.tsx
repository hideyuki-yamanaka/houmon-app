'use client';

// 案8: プリセット + 詳細展開
// Airbnb の日付ピッカー風。大きいプリセットチップ (5 候補) で素早く決め、
// 「詳細」をタップするとカスタム範囲指定がスッと展開。99% の操作は
// プリセットで終わり、残りの 1% に「詳細」で深掘り。

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { FilterChrome } from '../filter-ui-v2/_realChrome';

type Preset = { key: string; label: string; sub: string; n: number };
const PRESETS: Preset[] = [
  { key: 'today',     label: '本日',       sub: '今日 訪問した人',         n: 3   },
  { key: 'this_week', label: '今週',       sub: '過去 7 日以内',           n: 12  },
  { key: 'last_week', label: '先週',       sub: '8〜14 日前',              n: 8   },
  { key: 'two_weeks', label: '2 週間前',   sub: '15〜21 日前',             n: 5   },
  { key: 'one_month', label: '1ヶ月以内',  sub: '過去 30 日以内 (まとめ)',  n: 25  },
];

function PeriodSection({
  preset, onPresetChange,
  detailOpen, setDetailOpen,
  customMinDays, customMaxDays, onCustomChange,
}: {
  preset: string | null;
  onPresetChange: (k: string | null) => void;
  detailOpen: boolean;
  setDetailOpen: (b: boolean) => void;
  customMinDays: number;
  customMaxDays: number;
  onCustomChange: (lo: number, hi: number) => void;
}) {
  const selected = PRESETS.find(p => p.key === preset);

  return (
    <section className="px-4 py-3.5 border-b border-black/5">
      <div className="flex items-baseline justify-between mb-2.5">
        <h3 className="text-[11px] font-bold text-[var(--color-subtext)] tracking-wide">最終訪問からの期間</h3>
        {selected && <span className="text-[10px] text-[var(--color-subtext)]">{selected.n} 人</span>}
      </div>

      {/* プリセット大型カード (2列) */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          onClick={() => onPresetChange(null)}
          className={`rounded-xl border-2 px-3 py-2.5 text-left transition-colors ${
            preset === null ? 'bg-[#111] text-white border-[#111]' : 'bg-white border-[#E5E5EA]'
          }`}>
          <div className="text-[13px] font-bold">すべて</div>
          <div className={`text-[10px] mt-0.5 ${preset === null ? 'text-white/70' : 'text-[var(--color-subtext)]'}`}>絞らない</div>
        </button>
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => onPresetChange(p.key === preset ? null : p.key)}
            className={`rounded-xl border-2 px-3 py-2.5 text-left transition-colors flex items-start justify-between ${
              preset === p.key ? 'bg-[#111] text-white border-[#111]' : 'bg-white border-[#E5E5EA]'
            }`}>
            <div>
              <div className="text-[13px] font-bold">{p.label}</div>
              <div className={`text-[10px] mt-0.5 ${preset === p.key ? 'text-white/70' : 'text-[var(--color-subtext)]'}`}>{p.sub}</div>
            </div>
            <div className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 shrink-0 ${
              preset === p.key ? 'bg-white/20 text-white' : 'bg-[#F0F0F0] text-[#666]'
            }`}>{p.n}</div>
          </button>
        ))}
      </div>

      {/* 詳細トグル */}
      <button
        onClick={() => setDetailOpen(!detailOpen)}
        className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#FAFAFA] border border-black/5 active:bg-[#F0F0F0]">
        <span className="text-[12px] font-bold text-[#4A90C2]">詳細範囲を指定</span>
        {detailOpen ? <ChevronUp size={14} className="text-[#4A90C2]" /> : <ChevronDown size={14} className="text-[#4A90C2]" />}
      </button>

      {detailOpen && (
        <div className="mt-2 rounded-xl bg-[#F8FBFD] border border-[#5AC8FA]/20 px-3 py-3">
          <div className="text-[11px] text-[var(--color-subtext)] mb-2">最終訪問から <b className="text-[#222]">{customMinDays}日</b> 以上 <b className="text-[#222]">{customMaxDays}日</b> 以下</div>
          {/* min/max 2 つの数値入力 */}
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <div className="text-[10px] text-[var(--color-subtext)] mb-1 font-semibold">最小 (日)</div>
              <input
                type="number" min={0} max={365} value={customMinDays}
                onChange={(e) => onCustomChange(Math.max(0, parseInt(e.target.value) || 0), customMaxDays)}
                className="w-full bg-white border border-[#E5E5EA] rounded-lg px-3 py-2 text-[14px] font-bold"
              />
            </label>
            <label className="block">
              <div className="text-[10px] text-[var(--color-subtext)] mb-1 font-semibold">最大 (日)</div>
              <input
                type="number" min={0} max={365} value={customMaxDays}
                onChange={(e) => onCustomChange(customMinDays, parseInt(e.target.value) || 365)}
                className="w-full bg-white border border-[#E5E5EA] rounded-lg px-3 py-2 text-[14px] font-bold"
              />
            </label>
          </div>
        </div>
      )}
    </section>
  );
}

export default function Page() {
  const [preset, setPreset] = useState<string | null>('this_week');
  const [detailOpen, setDetailOpen] = useState(false);
  const [customMin, setCustomMin] = useState(0);
  const [customMax, setCustomMax] = useState(7);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="px-4 pt-6 pb-3 max-w-md mx-auto">
        <Link href="/mock/filter-ui-v2" className="text-xs text-[var(--color-subtext)] underline">← 一覧へ戻る</Link>
        <h1 className="text-xl font-bold mt-2">案8 プリセット + 詳細展開</h1>
        <p className="text-xs text-[var(--color-subtext)] mt-1">
          Airbnb の日付ピッカー風。99% はプリセット 1 タップで終わり、
          細かく指定したい時だけ「詳細」をタップ。
        </p>
      </header>

      <div className="max-w-md mx-auto px-4">
        <FilterChrome
          count={12}
          periodSection={
            <PeriodSection
              preset={preset} onPresetChange={setPreset}
              detailOpen={detailOpen} setDetailOpen={setDetailOpen}
              customMinDays={customMin} customMaxDays={customMax}
              onCustomChange={(lo, hi) => { setCustomMin(lo); setCustomMax(hi); }}
            />
          }
        />

        <div className="mt-4 mb-12 text-[12px] text-[var(--color-subtext)] leading-relaxed">
          <p className="mb-1"><b>👍 良いところ</b>: 9 割の操作が 1 タップで終わる。学習コストほぼゼロ。詳細指定もある</p>
          <p className="mb-1"><b>🤔 弱いところ</b>: 数値入力は地味。詳細展開しても 「いつ訪問したか」のビジュアル感がない</p>
        </div>
      </div>
    </div>
  );
}
