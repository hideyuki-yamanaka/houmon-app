'use client';

// 案4: 分割パイピン
// 1個のピンの中を、メンバー数だけパイ状に分割して塗り分け。
// 同じ組織のとこは同じ色、違う組織やと色が割れる。
// 「あ、ここ複数人や」が形でわかる。中央に人数も入れる。

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
         style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}>
      <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 40 14 40S28 24.5 28 14C28 6.268 21.732 0 14 0Z"
            fill={visited ? color : '#FFFFFF'} stroke={color} strokeWidth={visited ? 1 : 2} />
      <circle cx="14" cy="13.5" r="5" fill={visited ? '#FFFFFF' : color} />
    </svg>
  );
}

// 円の中心(cx,cy) 半径r で 角度[a0, a1] の扇形パス
function arcPath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const rad = (a: number) => (a - 90) * (Math.PI / 180);
  const x0 = cx + r * Math.cos(rad(a0));
  const y0 = cy + r * Math.sin(rad(a0));
  const x1 = cx + r * Math.cos(rad(a1));
  const y1 = cy + r * Math.sin(rad(a1));
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
}

function PiePin({ members }: { members: Member[] }) {
  const n = members.length;
  const slice = 360 / n;
  return (
    <svg width={40} height={52} viewBox="0 0 40 52" fill="none"
         style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))' }}>
      {/* 水滴形の外枠 */}
      <path d="M20 0C8.954 0 0 8.954 0 20C0 32 20 52 20 52S40 32 40 20C40 8.954 31.046 0 20 0Z"
            fill="#FFFFFF" stroke="#333" strokeWidth="1.2" />
      {/* パイ分割 (頭部 円 r=15) */}
      <g transform="translate(0,0)">
        {members.map((m, i) => (
          <path key={m.id} d={arcPath(20, 20, 15, i * slice, (i + 1) * slice)}
                fill={m.color} opacity={m.visited ? 1 : 0.55} />
        ))}
      </g>
      {/* 区切り線 (白) */}
      {n > 1 && Array.from({ length: n }).map((_, i) => {
        const a = (i * slice - 90) * (Math.PI / 180);
        return (
          <line key={i}
                x1="20" y1="20"
                x2={20 + 15 * Math.cos(a)}
                y2={20 + 15 * Math.sin(a)}
                stroke="#FFFFFF" strokeWidth="2" />
        );
      })}
      {/* 中央 人数 */}
      <circle cx="20" cy="20" r="7" fill="#FFFFFF" />
      <text x="20" y="24" textAnchor="middle" fontSize="11" fontWeight="800" fill="#222">{n}</text>
    </svg>
  );
}

export default function Page() {
  const [sheet, setSheet] = useState<{ title: string; members: Member[] } | null>(null);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="px-4 pt-6 pb-3 max-w-md mx-auto">
        <Link href="/mock/overlap-pin" className="text-xs text-[var(--color-subtext)] underline">← 一覧へ戻る</Link>
        <h1 className="text-xl font-bold mt-2">案4 分割パイピン</h1>
        <p className="text-xs text-[var(--color-subtext)] mt-1">
          1個のピンを人数分パイ状に塗り分け。組織が混ざってる時は色も割れる。
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
            className="absolute -translate-x-1/2 -translate-y-full active:scale-95"
            style={{ left: `${STACK_SIBLINGS.x}%`, top: `${STACK_SIBLINGS.y}%` }}
            onClick={() => setSheet({ title: 'この住所に2人', members: STACK_SIBLINGS.members })}
          >
            <PiePin members={STACK_SIBLINGS.members} />
          </button>

          <button
            className="absolute -translate-x-1/2 -translate-y-full active:scale-95"
            style={{ left: `${STACK_TRIO.x}%`, top: `${STACK_TRIO.y}%` }}
            onClick={() => setSheet({ title: 'この住所に3人', members: STACK_TRIO.members })}
          >
            <PiePin members={STACK_TRIO.members} />
          </button>
        </div>

        <div className="mt-4 mb-12 text-[12px] text-[var(--color-subtext)] leading-relaxed">
          <p className="mb-1"><b>👍 良いところ</b>: 全員の組織色が一目で見える。家族で本部が違う家もすぐわかる。</p>
          <p className="mb-1"><b>🤔 弱いところ</b>: ピンが少し大きくなる。訪問済み/未訪問の表現が薄まる。</p>
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
