'use client';

// 案3: 重ねオフセットピン
// 同じ住所のピンを少しずつズラして「カードの重なり」っぽく見せる。
// 何も操作せんでも「お、複数人や」と見た目でわかる。
// タップでボトムシート展開。

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

function PinDroplet({ color, visited }: { color: string; visited: boolean }) {
  return (
    <svg width={28} height={40} viewBox="0 0 28 40" fill="none"
         style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }}>
      <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 40 14 40S28 24.5 28 14C28 6.268 21.732 0 14 0Z"
            fill={visited ? color : '#FFFFFF'} stroke={color} strokeWidth={visited ? 1 : 2} />
      <circle cx="14" cy="13.5" r="5" fill={visited ? '#FFFFFF' : color} />
    </svg>
  );
}

// 同じ住所のメンバーを「ちょっとずつズレた重なりピン」で表示
function StackPin({ members }: { members: Member[] }) {
  // 重ね幅: 横 +6px, 縦 -4px ずつ
  return (
    <div className="relative">
      {members.map((m, i) => (
        <div key={m.id}
             className="absolute"
             style={{
               left: -14 + i * 12,
               top: -40 - i * 8,
               zIndex: members.length - i, // 後ろのピンが上に出すぎないよう、先頭(index 0)を一番上
               filter: 'drop-shadow(0 1.5px 2px rgba(0,0,0,0.3))',
             }}>
          <PinDroplet color={m.color} visited={m.visited} />
        </div>
      ))}
      {/* 透明の当たり判定エリア確保用 */}
      <div style={{ width: 28 + (members.length - 1) * 12, height: 40 + (members.length - 1) * 8 }} />
    </div>
  );
}

export default function Page() {
  const [sheet, setSheet] = useState<{ title: string; members: Member[] } | null>(null);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="px-4 pt-6 pb-3 max-w-md mx-auto">
        <Link href="/mock/overlap-pin" className="text-xs text-[var(--color-subtext)] underline">← 一覧へ戻る</Link>
        <h1 className="text-xl font-bold mt-2">案3 重ねオフセットピン</h1>
        <p className="text-xs text-[var(--color-subtext)] mt-1">
          ピンを少しズラして重ねる。タップせんでも「複数人や」が一目でわかる。
        </p>
      </header>

      <div className="max-w-md mx-auto px-4">
        <div className="relative w-full overflow-hidden rounded-xl border border-black/10"
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
              onClick={() => setSheet({ title: p.m.name, members: [p.m] })}
            >
              <PinDroplet color={p.m.color} visited={p.m.visited} />
            </button>
          ))}

          <button
            className="absolute active:scale-95"
            style={{ left: `${STACK_SIBLINGS.x}%`, top: `${STACK_SIBLINGS.y}%` }}
            onClick={() => setSheet({ title: 'この住所に2人', members: STACK_SIBLINGS.members })}
          >
            <StackPin members={STACK_SIBLINGS.members} />
          </button>

          <button
            className="absolute active:scale-95"
            style={{ left: `${STACK_TRIO.x}%`, top: `${STACK_TRIO.y}%` }}
            onClick={() => setSheet({ title: 'この住所に3人', members: STACK_TRIO.members })}
          >
            <StackPin members={STACK_TRIO.members} />
          </button>
        </div>

        <div className="mt-4 mb-12 text-[12px] text-[var(--color-subtext)] leading-relaxed">
          <p className="mb-1"><b>👍 良いところ</b>: 触らなくても複数人てわかる。組織色も全員分チラ見えする。</p>
          <p className="mb-1"><b>🤔 弱いところ</b>: 5人以上やと縦に伸びすぎる。10人とかは現実的に厳しい。</p>
        </div>
      </div>

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
                       style={{ background: m.color }}>{m.name.slice(0, 1)}</div>
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
