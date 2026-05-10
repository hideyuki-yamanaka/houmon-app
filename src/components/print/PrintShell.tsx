'use client';

// A4 横サイズ (297mm × 210mm) のフレームを画面で見られるようにする shell。
// 中身 (children) がレイアウト案。
// スマホでは縮小表示、PC では 100% 表示。

import type { ReactNode } from 'react';

export function A4LandscapeFrame({
  children, label, caption,
}: { children: ReactNode; label?: string; caption?: string }) {
  return (
    <div className="mb-6">
      {label && (
        <div className="px-1 mb-2">
          <h2 className="text-sm font-bold text-[#000]">{label}</h2>
          {caption && <p className="text-[11px] text-[#525252] mt-0.5 leading-relaxed">{caption}</p>}
        </div>
      )}
      <div
        className="a4-frame mx-auto"
        style={{
          width: '297mm',
          height: '210mm',
          maxWidth: '100%',
          background: '#FFFFFF',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          color: '#111',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif',
          fontSize: '11pt',
          lineHeight: 1.5,
          boxSizing: 'border-box',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {children}
      </div>
      <style jsx>{`
        @media (max-width: 1100px) {
          .a4-frame {
            transform: scale(0.32);
            transform-origin: top left;
            margin-bottom: -143mm; /* 縮小ぶん下にできた空白を詰める */
            margin-left: 0;
          }
        }
      `}</style>
    </div>
  );
}

// パレット (iOS systemColors) — 印刷でも視認しやすい
export const PRINT_COLORS = {
  text: '#000000',
  sub: '#3C3C43',
  muted: '#6E6E73',
  border: '#C7C7CC',
  borderSoft: '#E5E5EA',
  bg: '#F2F2F7',
  young: '#5AC8FA',
  primary: '#007AFF',
  good: { bg: '#D6F4DE', border: '#34C759', text: '#1D7A3F' },
  mid:  { bg: '#FFF6CC', border: '#FFCC00', text: '#B25E07' },
  bad:  { bg: '#FFE5E3', border: '#FF3B30', text: '#B91C1C' },
  unk:  { bg: '#F2F2F7', border: '#E5E5EA', text: '#8E8E93' },
} as const;

// ステータスチップ色 (訪問ログ用)
export const VISIT_STATUS_COLOR: Record<string, { border: string; text: string }> = {
  met_self:        { border: '#34C759', text: '#1D7A3F' },
  met_family:      { border: '#34C759', text: '#1D7A3F' },
  absent:          { border: '#8E8E93', text: '#3C3C43' },
  refused:         { border: '#FF3B30', text: '#B91C1C' },
  unknown_address: { border: '#FF9500', text: '#C2410C' },
  moved:           { border: '#AF52DE', text: '#7B2DBF' },
};
export const VISIT_STATUS_LABEL: Record<string, string> = {
  met_self: '本人に会えた',
  met_family: '家族に会えた',
  absent: '不在',
  refused: '拒否',
  unknown_address: '住所不明',
  moved: '転居',
};
export const RESPONDENT_LABEL: Record<string, string> = {
  father: '父', mother: '母', wife: '妻', son: '息子', sibling: '兄弟姉妹',
};
