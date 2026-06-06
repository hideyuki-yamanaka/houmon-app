'use client';

// 案4: マップピン 長押し → ミニメニュー
// 地図上で直接処理。ピンを長押し すると 「⏭ スキップ / ⭐ 行きたい / 詳細」の
// ミニメニューが出る。シートを開かずに 地図から完結。

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Star, SkipForward, ArrowRight } from 'lucide-react';

type Pin = { id: string; x: number; y: number; color: string; visited: boolean; name: string; skipped?: boolean };

const INITIAL: Pin[] = [
  { id: 'a', x: 28, y: 32, color: '#E45A5A', visited: true,  name: '田中 一郎' },
  { id: 'b', x: 70, y: 25, color: '#4A90C2', visited: false, name: '佐藤 花子' },
  { id: 'c', x: 18, y: 70, color: '#5FA86A', visited: true,  name: '山田 太郎' },
  { id: 'd', x: 55, y: 55, color: '#E45A5A', visited: true,  name: '高橋 健二' },
  { id: 'e', x: 78, y: 72, color: '#4A90C2', visited: false, name: '渡辺 さとし' },
];

function MapBg() {
  return (
    <div className="absolute inset-0" style={{
      background:
        'linear-gradient(0deg, rgba(0,0,0,0.04) 1px, transparent 1px) 0 0/40px 40px,' +
        'linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px) 0 0/40px 40px,' +
        'linear-gradient(135deg, #f6efe2 0%, #ece4d3 100%)',
    }}>
      <div className="absolute left-[10%] right-[10%] top-[48%] h-[6px] bg-white/70 rounded" />
      <div className="absolute top-[10%] bottom-[10%] left-[45%] w-[6px] bg-white/70 rounded" />
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

export default function Page() {
  const [pins, setPins] = useState<Pin[]>(INITIAL);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const pressTimer = useRef<number | null>(null);

  const longPressStart = (pin: Pin, e: React.MouseEvent | React.TouchEvent) => {
    // 600ms 長押しで メニュー出現
    pressTimer.current = window.setTimeout(() => {
      setMenu({ id: pin.id, x: pin.x, y: pin.y });
    }, 600);
  };
  const longPressEnd = () => {
    if (pressTimer.current != null) { window.clearTimeout(pressTimer.current); pressTimer.current = null; }
  };
  const skip = (id: string) => {
    setPins(prev => prev.map(p => p.id === id ? { ...p, skipped: true } : p));
    setMenu(null);
  };

  useEffect(() => () => { if (pressTimer.current != null) window.clearTimeout(pressTimer.current); }, []);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="px-4 pt-6 pb-3 max-w-md mx-auto">
        <Link href="/mock/skip-ui" className="text-xs text-[var(--color-subtext)] underline">← 一覧へ戻る</Link>
        <h1 className="text-xl font-bold mt-2">案4 ピン長押し → メニュー</h1>
        <p className="text-xs text-[var(--color-subtext)] mt-1">
          ピンを 0.6秒 押し続けるとミニメニュー。地図から直接処理できる。
        </p>
      </header>

      <div className="max-w-md mx-auto px-4">
        <div className="relative w-full overflow-hidden rounded-2xl border border-black/10 bg-white" style={{ aspectRatio: '3 / 4' }}
             onClick={() => setMenu(null)}>
          <MapBg />
          {pins.map(p => p.skipped ? null : (
            <button key={p.id}
                    className="absolute -translate-x-1/2 -translate-y-full active:scale-95"
                    style={{ left: `${p.x}%`, top: `${p.y}%` }}
                    onMouseDown={(e) => { e.stopPropagation(); longPressStart(p, e); }}
                    onMouseUp={(e) => { e.stopPropagation(); longPressEnd(); }}
                    onMouseLeave={() => longPressEnd()}
                    onTouchStart={(e) => { e.stopPropagation(); longPressStart(p, e); }}
                    onTouchEnd={(e) => { e.stopPropagation(); longPressEnd(); }}>
              <PinDroplet color={p.color} visited={p.visited} />
            </button>
          ))}

          {/* 長押しメニュー */}
          {menu && (() => {
            const pin = pins.find(p => p.id === menu.id);
            if (!pin) return null;
            return (
              <div
                className="absolute z-10 bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.18)] border border-black/5 overflow-hidden"
                style={{
                  left: `${menu.x}%`,
                  top: `${menu.y}%`,
                  transform: 'translate(-50%, calc(-100% - 50px))',
                  width: 180,
                  animation: 'popIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
                onClick={(e) => e.stopPropagation()}>
                <div className="px-3 py-2 border-b border-black/5 text-[11px] font-bold truncate">{pin.name}</div>
                <button onClick={() => skip(pin.id)} className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#FAFAFA] active:bg-[#F0F0F0] text-left">
                  <SkipForward size={16} className="text-[#666]" />
                  <span className="text-[13px] font-semibold flex-1">スキップ</span>
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#FAFAFA] active:bg-[#F0F0F0] text-left">
                  <Star size={16} className="text-[#FFCC00]" fill="#FFCC00" />
                  <span className="text-[13px] font-semibold flex-1">行きたい</span>
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#FAFAFA] active:bg-[#F0F0F0] text-left">
                  <ArrowRight size={16} className="text-[#4A90C2]" />
                  <span className="text-[13px] font-semibold flex-1">詳細を開く</span>
                </button>
                {/* メニューの三角しっぽ */}
                <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-r border-b border-black/5" />
              </div>
            );
          })()}

          {/* 操作ヒント */}
          <div className="absolute bottom-3 left-3 right-3 bg-black/75 text-white text-[11px] rounded-full px-3 py-1.5 text-center backdrop-blur">
            💡 ピンを 長押し してみて
          </div>
        </div>

        <style jsx>{`
          @keyframes popIn { from { opacity: 0; transform: translate(-50%, calc(-100% - 30px)) scale(0.9); } to { opacity: 1; transform: translate(-50%, calc(-100% - 50px)) scale(1); } }
        `}</style>

        <div className="mt-4 mb-12 text-[12px] text-[var(--color-subtext)] leading-relaxed">
          <p className="mb-1"><b>👍 良いところ</b>: シート開かんでも 地図上で完結。テンポよく回せる</p>
          <p className="mb-1"><b>🤔 弱いところ</b>: 長押しの発見性が低い。長押し時間 (600ms) が長すぎ/短すぎの調整が必要</p>
        </div>
      </div>
    </div>
  );
}
