'use client';

// ──────────────────────────────────────────────────────────────
// ステータスタグ デザイン調整ツール (live tuner)
//
// ヒデさん指示 (2026-05-03 v3):
//   - StatusChip の padding / font-size / gap / dot-size / border / radius を
//     スライダーや入力でリアルタイム調整したい
//   - 全 6 ステータス + サンプル文脈 (カルーセル / VisitCard) で確認
//   - 気に入った値を「コピペ」して StatusChip.tsx に反映できるようにしとく
//
// このページはモックなので 本物の StatusChip は触らない。
// ──────────────────────────────────────────────────────────────

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, RotateCcw, Copy, Check } from 'lucide-react';
import { VISIT_STATUS_CONFIG } from '../../../lib/constants';
import type { VisitStatus } from '../../../lib/types';

// ── プリセット ──
const PRESETS: Record<string, ChipStyle> = {
  // 現在の本番値 (StatusChip md size 相当)
  current: {
    paddingX: 10, paddingY: 2, fontSize: 12, gap: 4,
    dotSize: 8, borderWidth: 1.5, borderRadius: 9999, fontWeight: 700,
  },
  // カルーセル sm size 相当
  current_sm: {
    paddingX: 8, paddingY: 2, fontSize: 11, gap: 4,
    dotSize: 6, borderWidth: 1.5, borderRadius: 9999, fontWeight: 700,
  },
  // 詰め寄せ案
  compact: {
    paddingX: 6, paddingY: 1, fontSize: 11, gap: 3,
    dotSize: 6, borderWidth: 1, borderRadius: 9999, fontWeight: 700,
  },
};

interface ChipStyle {
  paddingX: number;
  paddingY: number;
  fontSize: number;
  gap: number;
  dotSize: number;
  borderWidth: number;
  borderRadius: number;
  fontWeight: number;
}

const STATUSES: VisitStatus[] = [
  'met_self', 'met_family', 'absent', 'refused', 'unknown_address', 'moved',
];

// ── 調整可能チップ ──
function TunableChip({ status, style }: { status: VisitStatus; style: ChipStyle }) {
  const c = VISIT_STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center bg-white whitespace-nowrap"
      style={{
        paddingLeft: style.paddingX, paddingRight: style.paddingX,
        paddingTop: style.paddingY, paddingBottom: style.paddingY,
        fontSize: style.fontSize,
        gap: style.gap,
        borderWidth: style.borderWidth,
        borderStyle: 'solid',
        borderColor: c.border,
        borderRadius: style.borderRadius,
        color: c.text,
        fontWeight: style.fontWeight,
        lineHeight: 1.2,
      }}
    >
      <span
        className="inline-block shrink-0 rounded-full"
        style={{ width: style.dotSize, height: style.dotSize, background: c.dot }}
      />
      {c.label}
    </span>
  );
}

// ── スライダー入力 ──
function Slider({
  label, value, onChange, min, max, step = 1, suffix = 'px',
}: {
  label: string; value: number; onChange: (n: number) => void;
  min: number; max: number; step?: number; suffix?: string;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[12px] font-semibold text-gray-700">{label}</span>
        <span className="text-[12px] tabular-nums text-gray-500">
          {value}{suffix}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1"
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-14 h-7 rounded border border-gray-300 px-2 text-[12px] text-right tabular-nums"
        />
      </div>
    </label>
  );
}

