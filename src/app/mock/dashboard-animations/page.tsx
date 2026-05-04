'use client';

// ──────────────────────────────────────────────────────────────
// ダッシュボード フィルタ切替時の アニメーション 5案 比較プレビュー
//
// ヒデさん指示 (2026-05-04):
//   フィルタを変更すると、それ以下のコンテンツが動的に変わってる
//   ニュアンスが出るアニメーションを 5パターン見せてほしい。
//
// 各案: ボタンを押すとサンプルデータ A ⇄ B が切り替わる。
// 数字 (Hero) + ステータス内訳 + バーで動きを確認できる。
//
// 案: A. ロールアップ カウントアップ (0 → target)
//     B. スロットマシン (digits ランダム → 着地)
//     C. クロスフェード (旧→新 を opacity で)
//     D. フリップ (フリップ時計風 上スライド)
//     E. パルス + スケール (一瞬 大きくなって戻る)
// ──────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, RefreshCw } from 'lucide-react';

// ── サンプルデータ (A = 全員, B = 個別フィルタ後) ────────────
type Snapshot = {
  hero: number;
  bars: number[];   // 6 weeks
  blocks: { label: string; n: number; cls: string }[];
};

const SNAP_A: Snapshot = {
  hero: 142,
  bars: [12, 8, 15, 10, 18, 14],
  blocks: [
    { label: '本人◎', n: 71, cls: 'bg-emerald-100 text-emerald-700' },
    { label: '家族◎', n: 28, cls: 'bg-emerald-50  text-emerald-600' },
    { label: '不在他', n: 43, cls: 'bg-gray-100   text-gray-700' },
  ],
};
const SNAP_B: Snapshot = {
  hero: 56,
  bars: [4, 3, 6, 5, 7, 5],
  blocks: [
    { label: '本人◎', n: 28, cls: 'bg-emerald-100 text-emerald-700' },
    { label: '家族◎', n: 11, cls: 'bg-emerald-50  text-emerald-600' },
    { label: '不在他', n: 17, cls: 'bg-gray-100   text-gray-700' },
  ],
};

// ──────────────────────────────────────────────────────────────
export default function DashboardAnimationsPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-12">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-black/5">
        <div className="max-w-[640px] mx-auto flex items-center px-2 py-2">
          <Link href="/" className="flex items-center gap-1 text-[15px] text-[var(--color-primary)] active:opacity-60 px-2 py-1">
            <ChevronLeft size={20} />戻る
          </Link>
          <h1 className="flex-1 text-center text-[16px] font-semibold pr-12">
            ダッシュボード フィルタ アニメ 5案
          </h1>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-3 py-4 space-y-6">
        <p className="text-[12px] text-[var(--color-subtext)] leading-relaxed">
          各案の「フィルタ切替」ボタンを押して動きを確認してな。
          <br />
          サンプル: 全員 (142件) ⇄ 1人 (56件) を切替。
        </p>

        <V letter="A" title="ロールアップ カウントアップ" desc="0 から target まで数字がスムーズに上がる (~600ms)。">
          <Mini variant="rollup" />
        </V>

        <V letter="B" title="スロットマシン" desc="数字がランダムにカチャカチャ切り替わって着地 (~500ms)。賑やか。">
          <Mini variant="slot" />
        </V>

        <V letter="C" title="クロスフェード" desc="旧→新 を opacity でなめらかに入れ替え。控えめで上品。">
          <Mini variant="fade" />
        </V>

        <V letter="D" title="フリップ (上スライド)" desc="旧数字が上に消え、新数字が下から上がる。フリップ時計風。">
          <Mini variant="flip" />
        </V>

        <V letter="E" title="パルス + スケール" desc="数字が一瞬 大きくなってバウンドして戻る。「変わったよ！」感 強い。">
          <Mini variant="pulse" />
        </V>

        <p className="text-[11px] text-[var(--color-subtext)] text-center pt-4 leading-relaxed">
          気に入った案を Claude に伝えてな。組み合わせ (Hero=A, バー=パルス 等) もOK。
        </p>
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

// ── ミニダッシュボード (案ごとに異なるアニメ適用) ────────────
type Variant = 'rollup' | 'slot' | 'fade' | 'flip' | 'pulse';

