'use client';

// ──────────────────────────────────────────────────────────────
// ダッシュボード フィルタ アニメ A案ベース + バー伸び 5バリエーション
//
// ヒデさん指示 (2026-05-04):
//   フィルタアニメは A (ロールアップ) ベース。バーグラフにも伸びてくる
//   アニメを乗せて 比較プレビューを見たい。
//
// 数字: 全案 共通でロールアップ (0 → target を 600ms ease-out cubic).
// バー: 5パターンで伸び方を変える。
//
// 案: 1. シンプル 横ストレッチ (一斉 600ms ease-out)
//     2. スタッガー (上から順に 50ms ずつ遅延、波)
//     3. スプリング バウンス (オーバーシュート気味)
//     4. 数字も一緒にカウントアップ (バー脇の数字も rollup)
//     5. 下からスライド + ストレッチ (translateY + width 同時)
// ──────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, RefreshCw } from 'lucide-react';

// ── サンプルデータ (フィルタ前後 2 セット) ──────────────────
type Snap = {
  hero: number;
  bars: { label: string; count: number }[];
  blocks: { label: string; n: number; cls: string }[];
};

const SNAP_A: Snap = {
  hero: 142,
  bars: [
    { label: '今週',   count: 18 },
    { label: '先週',   count: 12 },
    { label: '2週間前', count: 20 },
    { label: '3週間前', count: 6 },
    { label: '4週間前', count: 14 },
    { label: '5週間前', count: 9 },
  ],
  blocks: [
    { label: '本人◎', n: 71, cls: 'bg-emerald-100 text-emerald-700' },
    { label: '家族◎', n: 28, cls: 'bg-emerald-50  text-emerald-600' },
    { label: '不在他', n: 43, cls: 'bg-gray-100   text-gray-700' },
  ],
};
const SNAP_B: Snap = {
  hero: 56,
  bars: [
    { label: '今週',   count: 7 },
    { label: '先週',   count: 5 },
    { label: '2週間前', count: 9 },
    { label: '3週間前', count: 3 },
    { label: '4週間前', count: 6 },
    { label: '5週間前', count: 2 },
  ],
  blocks: [
    { label: '本人◎', n: 28, cls: 'bg-emerald-100 text-emerald-700' },
    { label: '家族◎', n: 11, cls: 'bg-emerald-50  text-emerald-600' },
    { label: '不在他', n: 17, cls: 'bg-gray-100   text-gray-700' },
  ],
};

type BarStyle = 'simple' | 'stagger' | 'spring' | 'rollupVal' | 'slideStretch';

// ──────────────────────────────────────────────────────────────
export default function Page() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-12">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-black/5">
        <div className="max-w-[640px] mx-auto flex items-center px-2 py-2">
          <Link href="/" className="flex items-center gap-1 text-[15px] text-[var(--color-primary)] active:opacity-60 px-2 py-1">
            <ChevronLeft size={20} />戻る
          </Link>
          <h1 className="flex-1 text-center text-[16px] font-semibold pr-12">
            ロールアップ + バー伸び 5案
          </h1>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-3 py-4 space-y-6">
        <p className="text-[12px] text-[var(--color-subtext)] leading-relaxed">
          数字は全案 ロールアップ (A 案) ベース。バーの伸び方だけ 5 パターン違う。
          <br />
          ボタンで 全員 (142件) ⇄ 1人 (56件) を切替。
        </p>

        <V letter="1" title="シンプル 横ストレッチ" desc="全バー同時に width を 600ms ease-out で伸ばす。落ち着き。">
          <Mini barStyle="simple" />
        </V>

        <V letter="2" title="スタッガー (波)" desc="上から順に 60ms ずつ遅延。波打つように見える。リッチ。">
          <Mini barStyle="stagger" />
        </V>

        <V letter="3" title="スプリング バウンス" desc="やや オーバーシュート → 戻る。生命感ある (cubic-bezier overshoot)。">
          <Mini barStyle="spring" />
        </V>

        <V letter="4" title="バー脇の数字もカウントアップ" desc="ロールアップしながら数字もカチカチ。情報密度高い。">
          <Mini barStyle="rollupVal" />
        </V>

        <V letter="5" title="下からスライド + ストレッチ" desc="バーが下から上がりつつ width も伸びる。1番動きが大きい。">
          <Mini barStyle="slideStretch" />
        </V>
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
function V({ letter, title, desc, children }: {
  letter: string; title: string; desc: string; children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-black/5">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold w-6 h-6 rounded-full bg-[#111] text-white inline-flex items-center justify-center">{letter}</span>
          <h2 className="text-[13px] font-semibold flex-1">{title}</h2>
        </div>
        <p className="text-[11px] text-[var(--color-subtext)] mt-1 ml-8">{desc}</p>
      </div>
      <div className="bg-[var(--color-bg)] p-3">{children}</div>
    </section>
  );
}

