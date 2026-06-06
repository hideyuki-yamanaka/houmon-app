'use client';

// 案10: 期間カード一覧 (Booking 風)
// Booking.com の「最近の検索」/「最近見たプロパティ」風。
// 「本日 (3人)」「今週 (12人)」みたいなカードを縦に並べる。
// 各カードに代表アバター + 件数 + 平均訪問日 などの情報を載せる。

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { FilterChrome } from '../filter-ui-v2/_realChrome';

const HONBU_COLORS: Record<string, string> = {
  東旭川: '#FF3B30', 豊岡: '#FF9500', 旭創価: '#34C759', 東栄: '#5AC8FA',
};

type Bucket = {
  key: string;
  label: string;
  sub: string;
  n: number;
  honbuMix: { honbu: keyof typeof HONBU_COLORS; n: number }[];
};

const BUCKETS: Bucket[] = [
  { key: 'today', label: '本日',     sub: '今日 訪問した人', n: 3,
    honbuMix: [{ honbu: '豊岡', n: 2 }, { honbu: '東旭川', n: 1 }] },
  { key: 'week',  label: '今週',     sub: '過去 7 日以内',   n: 12,
    honbuMix: [{ honbu: '豊岡', n: 7 }, { honbu: '東旭川', n: 2 }, { honbu: '旭創価', n: 2 }, { honbu: '東栄', n: 1 }] },
  { key: 'last',  label: '先週',     sub: '8〜14 日前',      n: 8,
    honbuMix: [{ honbu: '豊岡', n: 4 }, { honbu: '東旭川', n: 2 }, { honbu: '東栄', n: 2 }] },
  { key: 'two',   label: '2週間前',  sub: '15〜21 日前',     n: 5,
    honbuMix: [{ honbu: '豊岡', n: 3 }, { honbu: '東旭川', n: 1 }, { honbu: '旭創価', n: 1 }] },
  { key: 'month', label: '1ヶ月以内', sub: '過去 30 日',     n: 25,
    honbuMix: [{ honbu: '豊岡', n: 15 }, { honbu: '東旭川', n: 5 }, { honbu: '旭創価', n: 3 }, { honbu: '東栄', n: 2 }] },
];

function PeriodSection({
  selected,
  onSelectedChange,
}: {
  selected: string | null;
  onSelectedChange: (k: string | null) => void;
}) {
  return (
    <section className="px-4 py-3.5 border-b border-black/5">
      <div className="flex items-baseline justify-between mb-2.5">
        <h3 className="text-[11px] font-bold text-[var(--color-subtext)] tracking-wide">最終訪問からの期間</h3>
        <button onClick={() => onSelectedChange(null)} className="text-[10px] text-[#4A90C2] font-bold">クリア</button>
      </div>

      <div className="flex flex-col gap-1.5">
        {BUCKETS.map(b => {
          const active = selected === b.key;
          const totalMix = b.honbuMix.reduce((a, x) => a + x.n, 0);
          return (
            <button
              key={b.key}
              onClick={() => onSelectedChange(active ? null : b.key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-colors text-left ${
                active ? 'bg-[#FFF8E1] border-[#FF9500]' : 'bg-white border-[#E5E5EA] active:bg-[#FAFAFA]'
              }`}>
              {/* 左 数字 */}
              <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                active ? 'bg-[#FF9500] text-white' : 'bg-[#F0F0F0] text-[#222]'
              }`}>
                <div className="text-[14px] font-extrabold leading-none">{b.n}</div>
                <div className="text-[7px] font-bold leading-none mt-0.5">人</div>
              </div>
              {/* 中央 ラベル */}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold">{b.label}</div>
                <div className="text-[10px] text-[var(--color-subtext)] mt-0.5">{b.sub}</div>
                {/* 本部分布 (横バー) */}
                <div className="flex h-1 mt-1.5 rounded-full overflow-hidden bg-[#F0F0F0]">
                  {b.honbuMix.map((h, i) => (
                    <div
                      key={i}
                      style={{
                        background: HONBU_COLORS[h.honbu],
                        width: `${(h.n / totalMix) * 100}%`,
                      }}
                    />
                  ))}
                </div>
              </div>
              {/* 右 矢印 */}
              <ArrowRight size={14} className={active ? 'text-[#FF9500]' : 'text-[#bbb]'} />
            </button>
          );
        })}
      </div>

      {/* 凡例 */}
      <div className="mt-2.5 flex items-center justify-center gap-3 text-[9px] text-[var(--color-subtext)]">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-[#FF3B30]" /><span>東旭川</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-[#FF9500]" /><span>豊岡</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-[#34C759]" /><span>旭創価</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-[#5AC8FA]" /><span>東栄</span>
        </div>
      </div>
    </section>
  );
}

export default function Page() {
  const [sel, setSel] = useState<string | null>('week');

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="px-4 pt-6 pb-3 max-w-md mx-auto">
        <Link href="/mock/filter-ui-v2" className="text-xs text-[var(--color-subtext)] underline">← 一覧へ戻る</Link>
        <h1 className="text-xl font-bold mt-2">案10 期間カード一覧 (Booking 風)</h1>
        <p className="text-xs text-[var(--color-subtext)] mt-1">
          Booking.com の「最近の検索」風。期間ごとに 件数 + 本部分布 (横バー)
          を見せて「ここ選んだら何人 × どの本部偏ってる」が一目でわかる。
        </p>
      </header>

      <div className="max-w-md mx-auto px-4">
        <FilterChrome
          count={BUCKETS.find(b => b.key === sel)?.n ?? 42}
          periodSection={<PeriodSection selected={sel} onSelectedChange={setSel} />}
        />

        <div className="mt-4 mb-12 text-[12px] text-[var(--color-subtext)] leading-relaxed">
          <p className="mb-1"><b>👍 良いところ</b>: 件数 + 本部分布が並ぶ。「先週は豊岡多めだな」みたいな気づき</p>
          <p className="mb-1"><b>🤔 弱いところ</b>: 縦に長め。範囲指定 (例: 今週〜2週間前) は できない、単独選択のみ</p>
        </div>
      </div>
    </div>
  );
}
