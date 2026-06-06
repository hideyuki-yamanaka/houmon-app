'use client';

// 案3: マップのモード切替
// マップ右下に「実訪問 / 全員」のセグメントトグル。
// 実訪問モード: 転居・住所不明・拒否のピンは 完全に隠す → ノイズ消える
// 全員モード: 従来通り 全部表示
// 切替時 ピン数が ボトムシートにも反映される。

import Link from 'next/link';
import { useState } from 'react';

type Mode = 'real' | 'all';

const PINS = [
  { x: 24, y: 30, c: '#E45A5A', kind: 'real' as const },
  { x: 56, y: 22, c: '#4A90C2', kind: 'real' as const },
  { x: 18, y: 60, c: '#5FA86A', kind: 'real' as const },
  { x: 70, y: 35, c: '#34C759', kind: 'real' as const },
  { x: 42, y: 45, c: '#FF9500', kind: 'real' as const },
  { x: 80, y: 65, c: '#34C759', kind: 'real' as const },
  { x: 32, y: 78, c: '#E45A5A', kind: 'real' as const },
  { x: 65, y: 70, c: '#4A90C2', kind: 'real' as const },
  { x: 48, y: 25, c: '#AF52DE', kind: 'excluded' as const },  // 転居
  { x: 12, y: 40, c: '#AF52DE', kind: 'excluded' as const },
  { x: 60, y: 55, c: '#8E8E93', kind: 'excluded' as const },  // 不明
  { x: 85, y: 30, c: '#FF3B30', kind: 'excluded' as const },  // 拒否
  { x: 28, y: 50, c: '#AF52DE', kind: 'excluded' as const },
];

export default function Page() {
  const [mode, setMode] = useState<Mode>('real');

  const visible = mode === 'real' ? PINS.filter(p => p.kind === 'real') : PINS;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="px-4 pt-6 pb-3 max-w-md mx-auto">
        <Link href="/mock/visit-flow" className="text-xs text-[var(--color-subtext)] underline">← 一覧へ戻る</Link>
        <h1 className="text-xl font-bold mt-2">案3 マップのモード切替</h1>
        <p className="text-xs text-[var(--color-subtext)] mt-1">
          右下のセグメントで「実訪問だけ / 全員」をワンタップ切替。
        </p>
      </header>

      <div className="max-w-md mx-auto px-4">
        <div className="rounded-2xl border border-black/10 bg-white overflow-hidden shadow-sm">
          {/* マップエリア */}
          <div className="relative bg-[#f6efe2] overflow-hidden" style={{ aspectRatio: '3 / 4' }}>
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px) 0 0/40px 40px,' +
                          'linear-gradient(0deg, rgba(0,0,0,0.04) 1px, transparent 1px) 0 0/40px 40px',
            }} />
            <div className="absolute left-[10%] right-[10%] top-[48%] h-[6px] bg-white/70 rounded" />
            <div className="absolute top-[10%] bottom-[10%] left-[45%] w-[6px] bg-white/70 rounded" />

            {/* ピン */}
            {visible.map((p, i) => (
              <div key={i} className="absolute -translate-x-1/2 -translate-y-full transition-opacity"
                   style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                <svg width={20} height={28} viewBox="0 0 28 40"
                     style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}>
                  <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 40 14 40S28 24.5 28 14C28 6.268 21.732 0 14 0Z"
                        fill={p.c} stroke="#fff" strokeWidth="1" />
                  <circle cx="14" cy="13.5" r="5" fill="#fff" />
                </svg>
              </div>
            ))}

            {/* 上部 カウントピル */}
            <div className="absolute top-3 left-3 right-3 flex justify-between items-center">
              <div className="bg-white/95 rounded-full px-3 py-1.5 shadow-sm text-[11px] font-bold border border-black/5">
                📍 {visible.length} 件 表示中
              </div>
              {mode === 'real' && (
                <div className="bg-[#FFF6E5] text-[#7A4F00] rounded-full px-2.5 py-1 text-[10px] font-bold border border-[#F0CB80]/60">
                  対象外 {PINS.length - visible.length} 件 非表示
                </div>
              )}
            </div>

            {/* 右下 モード切替 (segmented control) */}
            <div className="absolute bottom-3 right-3 bg-white rounded-full p-1 shadow-[0_3px_12px_rgba(0,0,0,0.18)] flex border border-black/5">
              {(['real','all'] as Mode[]).map(m => (
                <button key={m} onClick={() => setMode(m)}
                        className={`px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors ${
                          mode === m ? 'bg-[#111] text-white' : 'text-[var(--color-subtext)]'
                        }`}>
                  {m === 'real' ? '実訪問' : '全員'}
                </button>
              ))}
            </div>
          </div>

          {/* ボトムシート プレビュー */}
          <div className="border-t border-black/5 px-4 py-3">
            <div className="w-10 h-1 bg-black/15 rounded-full mx-auto mb-2" />
            <div className="text-[11px] text-[var(--color-subtext)]">📋 リスト</div>
            <div className="font-bold mt-0.5">{mode === 'real' ? '行ける人' : '全メンバー'} {visible.length} 人</div>
          </div>
        </div>

        <div className="mt-4 mb-12 text-[12px] text-[var(--color-subtext)] leading-relaxed">
          <p className="mb-1"><b>👍 良いところ</b>: マップが綺麗になる。普段は対象外を完全に消せる</p>
          <p className="mb-1"><b>🤔 弱いところ</b>: トグルが画面上に常駐。初見ユーザーが「何のスイッチ?」と迷う可能性</p>
        </div>
      </div>
    </div>
  );
}