// ── ミニダッシュボード ───────────────────────────────────────
function Mini({ barStyle }: { barStyle: BarStyle }) {
  const [snap, setSnap] = useState<'A' | 'B'>('A');
  const data = snap === 'A' ? SNAP_A : SNAP_B;
  return (
    <div className="space-y-3">
      <button
        onClick={() => setSnap(s => s === 'A' ? 'B' : 'A')}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#111] text-white text-[12px] font-bold active:scale-95"
      >
        <RefreshCw size={12} />
        フィルタ切替 ({snap === 'A' ? '全員 → 1人' : '1人 → 全員'})
      </button>

      <div className="bg-white rounded-xl p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-[14px] font-bold leading-tight">家庭訪問の回数</h3>
            <p className="text-[10px] text-[var(--color-subtext)] mt-0.5">直近6週分</p>
          </div>
          <div className="flex items-baseline gap-1">
            <RollupNum value={data.hero} className="text-[36px] font-extrabold tabular-nums leading-none text-[#111] tracking-tight" />
            <span className="text-[12px] font-bold">回</span>
          </div>
        </div>
        <Bars bars={data.bars} barStyle={barStyle} snap={snap} />
      </div>

      <div className="bg-white rounded-xl p-4">
        <h3 className="text-[14px] font-bold mb-2">訪問ログ内訳</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          {data.blocks.map((b, i) => (
            <div key={i} className={`rounded-lg py-2 ${b.cls.split(' ')[0]}`}>
              <RollupNum value={b.n} className={`text-[18px] font-bold ${b.cls.split(' ')[1]}`} />
              <div className={`text-[10px] ${b.cls.split(' ')[1]}`}>{b.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// RollupNum: 0 → target を 600ms で補間 (ease-out cubic) — A案ベース
// ──────────────────────────────────────────────────────────────
function RollupNum({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const start = prev.current;
    const target = value;
    if (start === target) { setDisplay(target); return; }
    const dur = 600;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + (target - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    prev.current = target;
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className}>{display}</span>;
}

// ──────────────────────────────────────────────────────────────
// Bars: バーの伸びアニメ (5 パターン)
// ──────────────────────────────────────────────────────────────
function Bars({ bars, barStyle, snap }: {
  bars: { label: string; count: number }[]; barStyle: BarStyle; snap: 'A' | 'B';
}) {
  const max = Math.max(1, ...bars.map(b => b.count));
  // snap が変わるたびに key を変えて再マウント → 0 から伸びる
  return (
    <div key={`${snap}-${barStyle}`} className="space-y-2">
      {bars.map((b, i) => (
        <BarRow key={`${b.label}-${i}`}
          label={b.label}
          count={b.count}
          max={max}
          index={i}
          barStyle={barStyle}
        />
      ))}
      <style jsx>{`
        @keyframes stretchSimple {
          from { width: 0%; }
        }
        @keyframes stretchStagger {
          from { width: 0%; opacity: 0.4; }
          to   { opacity: 1; }
        }
        @keyframes stretchSlide {
          from { width: 0%; transform: translateY(8px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function BarRow({ label, count, max, index, barStyle }: {
  label: string; count: number; max: number; index: number; barStyle: BarStyle;
}) {
  const widthPct = count > 0 ? Math.max(8, (count / max) * 100) : 4;

  // バー部分のスタイル決定
  let barStyleObj: React.CSSProperties;
  switch (barStyle) {
    case 'simple':
      barStyleObj = {
        width: `${widthPct}%`,
        animation: `stretchSimple 600ms ease-out both`,
      };
      break;
    case 'stagger':
      barStyleObj = {
        width: `${widthPct}%`,
        animation: `stretchStagger 600ms ease-out ${index * 60}ms both`,
      };
      break;
    case 'spring':
      barStyleObj = {
        width: `${widthPct}%`,
        animation: `stretchSimple 700ms cubic-bezier(0.34, 1.56, 0.64, 1) both`,
      };
      break;
    case 'rollupVal':
      barStyleObj = {
        width: `${widthPct}%`,
        animation: `stretchSimple 600ms ease-out both`,
      };
      break;
    case 'slideStretch':
      barStyleObj = {
        width: `${widthPct}%`,
        animation: `stretchSlide 700ms cubic-bezier(0.22, 1, 0.36, 1) ${index * 40}ms both`,
      };
      break;
  }

  return (
    <div>
      <div className="text-[10px] font-bold text-[var(--color-subtext)] mb-0.5">{label}</div>
      <div className="flex items-center gap-2">
        <div className="h-3 rounded-full bg-[#111]" style={barStyleObj} />
        {count > 0 && (
          barStyle === 'rollupVal'
            ? <RollupNum value={count} className="text-[10px] font-bold tabular-nums" />
            : <span className="text-[10px] font-bold tabular-nums">{count}</span>
        )}
      </div>
    </div>
  );
}
