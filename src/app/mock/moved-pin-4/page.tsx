'use client';

// 案4: 紫ピン + 引越アイコン
// VISIT_STATUS_CONFIG.moved の色 (#AF52DE 紫) でピンを塗って、中に → (矢印) を入れる。
// 「moved ステータス」と統一感が出る + 色＋形のダブル区別。

import Link from 'next/link';
import { useState } from 'react';

type PinSpec = {
  id: string;
  x: number;
  y: number;
  color: string;     // 組織色
  visited: boolean;
  moved?: boolean;
  name: string;
};

const PINS: PinSpec[] = [
  { id: 'a', x: 28, y: 32, color: '#E45A5A', visited: true,  name: '田中 一郎' },
  { id: 'b', x: 70, y: 25, color: '#4A90C2', visited: false, name: '佐藤 花子' },
  { id: 'c', x: 18, y: 70, color: '#5FA86A', visited: true,  name: '山田 太郎' },
  { id: 'd', x: 55, y: 55, color: '#E45A5A', visited: true,  moved: true, name: '高橋 健一 (転居)' },
  { id: 'e', x: 78, y: 72, color: '#4A90C2', visited: false, moved: true, name: '鈴木 三郎 (転居)' },
];

// VISIT_STATUS_CONFIG.moved の色
const MOVED_PURPLE = '#AF52DE';

function MapBg() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          'linear-gradient(0deg, rgba(0,0,0,0.04) 1px, transparent 1px) 0 0/40px 40px,' +
          'linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px) 0 0/40px 40px,' +
          'linear-gradient(135deg, #f6efe2 0%, #ece4d3 100%)',
      }}
    >
      <div className="absolute left-[10%] right-[10%] top-[48%] h-[6px] bg-white/70 rounded" />
      <div className="absolute top-[10%] bottom-[10%] left-[45%] w-[6px] bg-white/70 rounded" />
      <div className="absolute left-[8%] top-[20%] w-20 h-12 rounded-md bg-[#dfe9d5]/80" />
      <div className="absolute right-[12%] bottom-[15%] w-24 h-16 rounded-md bg-[#dfe9d5]/80" />
    </div>
  );
}

function Pin({ spec }: { spec: PinSpec }) {
  if (spec.moved) {
    return (
      <svg width={28} height={40} viewBox="0 0 28 40" fill="none"
           style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }}>
        <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 40 14 40S28 24.5 28 14C28 6.268 21.732 0 14 0Z"
              fill={MOVED_PURPLE} stroke="#FFFFFF" strokeWidth="1.5" />
        {/* 中に → 矢印 (引越し感) */}
        <g transform="translate(14, 14)">
          <path d="M -5 0 L 3 0 M 0 -3 L 3 0 L 0 3"
                stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      </svg>
    );
  }
  const fill = spec.visited ? spec.color : '#FFFFFF';
  const stroke = spec.color;
  const dot = spec.visited ? '#FFFFFF' : spec.color;
  return (
    <svg width={28} height={40} viewBox="0 0 28 40" fill="none"
         style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}>
      <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 40 14 40S28 24.5 28 14C28 6.268 21.732 0 14 0Z"
            fill={fill} stroke={stroke} strokeWidth={spec.visited ? 1 : 2} />
      <circle cx="14" cy="13.5" r="5" fill={dot} />
    </svg>
  );
}

export default function Page() {
  const [popup, setPopup] = useState<PinSpec | null>(null);
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="px-4 pt-6 pb-3 max-w-md mx-auto">
        <Link href="/mock/moved-pin" className="text-xs text-[var(--color-subtext)] underline">← 一覧へ戻る</Link>
        <h1 className="text-xl font-bold mt-2">案4 紫ピン + 引越アイコン</h1>
        <p className="text-xs text-[var(--color-subtext)] mt-1">
          moved ステータス色 (紫 #AF52DE) ベースで 中に → 矢印。ログのチップ色と統一。
        </p>
      </header>

      <div className="max-w-md mx-auto px-4">
        <div className="relative w-full overflow-hidden rounded-xl border border-black/10" style={{ aspectRatio: '3 / 4' }}>
          <MapBg />
          {PINS.map(p => (
            <button key={p.id}
                    className="absolute -translate-x-1/2 -translate-y-full active:scale-95"
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    onClick={() => setPopup(p)}>
              <Pin spec={p} />
            </button>
          ))}
        </div>

        <div className="mt-4 mb-12 text-[12px] text-[var(--color-subtext)] leading-relaxed">
          <p className="mb-1"><b>👍 良いところ</b>: ログのチップ色 (紫) と統一感あり。色＋形のダブル区別で誤認しにくい</p>
          <p className="mb-1"><b>🤔 弱いところ</b>: 元の組織色は消える。「どの本部の人だったか」はタップしないと不明</p>
        </div>
      </div>

      {popup && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setPopup(null)} />
          <div className="fixed left-0 right-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl px-5 pt-3 pb-6 max-w-md mx-auto">
            <div className="w-10 h-1 bg-black/15 rounded-full mx-auto mb-3" />
            <div className="font-bold text-base">{popup.name}</div>
            <div className="text-[11px] text-[var(--color-subtext)] mt-1">
              {popup.moved ? '🚚 転居 — 訪問対象外' : (popup.visited ? '訪問済み' : '未訪問')}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
