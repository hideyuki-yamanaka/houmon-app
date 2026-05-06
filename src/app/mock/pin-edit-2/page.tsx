'use client';

// 案 2: 中央十字 + 地図を動かす (iOS 写真トリミング風)
// - 「位置を修正」ボタンで編集モード ON
// - 編集中: 画面中央に十字マーカーが固定、地図側を指でドラッグして合わせる
// - 「ここに決定」で確定
//
// 実装ポイント: ピン本体は触らない。地図 (MockMap の panOffset) をドラッグで動かす。

import Link from 'next/link';
import { useState, useRef } from 'react';
import { Crosshair, Pencil } from 'lucide-react';
import MockMap, { MapPin2 } from '../_pin-edit-shared/MockMap';

const INITIAL_ADDRESS = '旭川市東光6条8丁目';
const NEAR_ADDRESSES = [
  '旭川市東光6条8丁目', '旭川市東光6条9丁目', '旭川市東光7条8丁目',
  '旭川市東光5条8丁目', '旭川市東光7条9丁目', '旭川市東光6条7丁目',
];

export default function PinEdit2Page() {
  const [editing, setEditing] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [committedAddr, setCommittedAddr] = useState(INITIAL_ADDRESS);
  const dragStart = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const draftAddr = editing
    ? NEAR_ADDRESSES[Math.abs(Math.floor((pan.x + pan.y * 7) / 30)) % NEAR_ADDRESSES.length]
    : committedAddr;

  const onDown = (e: React.PointerEvent) => {
    if (!editing) return;
    e.preventDefault();
    dragStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!editing || !dragStart.current) return;
    setPan({
      x: dragStart.current.px + (e.clientX - dragStart.current.x),
      y: dragStart.current.py + (e.clientY - dragStart.current.y),
    });
  };
  const onUp = () => { dragStart.current = null; };

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-32">
      <div className="max-w-[420px] mx-auto px-4 py-4">
        <Link href="/mock/pin-edit" className="text-[12px] text-[var(--color-primary)] underline">← 5 案一覧</Link>
        <h1 className="text-lg font-bold mt-2 mb-1">案 2: 中央十字で位置合わせ</h1>
        <p className="text-[11px] text-[var(--color-subtext)] mb-3">
          「位置を修正」を押すと中央に十字が出ます。<b>地図を指で動かして</b>位置を合わせ、「ここに決定」で確定。
        </p>

        {/* 住所 */}
        <div className="bg-white rounded-xl p-3 mb-2 border border-[#E5E7EB]">
          <div className="text-[10px] text-[var(--color-subtext)] mb-0.5">住所 {editing && '(プレビュー)'}</div>
          <div className="text-[14px] font-bold">{draftAddr}</div>
        </div>

        {/* 地図 */}
        <div
          className="relative"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <MockMap height={460} panOffset={pan}>
            {/* 編集中以外は通常のピン (地図と一緒に動く) */}
            {!editing && (
              <div className="absolute" style={{ left: 200 + pan.x, top: 220 + pan.y, transform: 'translate(-50%, -100%)' }}>
                <MapPin2 />
              </div>
            )}
          </MockMap>

          {/* 編集中の中央固定十字 (画面中央、地図と一緒に動かない) */}
          {editing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative">
                <Crosshair size={56} strokeWidth={1.5} className="text-[#111]" />
                <div className="absolute top-1/2 left-1/2 w-2 h-2 -mt-1 -ml-1 rounded-full bg-[#EF4444]" />
              </div>
            </div>
          )}
        </div>

        <p className="text-[11px] text-[var(--color-subtext)] mt-2">
          💡 編集中は <b>地図側を動かす</b> (ピンタップ不要)。中央の十字 ＝ ピンの新しい位置。
        </p>
      </div>

      {/* 下部のアクションバー */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-[#E5E7EB] p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        <div className="max-w-[420px] mx-auto flex items-center gap-2">
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="w-full h-11 rounded-full bg-[#111] text-white text-[14px] font-bold active:scale-95 inline-flex items-center justify-center gap-2"
            >
              <Pencil size={16} />
              位置を修正
            </button>
          ) : (
            <>
              <button
                onClick={() => { setEditing(false); setPan({ x: 0, y: 0 }); }}
                className="px-4 h-11 rounded-full text-[13px] font-bold text-[#374151] active:bg-[#F3F4F6]"
              >
                取消
              </button>
              <button
                onClick={() => { setEditing(false); setCommittedAddr(draftAddr); setPan({ x: 0, y: 0 }); }}
                className="flex-1 h-11 rounded-full bg-[#111] text-white text-[14px] font-bold active:scale-95"
              >
                ここに決定
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
