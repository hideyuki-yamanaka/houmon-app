'use client';

// 案2: ファン展開 (Spider/Fan)
// 重なってる位置をタップすると、ピンが扇形にパッと広がる。
// それぞれのピンが個別にタップできる。マップ上で完結。

import Link from 'next/link';
import { useState } from 'react';

type Member = { id: string; name: string; org: string; color: string; visited: boolean };

const SOLO_PINS = [
  { id: 's1', x: 28, y: 32, m: { id: 'a', name: '田中 一郎', org: '本部A', color: '#E45A5A', visited: true } },
  { id: 's2', x: 70, y: 25, m: { id: 'b', name: '佐藤 花子', org: '本部B', color: '#4A90C2', visited: false } },
  { id: 's3', x: 18, y: 70, m: { id: 'c', name: '山田 太郎', org: '本部C', color: '#5FA86A', visited: true } },
];

const STACK_SIBLINGS = {
  x: 55, y: 55,
  members: [
    { id: 'd1', name: '高橋 健一', org: '本部A', color: '#E45A5A', visited: true },
    { id: 'd2', name: '高橋 健二', org: '本部A', color: '#E45A5A', visited: false },
  ] as Member[],
};

const STACK_TRIO = {
  x: 78, y: 72,
  members: [
    { id: 'e1', name: '鈴木 父', org: '本部B', color: '#4A90C2', visited: true },
    { id: 'e2', name: '鈴木 母', org: '本部B', color: '#4A90C2', visited: true },
    { id: 'e3', name: '鈴木 娘', org: '本部C', color: '#5FA86A', visited: false },
  ] as Member[],
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
         style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))' }}>
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
      <div className="absolute -top-1 -right-2 min-w-[20px] h-[20px] px-1 rounded-full bg-[#FF3B30] text-white text-[12px] font-bold flex items-center justify-center"
           style={{ border: '2px solid #fff', boxShadow: '0 1px 2px rgba(0,0,0,0.25)' }}>
        {count}
      </div>
    </div>
  );
}

// 扇形の展開角度を計算
function fanOffsets(count: number, radius = 56) {
  const arc = Math.min(140, 50 * count); // 角度幅
  const start = -90 - arc / 2;
  return Array.from({ length: count }).map((_, i) => {
    const angle = (start + (arc / Math.max(count - 1, 1)) * i) * (Math.PI / 180);
    return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius };
  });
}

export default function Page() {
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Member | null>(null);

  const fan2 = fanOffsets(STACK_SIBLINGS.members.length);
  const fan3 = fanOffsets(STACK_TRIO.members.length);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="px-4 pt-6 pb-3 max-w-md mx-auto">
        <Link href="/mock/overlap-pin" className="text-xs text-[var(--color-subtext)] underline">← 一覧へ戻る</Link>
        <h1 className="text-xl font-bold mt-2">案2 ファン展開ピン</h1>
        <p className="text-xs text-[var(--color-subtext)] mt-1">
          重なりピンをタップするとシュッと扇形に広がる。Google Maps の cluster と同じ発想。
        </p>
      </header>

      <div className="max-w-md mx-auto px-4">
        <div className="relative w-full overflow-hidden rounded-xl border border-black/10"
             onClick={() => setOpenedId(null)}
             style={{ aspectRatio: '3 / 4' }}>
          <MapBg />

          <div className="absolute" style={{ left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
            <div className="w-10 h-10 rounded-full bg-[#4285F4]/15 flex items-center justify-center">
              <div className="w-3.5 h-3.5 rounded-full bg-[#4285F4] border-2 border-white" />
            </div>
          </div>

          {SOLO_PINS.map(p => (
            <button
              key={p.id}
              className="absolute -translate-x-1/2 -translate-y-full active:scale-95"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              onClick={(e) => { e.stopPropagation(); setSelected(p.m); }}
            >
              <PinDroplet color={p.m.color} visited={p.m.visited} />
            </button>
          ))}

          {/* クラスタ (2人) */}
          <div className="absolute" style={{ left: `${STACK_SIBLINGS.x}%`, top: `${STACK_SIBLINGS.y}%` }}>
            {STACK_SIBLINGS.members.map((m, i) => {
              const open = openedId === 'siblings';
              const off = fan2[i];
              return (
                <button
                  key={m.id}
                  className="absolute -translate-x-1/2 -translate-y-full"
                  style={{
                    left: 0,
                    top: 0,
                    transform: `translate(calc(-50% + ${open ? off.dx : 0}px), calc(-100% + ${open ? off.dy : 0}px))`,
                    transition: 'transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    opacity: open || i === 0 ? 1 : 0,
                    zIndex: open ? 20 : 5,
                  }}
                  onClick={(e) => { e.stopPropagation(); if (open) setSelected(m); }}
                >
                  <PinDroplet color={m.color} visited={m.visited} />
                </button>
              );
            })}
            {openedId !== 'siblings' && (
              <button
                className="absolute z-10"
                style={{ left: 0, top: 0, transform: 'translate(-50%, -100%)' }}
                onClick={(e) => { e.stopPropagation(); setOpenedId('siblings'); }}
              >
                <ClusterPin count={STACK_SIBLINGS.members.length} color="#E45A5A" />
              </button>
            )}
          </div>

          {/* クラスタ (3人) */}
          <div className="absolute" style={{ left: `${STACK_TRIO.x}%`, top: `${STACK_TRIO.y}%` }}>
            {STACK_TRIO.members.map((m, i) => {
              const open = openedId === 'trio';
              const off = fan3[i];
              return (
                <button
                  key={m.id}
                  className="absolute"
                  style={{
                    left: 0, top: 0,
                    transform: `translate(calc(-50% + ${open ? off.dx : 0}px), calc(-100% + ${open ? off.dy : 0}px))`,
                    transition: 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    opacity: open || i === 0 ? 1 : 0,
                    zIndex: open ? 20 : 5,
                  }}
                  onClick={(e) => { e.stopPropagation(); if (open) setSelected(m); }}
                >
                  <PinDroplet color={m.color} visited={m.visited} />
                </button>
              );
            })}
            {openedId !== 'trio' && (
              <button
                className="absolute z-10"
                style={{ left: 0, top: 0, transform: 'translate(-50%, -100%)' }}
                onClick={(e) => { e.stopPropagation(); setOpenedId('trio'); }}
              >
                <ClusterPin count={STACK_TRIO.members.length} color="#4A90C2" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 mb-12 text-[12px] text-[var(--color-subtext)] leading-relaxed">
          <p className="mb-1"><b>👍 良いところ</b>: マップ上で完結。シート出さず一発で個別ピンを掴める。</p>
          <p className="mb-1"><b>🤔 弱いところ</b>: 展開中は他のピンと干渉する。展開ピンを閉じる操作も必要。</p>
        </div>
      </div>

      {selected && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSelected(null)} />
          <div className="fixed left-0 right-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl px-5 pt-3 pb-6 max-w-md mx-auto">
            <div className="w-10 h-1 bg-black/15 rounded-full mx-auto mb-3" />
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-bold"
                   style={{ background: selected.color }}>{selected.name.slice(0,1)}</div>
              <div>
                <div className="font-bold">{selected.name}</div>
                <div className="text-[11px] text-[var(--color-subtext)]">{selected.org} ・ {selected.visited ? '訪問済み' : '未訪問'}</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