export default function StatusChipTunerPage() {
  const [style, setStyle] = useState<ChipStyle>(PRESETS.current);
  const [copied, setCopied] = useState(false);

  const update = <K extends keyof ChipStyle>(k: K, v: ChipStyle[K]) =>
    setStyle(s => ({ ...s, [k]: v }));

  const cssText = `style={{
  paddingLeft: ${style.paddingX}, paddingRight: ${style.paddingX},
  paddingTop: ${style.paddingY}, paddingBottom: ${style.paddingY},
  fontSize: ${style.fontSize},
  gap: ${style.gap},
  borderWidth: ${style.borderWidth},
  borderRadius: ${style.borderRadius},
  fontWeight: ${style.fontWeight},
}}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cssText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-32">
      {/* ヘッダ */}
      <nav className="ios-nav flex items-center px-4 py-3 gap-2 sticky top-0 z-10 bg-white/95 backdrop-blur">
        <Link href="/" className="flex items-center gap-1 text-[var(--color-primary)] shrink-0">
          <ChevronLeft size={24} />
          <span className="text-sm">戻る</span>
        </Link>
        <h1 className="text-base font-bold truncate flex-1 text-center">
          ステータスタグ 調整ツール
        </h1>
        <div className="w-[52px] shrink-0" />
      </nav>

      <div className="max-w-[640px] mx-auto px-4 pt-4 space-y-4">

        {/* プレビュー: 全 6 ステータス */}
        <section className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-black/5">
            <h2 className="text-[13px] font-semibold text-gray-500">プレビュー (全 6 ステータス)</h2>
          </div>
          <div className="p-4 flex flex-wrap gap-2 bg-[#FAFAFA]">
            {STATUSES.map(s => <TunableChip key={s} status={s} style={style} />)}
          </div>
        </section>

        {/* プレビュー: 文脈つき (カルーセル / VisitCard 風) */}
        <section className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-black/5">
            <h2 className="text-[13px] font-semibold text-gray-500">文脈つき (カルーセル風 / VisitCard 風)</h2>
          </div>
          <div className="p-4 space-y-4">
            {/* カルーセル風 */}
            <div className="bg-[#F2F2F4] rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[12px] font-bold tabular-nums">2026年4月25日</span>
                <span className="inline-flex items-center gap-0.5 text-[12px] text-gray-900 font-bold whitespace-nowrap">
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="8" r="5" />
                    <path d="M3 22 C 3 16, 7 14, 12 14 C 17 14, 21 16, 21 22 Z" />
                  </svg>
                  ヒデ
                </span>
                <TunableChip status="absent" style={style} />
              </div>
              <p className="text-[11px] text-[#374151] leading-snug">
                ピンポンしたが不在。お菓子を置いて来週末また伺う予定
              </p>
            </div>

            {/* VisitCard 風 */}
            <div className="ios-card p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-bold">2026年4月23日</span>
                  <TunableChip status="met_family" style={style} />
                  <span className="ml-auto inline-flex items-center gap-0.5 text-[12px] text-gray-900 font-bold whitespace-nowrap">
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="8" r="5" />
                      <path d="M3 22 C 3 16, 7 14, 12 14 C 17 14, 21 16, 21 22 Z" />
                    </svg>
                    Aさん
                  </span>
                </div>
                <p className="text-sm text-[var(--color-subtext)] mt-1.5">
                  父親が対応。本人は仕事で不在。元気にしているとのこと
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 調整スライダー */}
        <section className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-black/5 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-gray-500">調整パラメータ</h2>
            <button
              type="button"
              onClick={() => setStyle(PRESETS.current)}
              className="text-[11px] text-[var(--color-primary)] flex items-center gap-1 active:opacity-60"
            >
              <RotateCcw size={11} />
              リセット
            </button>
          </div>
          <div className="p-4 grid grid-cols-2 gap-x-4 gap-y-3">
            <Slider label="左右パディング" value={style.paddingX} min={0} max={20} onChange={v => update('paddingX', v)} />
            <Slider label="上下パディング" value={style.paddingY} min={0} max={10} onChange={v => update('paddingY', v)} />
            <Slider label="文字サイズ"     value={style.fontSize} min={8}  max={20} onChange={v => update('fontSize', v)} />
            <Slider label="アイコン×文字 gap" value={style.gap} min={0} max={12} onChange={v => update('gap', v)} />
            <Slider label="ドットサイズ"   value={style.dotSize} min={4} max={16} onChange={v => update('dotSize', v)} />
            <Slider label="枠線の太さ"     value={style.borderWidth} min={0} max={4} step={0.5} onChange={v => update('borderWidth', v)} />
            <Slider label="角丸"           value={style.borderRadius} min={0} max={9999} step={1} suffix="px" onChange={v => update('borderRadius', v)} />
            <Slider label="文字の太さ"     value={style.fontWeight} min={400} max={900} step={100} suffix="" onChange={v => update('fontWeight', v)} />
          </div>
        </section>

        {/* プリセット切替 */}
        <section className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-black/5">
            <h2 className="text-[13px] font-semibold text-gray-500">プリセット</h2>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {Object.entries(PRESETS).map(([name, p]) => (
              <button
                key={name}
                type="button"
                onClick={() => setStyle(p)}
                className="px-3 py-1.5 rounded-full text-[12px] bg-gray-100 hover:bg-gray-200 active:scale-95 transition"
              >
                {name === 'current' ? '今の本番値 (md)'
                  : name === 'current_sm' ? '今のカルーセル値 (sm)'
                  : name === 'compact' ? '詰め寄せ案'
                  : name}
              </button>
            ))}
          </div>
        </section>

        {/* コピー用 */}
        <section className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-black/5 flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-gray-500">確定値 (コピペで StatusChip.tsx に反映可)</h2>
            <button
              type="button"
              onClick={handleCopy}
              className="text-[11px] text-[var(--color-primary)] flex items-center gap-1 active:opacity-60"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'コピー!' : 'コピー'}
            </button>
          </div>
          <pre className="p-4 text-[11px] font-mono bg-[#FAFAFA] overflow-x-auto leading-snug">
            {cssText}
          </pre>
        </section>

      </div>
    </div>
  );
}
