'use client';

// 案 1: 長押しドラッグ (Google Maps 風)
// - ピンを 500ms 長押し → ピン浮き上がり + ハプティック
// - そのままドラッグで移動
// - 指を離す → 確認スナックバー (取消/決定)
//
// 実装ポイント:
//   pointerdown → setTimeout(500) → 長押し成立で「ドラッグ中」状態
//   pointermove で位置を追従
//   pointerup でスナックバー表示
//   指リリース後でも「取消」を押すと元の位置に戻る

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import MockMap, { MapPin2 } from '../_pin-edit-shared/MockMap';

const INITIAL_ADDRESS = '旭川市東光6条8丁目';
const NEAR_ADDRESSES = [
  '旭川市東光6条8丁目', '旭川市東光6条9丁目', '旭川市東光7条8丁目',
  '旭川市東光5条8丁目', '旭川市東光7条9丁目',
];

export default function PinEdit1Page() {
  const initialPos = { x: 200, y: 220 };
  const [pos, setPos] = useState(initialPos);
  const [committedPos, setCommittedPos] = useState(initialPos);
  const [committedAddr, setCommittedAddr] = useState(INITIAL_ADDRESS);
  const [draftAddr, setDraftAddr] = useState(INITIAL_ADDRESS);
  const [phase, setPhase] = useState<'idle' | 'press' | 'drag' | 'pending'>('idle');
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // ピン位置から「住所っぽい候補」を擬似ジオコード (mock)
  const mockGeocode = (x: number, y: number) => {
    const idx = Math.abs(Math.floor((x + y * 7) / 50)) % NEAR_ADDRESSES.length;
    return NEAR_ADDRESSES[idx];
  };

  useEffect(() => {
    return () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (phase === 'pending') return;
    e.preventDefault();
    setPhase('press');
    longPressTimer.current = setTimeout(() => {
      setPhase('drag');
      // ハプティック (対応端末のみ)
      if ('vibrate' in navigator) navigator.vibrate(15);
    }, 500);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (phase !== 'drag') return;
    const map = mapRef.current?.getBoundingClientRect();
    if (!map) return;
    const x = e.clientX - map.left;
    const y = e.clientY - map.top;
    setPos({ x: Math.max(20, Math.min(map.width - 20, x)), y: Math.max(20, Math.min(map.height - 30, y)) });
    setDraftAddr(mockGeocode(x, y));
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    if (phase === 'drag') {
      setPhase('pending');
    } else {
      setPhase('idle');
    }
  };

  const cancel = () => {
    setPos(committedPos);
    setDraftAddr(committedAddr);
    setPhase('idle');
  };
  const confirm = () => {
    setCommittedPos(pos);
    setCommittedAddr(draftAddr);
    setPhase('idle');
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-32">
      <div className="max-w-[420px] mx-auto px-4 py-4">
        <Link href="/mock/pin-edit" className="text-[12px] text-[var(--color-primary)] underline">← 5 案一覧</Link>
        <h1 className="text-lg font-bold mt-2 mb-1">案 1: 長押しドラッグ</h1>
        <p className="text-[11px] text-[var(--color-subtext)] mb-3">
          ピンを <b>500ms 長押し</b> すると浮き上がり、そのままドラッグできます。
          離すと下に確認バーが出ます。
        </p>

        {/* 住所表示 */}
        <div className="bg-white rounded-xl p-3 mb-2 border border-[#E5E7EB]">
          <div className="text-[10px] text-[var(--color-subtext)] mb-0.5">住所 (ピン連動)</div>
          <div className="text-[14px] font-bold tabular-nums">{phase === 'idle' ? committedAddr : draftAddr}</div>
          {phase !== 'idle' && phase !== 'pending' && (
            <div className="text-[10px] text-[#0EA5E9] mt-0.5">住所更新中…</div>
          )}
        </div>

        {/* マップ + ピン */}
        <div ref={mapRef}>
          <MockMap height={460}>
            <div
              className="absolute touch-none"
              style={{
                left: pos.x, top: pos.y,
                transform: 'translate(-50%, -100%)',
                pointerEvents: 'auto',
                cursor: phase === 'drag' ? 'grabbing' : 'grab',
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <MapPin2 lifted={phase === 'drag' || phase === 'pending'} />
              {phase === 'press' && (
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] bg-[#111] text-white px-2 py-0.5 rounded-full whitespace-nowrap">
                  押し続けて…
                </span>
              )}
            </div>
          </MockMap>
        </div>

        <p className="text-[11px] text-[var(--color-subtext)] mt-2">
          💡 操作のヒント: 赤いピンを指で <b>長押し</b> (1 秒くらい) してそのまま動かしてみてください。
        </p>
      </div>

      {/* 確認スナックバー */}
      {phase === 'pending' && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-[#E5E7EB] p-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
          <div className="max-w-[420px] mx-auto flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-[var(--color-subtext)]">この位置に変更</div>
              <div className="text-[13px] font-bold truncate">{draftAddr}</div>
            </div>
            <button
              onClick={cancel}
              className="px-3 h-9 rounded-full text-[12px] font-bold text-[#374151] active:bg-[#F3F4F6]"
            >
              取消
            </button>
            <button
              onClick={confirm}
              className="px-4 h-9 rounded-full text-[12px] font-bold bg-[#111] text-white active:scale-95"
            >
              決定
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
