'use client';

// 案1: バッジ付きクラスタピン
// 重なる位置には通常の水滴ピン + 右上に「人数バッジ」を表示。
// タップでボトムシートが立ち上がり、その住所に住む全メンバーが見える。

import Link from 'next/link';
import { useState } from 'react';

type Member = { id: string; name: string; org: string; color: string; visited: boolean };

const SOLO_PINS: { id: string; x: number; y: number; m: Member }[] = [
  { id: 's1', x: 28, y: 32, m: { id: 'a', name: '田中 一郎', org: '本部A', color: '#E45A5A', visited: true } },
  { id: 's2', x: 70, y: 25, m: { id: 'b', name: '佐藤 花子', org: '本部B', color: '#4A90C2', visited: false } },
  { id: 's3', x: 18, y: 70, m: { id: 'c', name: '山田 太郎', org: '本部C', color: '#5FA86A', visited: true } },
];

const STACK_SIBLINGS: { x: number; y: number; members: Member[] } = {
  x: 55, y: 55,
  members: [
    { id: 'd1', name: '高橋 健一 (兄)', org: '本部A', color: '#E45A5A', visited: true },
    { id: 'd2', name: '高橋 健二 (弟)', org: '本部A', color: '#E45A5A', visited: false },
  ],
};

const STACK_TRIO: { x: number; y: number; members: Member[] } = {
  x: 78, y: 72,
  members: [
    { id: 'e1', name: '鈴木 父', org: '本部B', color: '#4A90C2', visited: true },
    { id: 'e2', name: '鈴木 母', org: '本部B', color: '#4A90C2', visited: true },
    { id: 'e3', name: '鈴木 娘', org: '本部C', color: '#5FA86A', visited: false },
  ],
};

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

function PinDroplet({ color, visited, scale = 1 }: { color: string; visited: boolean; scale?: number }) {
  return (
    <svg width={28 * scale} height={40 * scale} viewBox="0 0 28 40" fill="none"
         style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}>
      <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 40 14 40S28 24.5 28 14C28 6.268 21.732 0 14 0Z"
            fill={visited ? color : '#FFFFFF'} stroke={color} strokeWidth={visited ? 1 : 2} />
      <circle cx="14" cy="13.5" r="5" fill={visited ? '#FFFFFF' : color} />
    </svg>
  );
}

function ClusterPin({ count, color }: { count: number; color: string }) {
  return (
    <div className="relative">
      <PinDroplet color={color} visited />
      <div
        className="absolute -top-1 -right-2 min-w-[20px] h-[20px] px-1 rounded-full bg-[#FF3B30] text-white text-[12px] font-bold flex items-center justify-center"
        style={{
          border: '2px solid #fff',
          boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
        }}
      >
        {count}
      </div>
    </div>
  );
}

export default function Page() {
  const [sheet, setSheet] = useState<{ title: string; members: Member[] } | null>(null);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="px-4 pt-6 pb-3 max-w-md mx-auto">
        <Link href="/mock/overlap-pin" className="text-xs text-[var(--color-subtext)] underline">← 一覧へ戻る</Link>
        <h1 className="text-xl font-bold mt-2">案1 バッジ付きクラスタピン</h1>
        <p className="text-xs text-[var(--color-subtext)] mt-1">
          重なってる位置のピンに「2」「3」みたいな数字バッジ。タップで全員が見える。
        </p>
      </header>

      <div className="max-w-md mx-auto px-4">
        <div className="relative w-full overflow-hidden rounded-xl border border-black/10"
             style={{ aspectRatio: '3 / 4' }}>
          <MapBg />

          {/* GPS現在地 */}
          <div className="absolute" style={{ left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
            <div className="w-10 h-10 rounded-full bg-[#4285F4]/15 flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full bg-[#4285F4] border-2 border-white" />
            </div>
          </div>

          {/* 単独ピン */}
          {SOLO_PINS.map(p => (
            <button
              key={p.id}
              className="absolute -translate-x-1/2 -translate-y-full active:scale-95 transition-transform"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              onClick={() => setSheet({ title: p.m.name, members: [p.m] })}
            >
              <PinDroplet color={p.m.color} visited={p.m.visited} />
            </button>
          ))}

          {/* クラスタ (兄弟2人) */}
          <button
            className="absolute -translate-x-1/2 -translate-y-full active:scale-95 transition-transform"
            style={{ left: `${STACK_SIBLINGS.x}%`, top: `${STACK_SIBLINGS.y}%` }}
            onClick={() => setSheet({ title: 'この住所に2人', members: STACK_SIBLINGS.members })}
          >
            <ClusterPin count={STACK_SIBLINGS.members.length} color="#E45A5A" />
          </button>

          {/* クラスタ (家族3人, 色まざり) */}
          <button
            className="absolute -translate-x-1/2 -translate-y-full active:scale-95 transition-transform"
            style={{ left: `${STACK_TRIO.x}%`, top: `${STACK_TRIO.y}%` }}
            onClick={() => setSheet({ title: 'この住所に3人', members: STACK_TRIO.members })}
          >
            <ClusterPin count={STACK_TRIO.members.length} color="#4A90C2" />
          </button>
        </div>

        <div className="mt-4 mb-12 text-[12px] text-[var(--color-subtext)] leading-relaxed">
          <p className="mb-1"><b>👍 良いところ</b>: 一目で「ここ複数人や」がわかる。実装も軽い。</p>
          <p className="mb-1"><b>🤔 弱いところ</b>: 上に乗ってる代表色しか見えへんから、他の組織色は隠れる。</p>
        </div>
      </div>

      {/* ボトムシート */}
      {sheet && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSheet(null)} />
          <div className="fixed left-0 right-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl px-5 pt-3 pb-6 max-w-md mx-auto">
            <div className="w-10 h-1 bg-black/15 rounded-full mx-auto mb-3" />
            <div className="text-xs text-[var(--color-subtext)] mb-1">📍 同じ住所</div>
            <div className="font-bold text-base mb-3">{sheet.title}</div>
            <div className="flex flex-col gap-2">
              {sheet.members.map(m => (
                <div key={m.id} className="flex items-center gap-3 py-2 px-3 rounded-lg border border-black/10">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                       style={{ background: m.color }}>
                    {m.name.slice(0, 1)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{m.name}</div>
                    <div className="text-[11px] text-[var(--color-subtext)]">{m.org} ・ {m.visited ? '訪問済み' : '未訪問'}</div>
                  </div>
                  <div className="text-[11px] text-[var(--color-subtext)]">›</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