function Mini({ variant }: { variant: Variant }) {
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

      {/* 「家庭訪問の回数」風カード */}
      <div className="bg-white rounded-xl p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-[14px] font-bold leading-tight">家庭訪問の回数</h3>
            <p className="text-[10px] text-[var(--color-subtext)] mt-0.5">直近6週分</p>
          </div>
          <div className="flex items-baseline gap-1">
            <AnimatedNumber value={data.hero} variant={variant} className="text-[36px] font-extrabold tabular-nums leading-none text-[#111] tracking-tight" />
            <span className="text-[12px] font-bold">回</span>
          </div>
        </div>
        <BarsAnimated bars={data.bars} variant={variant} snap={snap} />
      </div>

      {/* 「内訳」風 3 ブロック */}
      <div className="bg-white rounded-xl p-4">
        <h3 className="text-[14px] font-bold mb-2">訪問ログ内訳</h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          {data.blocks.map((b, i) => (
            <div key={i} className={`rounded-lg py-2 ${b.cls.split(' ')[0]}`}>
              <AnimatedNumber value={b.n} variant={variant} className={`text-[18px] font-bold ${b.cls.split(' ')[1]}`} />
              <div className={`text-[10px] ${b.cls.split(' ')[1]}`}>{b.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// AnimatedNumber: variant に応じて数字をアニメ表示
// ──────────────────────────────────────────────────────────────
function AnimatedNumber({ value, variant, className }: { value: number; variant: Variant; className?: string }) {
  if (variant === 'rollup') return <RollupNumber value={value} className={className} />;
  if (variant === 'slot') return <SlotNumber value={value} className={className} />;
  if (variant === 'fade') return <FadeNumber value={value} className={className} />;
  if (variant === 'flip') return <FlipNumber value={value} className={className} />;
  return <PulseNumber value={value} className={className} />;
}

// A. ロールアップ — 旧値 → 新値 を 600ms で補間
function RollupNumber({ value, className }: { value: number; className?: string }) {
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
      // ease-out cubic
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

// B. スロットマシン — 約 500ms 間ランダムに切替、最後 target で着地
function SlotNumber({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current === value) { setDisplay(value); return; }
    const dur = 500;
    const interval = 40; // 40msごとにランダム切替
    const t0 = performance.now();
    const range = Math.max(prev.current, value, 100);
    let id: ReturnType<typeof setInterval> | null = null;
    const tick = () => {
      const elapsed = performance.now() - t0;
      if (elapsed >= dur) {
        setDisplay(value);
        if (id) clearInterval(id);
        return;
      }
      setDisplay(Math.floor(Math.random() * range));
    };
    id = setInterval(tick, interval);
    prev.current = value;
    return () => { if (id) clearInterval(id); };
  }, [value]);
  return <span className={className}>{display}</span>;
}

// C. クロスフェード — 旧 fade-out → 新 fade-in
function FadeNumber({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const [opacity, setOpacity] = useState(1);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current === value) return;
    setOpacity(0);
    const t = setTimeout(() => {
      setDisplay(value);
      setOpacity(1);
    }, 200);
    prev.current = value;
    return () => clearTimeout(t);
  }, [value]);
  return (
    <span
      className={className}
      style={{ opacity, transition: 'opacity 200ms ease-out' }}
    >
      {display}
    </span>
  );
}

// D. フリップ — 旧 上に消える / 新 下から上がる
function FlipNumber({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('idle');
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current === value) return;
    setPhase('out');
    const t1 = setTimeout(() => {
      setDisplay(value);
      setPhase('in');
      const t2 = setTimeout(() => setPhase('idle'), 250);
      return () => clearTimeout(t2);
    }, 200);
    prev.current = value;
    return () => clearTimeout(t1);
  }, [value]);
  const transform =
    phase === 'out' ? 'translateY(-60%)' :
    phase === 'in'  ? 'translateY(60%)' : 'translateY(0)';
  const opacity = phase === 'idle' ? 1 : 0;
  return (
    <span className="inline-block overflow-hidden align-baseline" style={{ height: '1em' }}>
      <span
        className={`${className} inline-block`}
        style={{
          transform,
          opacity,
          transition: phase === 'in' ? 'transform 250ms ease-out, opacity 200ms ease-out' : phase === 'out' ? 'transform 200ms ease-in, opacity 200ms ease-in' : 'transform 250ms ease-out, opacity 200ms ease-out',
        }}
      >
        {display}
      </span>
    </span>
  );
}

// E. パルス + スケール — 値が変わった瞬間にスケールアップしてバウンド
function PulseNumber({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value);
  const [pulsing, setPulsing] = useState(false);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current === value) return;
    setDisplay(value);
    setPulsing(true);
    const t = setTimeout(() => setPulsing(false), 350);
    prev.current = value;
    return () => clearTimeout(t);
  }, [value]);
  return (
    <span
      className={`${className} inline-block`}
      style={{
        transform: pulsing ? 'scale(1.18)' : 'scale(1)',
        transition: 'transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {display}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────
// バー (棒グラフ) のアニメ — variant ごとに微妙に変える
// ──────────────────────────────────────────────────────────────
function BarsAnimated({ bars, variant, snap }: { bars: number[]; variant: Variant; snap: 'A' | 'B' }) {
  const max = Math.max(...bars, 1);
  // pulse / fade / flip 系: stagger fade-in 風に key を切替
  const keyed = `${snap}-${variant}`;
  return (
    <div key={keyed} className="space-y-1.5">
      {bars.map((v, i) => {
        const widthPct = v > 0 ? Math.max(8, (v / max) * 100) : 4;
        const delay = variant === 'fade' || variant === 'flip' || variant === 'pulse' ? `${i * 50}ms` : '0ms';
        return (
          <div key={i} className="flex items-center gap-2">
            <div
              className="h-3 rounded-full bg-[#111]"
              style={{
                width: `${widthPct}%`,
                minWidth: 4,
                transition: variant === 'rollup' || variant === 'slot' ? 'width 600ms ease-out' : `width 400ms ease-out, opacity 250ms ease-out`,
                animation: variant === 'fade' || variant === 'flip' || variant === 'pulse' ? `fadeInBar 350ms ease-out ${delay} both` : undefined,
              }}
            />
            <span className="text-[10px] font-bold tabular-nums">{v}</span>
          </div>
        );
      })}
      <style jsx>{`
        @keyframes fadeInBar {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
