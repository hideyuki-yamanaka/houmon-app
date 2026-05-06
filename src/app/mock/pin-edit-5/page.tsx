'use client';

// 案 5: 微調整スライダー (上下左右の矢印 + ±50m)
// - ピンを直接触らず、矢印ボタンや方向スライダーで数 m 単位で動かす
// - ジオコード結果が街区中央に落ちて、実際の家まで数件分ズレる時に強い

import Link from 'next/link';
import { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import MockMap, { MapPin2 } from '../_pin-edit-shared/MockMap';

const INITIAL_ADDRESS = '旭川市東光6条8丁目';
const NEAR_ADDRESSES = [
  '旭川市東光6条8丁目', '旭川市東光6条9丁目', '旭川市東光7条8丁目',
  '旭川市東光5条8丁目', '旭川市東光7条9丁目', '旭川市東光6条7丁目',
];

const STEP_PX = 12; // 1 タップで動く距離 (約 5m 相当)

export default function PinEdit5Page() {
  const initialPos = { x: 200, y: 220 };
  const [pos, setPos] = useState(initialPos);

  const addr = NEAR_ADDRESSES[Math.abs(Math.floor((pos.x + pos.y * 7) / 50)) % NEAR_ADDRESSES.length];
  const dx = pos.x - initialPos.x;
  const dy = pos.y - initialPos.y;
  const distM = Math.round(Math.hypot(dx, dy) * 0.4); // 適当に "メートル" 換算

  const move = (mx: number, my: number) =>
    setPos(p => ({ x: Math.max(20, Math.min(380, p.x + mx)), y: Math.max(20, Math.min(440, p.y + my)) }));
  const reset = () => setPos(initialPos);

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-20">
      <div className="max-w-[420px] mx-auto px-4 py-4">
        <Link href="/mock/pin-edit" className="text-[12px] text-[var(--color-primary)] underline">← 5 案一覧</Link>
        <h1 className="text-lg font-bold mt-2 mb-1">案 5: 微調整スライダー</h1>
        <p className="text-[11px] text-[var(--color-subtext)] mb-3">
          矢印ボタンで <b>1 タップ ≈ 5m</b> 単位で動かせます。街区中央に落ちたピンを正確な家の前まで詰める時に。
        </p>

        <div className="bg-white rounded-xl p-3 mb-2 border border-[#E5E7EB]">
          <div className="text-[10px] text-[var(--color-subtext)] mb-0.5">住所 ({distM}m 移動)</div>
          <div className="text-[14px] font-bold">{addr}</div>
        </div>

        <MockMap height={380}>
          <div className="absolute" style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -100%)' }}>
            <MapPin2 />
          </div>
          {/* 元の位置を破線で表示 */}
          {(dx !== 0 || dy !== 0) && (
            <div
              className="absolute w-4 h-4 rounded-full border-2 border-dashed border-[#9CA3AF]"
              style={{ left: initialPos.x, top: initialPos.y, transform: 'translate(-50%, -50%)' }}
            />
          )}
        </MockMap>

        {/* 矢印 D-Pad */}
        <div className="bg-white rounded-2xl p-4 mt-3 border border-[#E5E7EB]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-bold">微調整 (1 タップ ≈ 5m)</span>
            <button
              onClick={reset}
              disabled={dx === 0 && dy === 0}
              className="text-[11px] text-[var(--color-subtext)] inline-flex items-center gap-1 active:opacity-60 disabled:opacity-30"
            >
              <RotateCcw size={12} />元の位置
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 max-w-[220px] mx-auto">
            <div />
            <button onClick={() => move(0, -STEP_PX)} className="h-12 rounded-xl bg-[#F3F4F6] active:bg-[#E5E7EB] flex items-center justify-center"><ArrowUp size={20} /></button>
            <div />
            <button onClick={() => move(-STEP_PX, 0)} className="h-12 rounded-xl bg-[#F3F4F6] active:bg-[#E5E7EB] flex items-center justify-center"><ArrowLeft size={20} /></button>
            <div className="h-12 rounded-xl bg-[#FEF2F2] flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
            </div>
            <button onClick={() => move(STEP_PX, 0)} className="h-12 rounded-xl bg-[#F3F4F6] active:bg-[#E5E7EB] flex items-center justify-center"><ArrowRight size={20} /></button>
            <div />
            <button onClick={() => move(0, STEP_PX)} className="h-12 rounded-xl bg-[#F3F4F6] active:bg-[#E5E7EB] flex items-center justify-center"><ArrowDown size={20} /></button>
            <div />
          </div>
        </div>

        <p className="text-[11px] text-[var(--color-subtext)] mt-2">
          💡 操作のヒント: 矢印を連打 or 長押しで方向に動かせます。「元の位置」でリセット。
        </p>
      </div>
    </div>
  );
}
