'use client';

// 案 4: 住所 ⇔ ピン 双方向同期方式
// - 上の住所入力欄を編集すると、地図のピンが移動 (forward geocode 風)
// - 地図のピンをドラッグすると、上の住所欄が更新 (reverse geocode 風)
// - 「町目以降が不明」みたいな曖昧住所のときに、両方から詰めていける
//
// mock では本物のジオコーダではなく、住所文字列の長さや座標値からダミー連動。

import Link from 'next/link';
import { useState, useRef } from 'react';
import { MapPin } from 'lucide-react';
import MockMap, { MapPin2 } from '../_pin-edit-shared/MockMap';

const INITIAL_ADDRESS = '旭川市東光6条8丁目';
const NEAR_ADDRESSES = [
  '旭川市東光6条8丁目', '旭川市東光6条9丁目', '旭川市東光7条8丁目',
  '旭川市東光5条8丁目', '旭川市東光7条9丁目', '旭川市東光6条7丁目',
];

export default function PinEdit4Page() {
  const [pos, setPos] = useState({ x: 200, y: 220 });
  const [addr, setAddr] = useState(INITIAL_ADDRESS);
  const [editingAddr, setEditingAddr] = useState(false);
  const dragging = useRef(false);
  const mapRef = useRef<HTMLDivElement>(null);

  const mockGeocode = (x: number, y: number) =>
    NEAR_ADDRESSES[Math.abs(Math.floor((x + y * 7) / 50)) % NEAR_ADDRESSES.length];

  const onPinDown = (e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const map = mapRef.current?.getBoundingClientRect();
    if (!map) return;
    const x = Math.max(20, Math.min(map.width - 20, e.clientX - map.left));
    const y = Math.max(20, Math.min(map.height - 30, e.clientY - map.top));
    setPos({ x, y });
    if (!editingAddr) setAddr(mockGeocode(x, y));
  };
  const onUp = () => { dragging.current = false; };

  const onAddrChange = (v: string) => {
    setAddr(v);
    // mock の forward geocode: 住所文字列のハッシュで適当に座標生成
    const hash = v.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
    setPos({ x: 60 + (hash * 17) % 280, y: 60 + (hash * 23) % 360 });
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-20">
      <div className="max-w-[420px] mx-auto px-4 py-4">
        <Link href="/mock/pin-edit" className="text-[12px] text-[var(--color-primary)] underline">← 5 案一覧</Link>
        <h1 className="text-lg font-bold mt-2 mb-1">案 4: 住所 ⇔ ピン 双方向</h1>
        <p className="text-[11px] text-[var(--color-subtext)] mb-3">
          住所欄を打つとピンが動き、ピンを動かすと住所欄が更新されます。
        </p>

        {/* 住所入力欄 */}
        <div className="bg-white rounded-xl p-3 mb-2 border border-[#E5E7EB]">
          <label className="text-[10px] text-[var(--color-subtext)] block mb-1">住所</label>
          <div className="flex items-center gap-2">
            <MapPin size={16} className="shrink-0 text-[var(--color-subtext)]" />
            <input
              type="text"
              value={addr}
              onChange={e => onAddrChange(e.target.value)}
              onFocus={() => setEditingAddr(true)}
              onBlur={() => setEditingAddr(false)}
              className="flex-1 text-[14px] font-bold outline-none border-b border-[#E5E7EB] focus:border-[#111] py-1"
              placeholder="住所を入力"
            />
          </div>
          <p className="text-[10px] text-[var(--color-subtext)] mt-1">
            {editingAddr ? '✏️ 入力中: ピンが連動して移動' : '📍 ピンをドラッグで住所が更新'}
          </p>
        </div>

        {/* マップ */}
        <div
          ref={mapRef}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <MockMap height={400}>
            <div
              className="absolute touch-none"
              style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -100%)', pointerEvents: 'auto' }}
              onPointerDown={onPinDown}
            >
              <MapPin2 lifted={dragging.current} />
            </div>
          </MockMap>
        </div>

        <p className="text-[11px] text-[var(--color-subtext)] mt-2">
          💡 操作のヒント: 住所欄をタップして打ち変えるか、ピンを直接ドラッグしてください。
        </p>
      </div>
    </div>
  );
}
