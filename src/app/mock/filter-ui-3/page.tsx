'use client';

// 案3: アコーディオン
// セクションごとに 折りたためる。デフォルトは「期間」だけ展開、他は閉。
// 選択中の値がヘッダーにバッジで出るので 閉じてても見える。

import Link from 'next/link';
import { useState } from 'react';
import { X, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';

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

export default function Page() {
  const [openSect, setOpenSect] = useState<'district' | 'period' | 'category' | null>('period');
  const [district, setDistrict] = useState<string | null>('ヤング');
  const [period, setPeriod] = useState<string | null>('week');
  const [cat, setCat] = useState<string | null>(null);

  const Section = ({ id, title, value, children }: { id: 'district'|'period'|'category'; title: string; value: string; children: React.ReactNode }) => {
    const isOpen = openSect === id;
    return (
      <div className="border-b border-black/5">
        <button onClick={() => setOpenSect(isOpen ? null : id)}
                className="w-full flex items-center justify-between px-4 py-3.5 active:bg-[#FAFAFA]">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold">{title}</span>
            {value && (
              <span className="text-[11px] font-bold bg-[#111] text-white rounded-full px-2 py-0.5">{value}</span>
            )}
          </div>
          {isOpen ? <ChevronUp size={18} className="text-[#999]" /> : <ChevronDown size={18} className="text-[#999]" />}
        </button>
        {isOpen && <div className="px-4 pb-4">{children}</div>}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="px-4 pt-6 pb-3 max-w-md mx-auto">
        <Link href="/mock/filter-ui" className="text-xs text-[var(--color-subtext)] underline">← 一覧へ戻る</Link>
        <h1 className="text-xl font-bold mt-2">案3 アコーディオン</h1>
        <p className="text-xs text-[var(--color-subtext)] mt-1">選択中だけ展開。閉じててもヘッダーに選択値バッジ。縦に短い。</p>
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

          <Section id="district" title="地区" value={district ?? ''}>
            <div className="flex gap-2 flex-wrap">
              {['すべて', 'ヤング', '男子部'].map(d => (
                <button key={d} onClick={() => setDistrict(d === 'すべて' ? null : d)}
                        className={`px-3 py-1.5 rounded-full text-[12px] font-bold ${
                          (district ?? 'すべて') === d ? 'bg-[#111] text-white' : 'bg-[#F2F2F7] text-[#333]'
                        }`}>{d}</button>
              ))}
            </div>
          </Section>

          <Section id="period" title="最終訪問からの期間" value={PERIODS.find(p => p.key === period)?.label ?? ''}>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setPeriod(null)}
                      className={`rounded-lg px-3 py-2.5 text-left font-bold text-[13px] ${
                        period === null ? 'bg-[#111] text-white' : 'bg-[#F2F2F7] text-[#333]'
                      }`}>すべて</button>
              {PERIODS.map(p => (
                <button key={p.key} onClick={() => setPeriod(p.key === period ? null : p.key)}
                        className={`rounded-lg px-3 py-2.5 text-left flex items-center justify-between ${
                          period === p.key ? 'bg-[#111] text-white' : 'bg-[#F2F2F7] text-[#333]'
                        }`}>
                  <span className="font-bold text-[13px]">{p.label}</span>
                  <span className={`text-[10px] ${period === p.key ? 'text-white/70' : 'text-[#888]'}`}>{p.n}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section id="category" title="訪問カテゴリ" value={CATEGORIES.find(c => c.key === cat)?.label ?? ''}>
            <div className="flex flex-col gap-1">
              {CATEGORIES.map(c => (
                <button key={c.key} onClick={() => setCat(c.key === cat ? null : c.key)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${
                          cat === c.key ? 'bg-[#111] text-white' : 'bg-white'
                        }`}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: c.dot }} />
                    <span className="font-bold text-[13px]">{c.label}</span>
                  </div>
                  <span className={`text-[10px] ${cat === c.key ? 'text-white/70' : 'text-[#888]'}`}>{c.n}</span>
                </button>
              ))}
            </div>
          </Section>
        </div>

        <div className="mt-4 mb-12 text-[12px] text-[var(--color-subtext)] leading-relaxed">
          <p className="mb-1"><b>👍 良いところ</b>: 画面が縦に短くなる。選択中だけ集中して見える</p>
          <p className="mb-1"><b>🤔 弱いところ</b>: 開閉の操作が 1 ステップ増える。「全部見渡したい」時に不便</p>
        </div>
      </div>
    </div>
  );
}
