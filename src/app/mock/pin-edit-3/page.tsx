'use client';

// 案 3: 地図ロングタップで新規ピン落とし方式
// - 地図上の好きな場所を 500ms 長押し → そこに「仮ピン」が落ちる
// - 確認モーダル: 「このメンバーの位置をここに変更しますか？」
// - OK で更新、キャンセルで仮ピンも消える

import Link from 'next/link';
import { useState, useRef } from 'react';
import MockMap, { MapPin2 } from '../_pin-edit-shared/MockMap';

const INITIAL_ADDRESS = '旭川市東光6条8丁目';
const NEAR_ADDRESSES = [
  '旭川市東光6条8丁目', '旭川市東光6条9丁目', '旭川市東光7条8丁目',
  '旭川市東光5条8丁目', '旭川市東光7条9丁目',
];

export default function PinEdit3Page() {
  const [pinPos, setPinPos] = useState({ x: 200, y: 220 });
  const [committedAddr, setCommittedAddr] = useState(INITIAL_ADDRESS);
  const [tempPin, setTempPin] = useState<{ x: number; y: number; addr: string } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const downPos = useRef<{ x: number; y: number } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const mockGeocode = (x: number, y: number) =>
    NEAR_ADDRESSES[Math.abs(Math.floor((x + y * 7) / 50)) % NEAR_ADDRESSES.length];

  const onDown = (e: React.PointerEvent) => {
    const map = mapRef.current?.getBoundingClientRect();
    if (!map) return;
    const x = e.clientX - map.left;
    const y = e.clientY - map.top;
    downPos.current = { x, y };
    longPressTimer.current = setTimeout(() => {
      // ハプティック
      if ('vibrate' in navigator) navigator.vibrate(15);
      setTempPin({ x, y, addr: mockGeocode(x, y) });
    }, 500);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!longPressTimer.current || !downPos.current) return;
    const map = mapRef.current?.getBoundingClientRect();
    if (!map) return;
    const x = e.clientX - map.left;
    const y = e.clientY - map.top;
    if (Math.hypot(x - downPos.current.x, y - downPos.current.y) > 10) {
      // 動いたら長押し中断
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };
  const onUp = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    downPos.current = null;
  };

  const cancelTemp = () => setTempPin(null);
  const confirmTemp = () => {
    if (!tempPin) return;
    setPinPos({ x: tempPin.x, y: tempPin.y });
    setCommittedAddr(tempPin.addr);
    setTempPin(null);
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-20">
      <div className="max-w-[420px] mx-auto px-4 py-4">
        <Link href="/mock/pin-edit" className="text-[12px] text-[var(--color-primary)] underline">← 5 案一覧</Link>
        <h1 className="text-lg font-bold mt-2 mb-1">案 3: 地図ロングタップで新規ピン</h1>
        <p className="text-[11px] text-[var(--color-subtext)] mb-3">
          地図の <b>好きな場所を長押し</b> (500ms) すると、そこに仮ピンが落ちます。確認 OK で位置を変更。
        </p>

        <div className="bg-white rounded-xl p-3 mb-2 border border-[#E5E7EB]">
          <div className="text-[10px] text-[var(--color-subtext)] mb-0.5">住所</div>
          <div className="text-[14px] font-bold">{committedAddr}</div>
        </div>

        <div
          ref={mapRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <MockMap height={460}>
            {/* 既存ピン (赤) */}
            <div className="absolute" style={{ left: pinPos.x, top: pinPos.y, transform: 'translate(-50%, -100%)' }}>
              <MapPin2 color="#EF4444" />
            </div>
            {/* 仮ピン (青) */}
            {tempPin && (
              <div className="absolute animate-bounce" style={{ left: tempPin.x, top: tempPin.y, transform: 'translate(-50%, -100%)' }}>
                <MapPin2 color="#0EA5E9" lifted />
              </div>
            )}
          </MockMap>
        </div>

        <p className="text-[11px] text-[var(--color-subtext)] mt-2">
          💡 操作のヒント: 移動先の場所を <b>1 秒くらい長押し</b>。青い仮ピンが落ちます。
        </p>
      </div>

      {/* 確認モーダル */}
      {tempPin && (
        <div className="fixed inset-0 bg-black/30 flex items-end z-50" onClick={cancelTemp}>
          <div className="w-full max-w-[420px] mx-auto bg-white rounded-t-2xl p-4 pb-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-[15px] font-bold mb-1">位置をここに変更しますか？</h3>
            <p className="text-[12px] text-[var(--color-subtext)] mb-3">新しい住所: <b className="text-[#111]">{tempPin.addr}</b></p>
            <div className="flex gap-2">
              <button
                onClick={cancelTemp}
                className="flex-1 h-11 rounded-full text-[13px] font-bold text-[#374151] bg-[#F3F4F6] active:scale-95"
              >
                取消
              </button>
              <button
                onClick={confirmTemp}
                className="flex-1 h-11 rounded-full bg-[#111] text-white text-[13px] font-bold active:scale-95"
              >
                変更する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
