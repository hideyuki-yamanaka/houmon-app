'use client';

// ──────────────────────────────────────────────────────────────
// 週バー ラベリング 「今週/先週」バッジ デザイン 5案
//
// ヒデさん指示 (2026-05-04):
//   ラベリング自体は B案 (5/4〜10 日付メイン) で OK。
//   ただし「今週」「先週」のバッジ部分が見づらいから 5 案出してほしい。
//
// 共通: 直近6週、日付メインラベル + 「今週/先週」バッジ。
// 5 案でバッジの 大きさ / 色 / 形 / 位置 を変えて比較。
// ──────────────────────────────────────────────────────────────

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

const TODAY = new Date(2026, 4, 4); // 2026-05-04 (月)
function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function fmt(d: Date): string { return `${d.getMonth() + 1}/${d.getDate()}`; }

type Week = { monday: Date; agoIdx: number; count: number };
const WEEKS: Week[] = Array.from({ length: 6 }, (_, i) => ({
  monday: addDays(TODAY, -i * 7),
  agoIdx: i,
  count: [18, 12, 20, 6, 14, 9][i],
}));
const MAX = Math.max(1, ...WEEKS.map(w => w.count));

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
            「今週/先週」バッジ 5案
          </h1>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-3 py-4 space-y-6">
        <p className="text-[12px] text-[var(--color-subtext)] leading-relaxed">
          ラベリングは B案 (5/4〜10 日付メイン) を採用。
          <br />
          「今週」「先週」を示すバッジの デザインだけ 5 パターン比較。
        </p>

        <V letter="A" title="現状: 小さめ薄背景" desc="text-[9px] + 薄い色背景。控えめだが見にくいかも。">
          <Card>{WEEKS.map(w => <Bar key={w.agoIdx} w={w} variant="A" />)}</Card>
        </V>

        <V letter="B" title="大きめピル + ソリッド色" desc="text-[10px] + 太字、塗り潰し。視認性◎、ややビビッド。">
          <Card>{WEEKS.map(w => <Bar key={w.agoIdx} w={w} variant="B" />)}</Card>
        </V>

        <V letter="C" title="アウトライン (枠線)" desc="透明背景 + 色枠線 + 色文字。控えめだが ハッキリ。">
          <Card>{WEEKS.map(w => <Bar key={w.agoIdx} w={w} variant="C" />)}</Card>
        </V>

        <V letter="D" title="ドット + 強調テキスト" desc="背景なし、色付きドット + 太字。最もミニマル。">
          <Card>{WEEKS.map(w => <Bar key={w.agoIdx} w={w} variant="D" />)}</Card>
        </V>

        <V letter="E" title="左マーカー (バー左に縦色帯)" desc="行全体の左端に色帯、テキストはなし or 小さく併記。タイル感。">
          <Card>{WEEKS.map(w => <Bar key={w.agoIdx} w={w} variant="E" />)}</Card>
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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-[14px] font-bold leading-tight">家庭訪問の回数</h3>
          <p className="text-[10px] text-[var(--color-subtext)] mt-0.5">直近6週分</p>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[28px] font-extrabold tabular-nums leading-none text-[#111] tracking-tight">
            {WEEKS.reduce((s, w) => s + w.count, 0)}
          </span>
          <span className="text-[12px] font-bold">回</span>
        </div>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// バー1行 (variant でバッジデザインを切替)
// ──────────────────────────────────────────────────────────────
type Variant = 'A' | 'B' | 'C' | 'D' | 'E';

function Bar({ w, variant }: { w: Week; variant: Variant }) {
  const sun = addDays(w.monday, 6);
  const sameMonth = w.monday.getMonth() === sun.getMonth();
  const dateRange = sameMonth ? `${fmt(w.monday)}〜${sun.getDate()}` : `${fmt(w.monday)}〜${fmt(sun)}`;
  const widthPct = w.count > 0 ? Math.max(10, (w.count / MAX) * 100) : 4;

  // 「今週」「先週」のラベル & 配色
  const isThis = w.agoIdx === 0;
  const isLast = w.agoIdx === 1;
  const badgeText = isThis ? '今週' : isLast ? '先週' : null;

  // 案 E は左マーカーで実装するのでバッジは別扱い
  if (variant === 'E') {
    const stripeColor = isThis ? '#10B981' : isLast ? '#6B7280' : 'transparent';
    return (
      <div className="flex items-stretch gap-2">
        <div className="w-1 rounded-full self-stretch shrink-0" style={{ background: stripeColor }} />
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[11px] font-bold text-[#111]">{dateRange}</span>
            {badgeText && <span className="text-[10px] font-bold" style={{ color: stripeColor }}>{badgeText}</span>}
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 rounded-full bg-[#111]" style={{ width: `${widthPct}%`, minWidth: 4 }} />
            {w.count > 0 && <span className="text-[11px] font-bold tabular-nums text-[#374151]">{w.count}</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[11px] font-bold text-[#111]">{dateRange}</span>
        {badgeText && <Badge variant={variant} kind={isThis ? 'this' : 'last'}>{badgeText}</Badge>}
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 rounded-full bg-[#111]" style={{ width: `${widthPct}%`, minWidth: 4 }} />
        {w.count > 0 && <span className="text-[11px] font-bold tabular-nums text-[#374151]">{w.count}</span>}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// バッジ デザイン本体
// ──────────────────────────────────────────────────────────────
function Badge({ variant, kind, children }: {
  variant: Variant; kind: 'this' | 'last'; children: React.ReactNode;
}) {
  const isThis = kind === 'this';

  // A: 現状 (text-[9px] 薄背景)
  if (variant === 'A') {
    return (
      <span
        className="text-[9px] px-1 py-0.5 rounded font-bold"
        style={{
          color: isThis ? '#047857' : '#6B7280',
          background: isThis ? '#ECFDF5' : '#F3F4F6',
        }}
      >
        {children}
      </span>
    );
  }

  // B: 大きめピル + ソリッド
  if (variant === 'B') {
    return (
      <span
        className="text-[10px] px-2 py-[3px] rounded-full font-bold tracking-wide"
        style={{
          color: '#FFFFFF',
          background: isThis ? '#10B981' : '#9CA3AF',
        }}
      >
        {children}
      </span>
    );
  }

  // C: アウトライン (枠線)
  if (variant === 'C') {
    return (
      <span
        className="text-[10px] px-1.5 py-[2px] rounded-full font-bold"
        style={{
          color: isThis ? '#047857' : '#374151',
          background: '#FFFFFF',
          border: `1px solid ${isThis ? '#10B981' : '#9CA3AF'}`,
        }}
      >
        {children}
      </span>
    );
  }

  // D: ドット + 強調テキスト (背景なし)
  if (variant === 'D') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: isThis ? '#047857' : '#6B7280' }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: isThis ? '#10B981' : '#9CA3AF' }} />
        {children}
      </span>
    );
  }

  return null;
}
