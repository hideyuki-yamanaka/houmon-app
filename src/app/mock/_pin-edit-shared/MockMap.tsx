'use client';

// 5 案のピン編集 mock 共通: グリッドベースのフェイクマップ。
// 実物の Google Maps を載せると重いし URL 共有もしづらいので、
// ジェスチャ感だけ伝える簡易版。
// children に好きなオーバーレイ要素 (ピン/十字/etc) を投げる。

import type { ReactNode } from 'react';

interface MockMapProps {
  height?: number; // px
  children?: ReactNode;
  /** マップ自体を動かす演出用のオフセット (px)。各 mock が状態管理する。 */
  panOffset?: { x: number; y: number };
}

export default function MockMap({ height = 460, children, panOffset = { x: 0, y: 0 } }: MockMapProps) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl bg-[#E8ECEF] select-none touch-none"
      style={{ height }}
    >
      {/* 地図っぽい見た目のレイヤー (グリッド + ブロック + 道路) */}
      <div
        className="absolute inset-0 transition-transform duration-100"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          backgroundColor: '#E8ECEF',
          backgroundImage: [
            // 細かいグリッド
            'linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px)',
            'linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)',
          ].join(', '),
          backgroundSize: '32px 32px',
        }}
      >
        {/* 道路 (白い太線) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
          <line x1="0" y1="120" x2="100%" y2="120" stroke="#FFFFFF" strokeWidth="22" />
          <line x1="0" y1="320" x2="100%" y2="320" stroke="#FFFFFF" strokeWidth="14" />
          <line x1="140" y1="0" x2="140" y2="100%" stroke="#FFFFFF" strokeWidth="18" />
          <line x1="280" y1="0" x2="280" y2="100%" stroke="#FFFFFF" strokeWidth="12" />
          {/* 公園っぽい緑 */}
          <rect x="20" y="200" width="100" height="90" fill="#D5E5D5" rx="4" />
          {/* 建物っぽい薄い四角 */}
          <rect x="160" y="20" width="100" height="80" fill="#F5F5F0" rx="2" />
          <rect x="160" y="140" width="100" height="160" fill="#F5F5F0" rx="2" />
          <rect x="300" y="140" width="80" height="160" fill="#F5F5F0" rx="2" />
          <rect x="20" y="20" width="100" height="80" fill="#F5F5F0" rx="2" />
          <rect x="20" y="340" width="200" height="100" fill="#F5F5F0" rx="2" />
          <rect x="240" y="340" width="180" height="100" fill="#F5F5F0" rx="2" />
        </svg>
        {/* 道路名のラベル (それっぽさ強化) */}
        <span className="absolute text-[9px] text-[#9CA3AF] left-3 top-[108px] tracking-wide">本通り</span>
        <span className="absolute text-[9px] text-[#9CA3AF] left-[148px] top-2 tracking-wide rotate-90 origin-top-left translate-y-2">5 条通り</span>
      </div>

      {/* オーバーレイ要素 (ピン等) は children として受け取る */}
      <div className="absolute inset-0 pointer-events-none">{children}</div>
    </div>
  );
}

/** 標準ピン (lucide MapPin 風)。タップ可、ref で要素アクセス可。 */
export function MapPin2({
  size = 40,
  color = '#EF4444',
  lifted = false,
}: { size?: number; color?: string; lifted?: boolean }) {
  return (
    <svg
      width={size}
      height={size * 1.3}
      viewBox="0 0 24 32"
      style={{
        filter: lifted
          ? 'drop-shadow(0 8px 12px rgba(0,0,0,0.35))'
          : 'drop-shadow(0 2px 3px rgba(0,0,0,0.25))',
        transform: lifted ? 'translateY(-8px) scale(1.1)' : 'none',
        transition: 'transform 0.15s ease, filter 0.15s ease',
      }}
    >
      <path
        d="M12 0C5.4 0 0 5.4 0 12c0 8 12 20 12 20s12-12 12-20c0-6.6-5.4-12-12-12z"
        fill={color}
      />
      <circle cx="12" cy="12" r="4.5" fill="#FFFFFF" />
    </svg>
  );
}
