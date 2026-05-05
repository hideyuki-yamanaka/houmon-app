'use client';

// ──────────────────────────────────────────────────────────────
// メンバーのピン位置を地図上で編集する画面
//
// 機能:
//   - 現在の lat/lng (無ければ豊岡デフォルト) にピンを表示
//   - ドラッグでピンを動かせる
//   - 「住所から再取得」: /api/geocode 経由で Nominatim に問い合わせ、
//     得られた座標にピンを移動 (DB はまだ書き換えない)
//   - 「保存」: 現在のピン位置を members.lat/lng に書き込み、戻る
//   - 「キャンセル」: 何も保存せず戻る
//
// 注意: Leaflet は SSR 不可なので親で dynamic import してる。
// ──────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, RotateCcw, Check } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import type { Member } from '../../../../lib/types';
import { getMember, updateMember } from '../../../../lib/storage';
import { MAP_DEFAULT_CENTER } from '../../../../lib/constants';
import { tapHaptic } from '../../../../lib/haptics';

// シンプルな赤ピン (drag 中も視認しやすい)。MapView の通常ピンと別系統。
const EDIT_PIN_ICON = L.divIcon({
  className: 'pin-edit-icon',
  html: `
    <svg width="32" height="44" viewBox="0 0 28 40" fill="none" style="
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
    ">
      <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 40 14 40S28 24.5 28 14C28 6.268 21.732 0 14 0Z"
            fill="#EF4444" stroke="#FFFFFF" stroke-width="2"/>
      <circle cx="14" cy="13.5" r="5" fill="#FFFFFF"/>
    </svg>
  `,
  iconSize: [32, 44],
  iconAnchor: [16, 44],
});

const TILE_URL = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ja&scale=2';
const TILE_ATTRIBUTION = '&copy; Google';

export default function PinEditView() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [originalPos, setOriginalPos] = useState<[number, number] | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMember(id)
      .then(m => {
        if (cancelled || !m) { setLoading(false); return; }
        setMember(m);
        const initial: [number, number] =
          m.lat != null && m.lng != null ? [m.lat, m.lng] : MAP_DEFAULT_CENTER;
        setPosition(initial);
        setOriginalPos(initial);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const handleSave = async () => {
    if (!position) return;
    tapHaptic();
    setSaving(true);
    setError(null);
    try {
      await updateMember(id, { lat: position[0], lng: position[1] });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  const handleResetFromAddress = async () => {
    if (!member?.address) {
      setError('住所が未入力のため再取得できません');
      return;
    }
    tapHaptic();
    setResetting(true);
    setError(null);
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(member.address)}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error ?? `失敗 (${r.status})`);
      if (!data?.found) {
        setError('住所からの位置特定に失敗しました。手動でドラッグしてください。');
        return;
      }
      setPosition([data.lat, data.lng]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-[var(--color-subtext)]" />
      </div>
    );
  }
  if (!member || !position) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-[var(--color-subtext)]">
        メンバーが見つかりませんでした
      </div>
    );
  }

  const moved =
    originalPos != null &&
    (Math.abs(position[0] - originalPos[0]) > 1e-7 ||
      Math.abs(position[1] - originalPos[1]) > 1e-7);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* ヘッダー */}
      <header className="flex items-center gap-2 px-3 h-12 border-b border-[#E5E5EA] shrink-0 bg-white">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-9 h-9 -ml-2 rounded-full flex items-center justify-center active:bg-gray-100"
          aria-label="戻る"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-bold truncate">{member.name}</div>
          <div className="text-[11px] text-[var(--color-subtext)] truncate">ピン位置を編集</div>
        </div>
      </header>

      {/* マップ本体 */}
      <div className="flex-1 relative">
        <MapContainer
          center={position}
          zoom={17}
          style={{ height: '100%', width: '100%' }}
          attributionControl={false}
        >
          <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
          <Marker
            position={position}
            icon={EDIT_PIN_ICON}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const m = e.target as L.Marker;
                const ll = m.getLatLng();
                setPosition([ll.lat, ll.lng]);
              },
            }}
          />
        </MapContainer>
      </div>

      {/* フッター: 操作 */}
      <div className="border-t border-[#E5E5EA] px-3 py-3 space-y-2 bg-white shrink-0">
        <p className="text-[11px] text-[var(--color-subtext)] leading-snug">
          地図上のピンをドラッグして正しい位置に移動 → 「保存」を押してください。
          {member.address && (
            <span className="block mt-1">住所: {member.address}</span>
          )}
        </p>
        {error && (
          <p className="text-[11px] text-red-600">{error}</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleResetFromAddress}
            disabled={resetting || !member.address}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-full border border-[#E5E5EA] bg-white text-[13px] font-medium disabled:opacity-50 active:bg-gray-50"
          >
            {resetting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
            住所から再取得
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !moved}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-full bg-[#111] text-white text-[13px] font-bold disabled:opacity-50 active:scale-95 transition-transform"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2.4} />}
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
