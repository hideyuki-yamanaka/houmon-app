'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-rotate';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
} from 'react-leaflet';
import { Search as SearchIcon, ArrowRight, X as XIcon } from 'lucide-react';
import type { MemberWithVisitInfo } from '../lib/types';
import {
  MAP_DEFAULT_CENTER,
  MAP_DEFAULT_ZOOM,
  getMemberOrgColor,
} from '../lib/constants';
import { updateMember } from '../lib/storage';

// ─────────────────────────────────────────────
// 入力パーサ — 住所 / 「lat,lng」 / Google Maps URL を判別する。
// 編集モード上部の入力バーで使う。
// ─────────────────────────────────────────────
type ParsedLocation =
  | { type: 'coords'; lat: number; lng: number }
  | { type: 'address'; query: string }
  | null;
function parseLocationInput(input: string): ParsedLocation {
  const t = input.trim();
  if (!t) return null;

  // パターン1: "lat,lng" or "lat, lng" or "lat lng"
  const coordsMatch = t.match(/^(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)$/);
  if (coordsMatch) {
    const lat = parseFloat(coordsMatch[1]);
    const lng = parseFloat(coordsMatch[2]);
    if (
      Number.isFinite(lat) && Number.isFinite(lng)
      && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
    ) {
      return { type: 'coords', lat, lng };
    }
  }

  // パターン2: Google Maps URL に @lat,lng,zoom が含まれる
  // 例: https://www.google.com/maps/place/.../@43.7705,142.3651,17z/...
  const atMatch = t.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { type: 'coords', lat, lng };
    }
  }

  // パターン3: ?q=lat,lng / ?ll=lat,lng / ?query=lat,lng
  const qMatch = t.match(/[?&](?:q|ll|query)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { type: 'coords', lat, lng };
    }
  }

  // URL ぽいけど 座標が拾えなかった → unsupported (短縮 URL など)
  if (/^https?:\/\//.test(t)) return null;

  // それ以外は住所として扱う
  return { type: 'address', query: t };
}

// ── タイルレイヤー設定 ──
// Google Maps と同じタイルサーバーを使う
// - standard: 通常の道路地図 (lyrs=m)
// - satellite: 純粋な航空写真 (lyrs=s)
export type MapLayerMode = 'standard' | 'satellite';

// 2026-05-07 ヒデさん指摘で Google Maps 純正レベルの画質に近づける調整:
// - URL は scale=2 据置 (Retina 2x)。scale=4 にすると帯域 4倍だが体感差は小さい。
// - 代わりに tileSize=256 + detectRetina=true (下の TileLayer) で対応。
//   detectRetina が DPR 2+ デバイスで zoom+1 のタイルを要求して 2倍解像度を確保、
//   scale=2 と組み合わせて 計 4倍ピクセル密度 → DPR 3 (iPhone Pro) でも
//   1.3倍のダウンサンプリングでくっきり。
const TILE_URLS: Record<MapLayerMode, string> = {
  standard: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ja&scale=2',
  satellite: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}&hl=ja&scale=2',
};
const TILE_ATTRIBUTION = '&copy; Google';

interface MapViewProps {
  members: MemberWithVisitInfo[];
  selectedMemberId: string | null;
  onMemberSelect: (memberId: string) => void;
  onMapClick?: () => void;
  /** ユーザーがマップをドラッグで動かし始めた時に呼ばれる。
   *  HomePage 側でボトムシートを mini スナップに下げるのに使う。
   *  ピンタップで PanToSelected が動いた程度では呼ばれないよう、
   *  純粋な『ユーザードラッグ』イベントだけ拾う。 */
  onUserMapDrag?: () => void;
  layerMode?: MapLayerMode;
  /** ピン位置編集モード: この id のピンが draggable になる。
   *  ヒデさん指示 (2026-05-07): 旧 Google Maps 風 長押しトリガーを廃止し、
   *  ボトムシート内の「ピン編集」アイコン → 親が制御する props 経由 に切替。 */
  editingMemberId?: string | null;
  onEditingMemberIdChange?: (id: string | null) => void;
}

// ── GPS現在地マーカー（DivIcon — SVG CircleMarkerより位置安定） ──
const GPS_DOT_ICON = L.divIcon({
  className: 'gps-dot-icon',
  html: `<div style="
    width: 44px; height: 44px;
    display: flex; align-items: center; justify-content: center;
  ">
    <div style="
      position: absolute;
      width: 40px; height: 40px;
      border-radius: 50%;
      background: rgba(66,133,244,0.1);
    "></div>
    <div style="
      width: 14px; height: 14px;
      border-radius: 50%;
      background: #4285F4;
      border: 2.5px solid white;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
    "></div>
  </div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

// ── 本部/地区ごとに色分けしたピン ──
// - 色は getMemberOrgColor (constants.ts) を使用。MemberCard と完全に同じ色ロジック
// - 訪問済み = 塗りつぶし + 白いドット
// - 未訪問   = 白地 + 組織色のストローク + 組織色のドット
// - 未分類   = グレー（MEMBER_PIN_FALLBACK_COLOR）
// - 行きたいブックマーク中 = 黄色の丸バッジ + 白い星マーク (上の通常ピン色を上書き)
function createMemberPin(member: MemberWithVisitInfo, isSelected: boolean): L.DivIcon {
  const hasVisited = member.totalVisits > 0;
  const orgColor = getMemberOrgColor(member);
  const wantToVisit = !!member.wantToVisit;

  const pinColor = hasVisited ? orgColor : '#FFFFFF';
  const dotColor = hasVisited ? '#FFFFFF' : orgColor;
  const strokeColor = orgColor;

  const scale = isSelected ? 1.3 : 1;

  const w = 60;
  const h = 70;

  // 行きたい中 ⇒ 星バッジ。その他 ⇒ 通常の水滴ピン。
  // SVG の中身だけ切り替え、外枠の DivIcon サイズは同じに保つ
  // (アンカー/オフセットを変えずに済む)
  const innerSvg = wantToVisit
    ? `
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style="
        transform: scale(${scale});
        transform-origin: bottom center;
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        overflow: visible;
        filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));
      ">
        <circle cx="20" cy="20" r="18" fill="#FFCC00" stroke="#FFFFFF" stroke-width="2.5"/>
        <path d="M20 9 L23.09 16.26 L31 17.27 L25 22.71 L26.18 30.5 L20 26.27 L13.82 30.5 L15 22.71 L9 17.27 L16.91 16.26 Z"
              fill="#FFFFFF" stroke="#FFFFFF" stroke-width="0.8" stroke-linejoin="round"/>
      </svg>
    `
    : `
      <svg width="28" height="40" viewBox="0 0 28 40" fill="none" style="
        transform: scale(${scale});
        transform-origin: bottom center;
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        overflow: visible;
      ">
        <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 40 14 40S28 24.5 28 14C28 6.268 21.732 0 14 0Z"
              fill="${pinColor}" stroke="${strokeColor}" stroke-width="${hasVisited ? 1 : 2}"/>
        <circle cx="14" cy="13.5" r="5" fill="${dotColor}"/>
      </svg>
    `;

  const html = `
    <div style="
      width: ${w}px;
      height: ${h}px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      overflow: visible;
      cursor: pointer;
      will-change: transform;
    ">${innerSvg}</div>
  `;

  return L.divIcon({
    className: 'map-pin-icon',
    html,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h + 10],
  });
}

// ── 同じ住所に複数人いる時の クラスタピン ──
// (兄弟・家族など) 同じ lat/lng に重なるピンが 1個に見える問題を回避するため、
// グループ化して 「水滴ピン + 右上に人数バッジ」を 1個だけ立てる。
// タップすると 親が用意した cluster picker (ボトムシート) が開いて、
// その住所にいる全員を選べる。
function createClusterPin(members: MemberWithVisitInfo[], isSelected: boolean): L.DivIcon {
  const head = members[0];
  const orgColor = getMemberOrgColor(head);
  const anyVisited = members.some(m => m.totalVisits > 0);
  const anyWantToVisit = members.some(m => !!m.wantToVisit);

  const pinColor = anyVisited ? orgColor : '#FFFFFF';
  const dotColor = anyVisited ? '#FFFFFF' : orgColor;
  const strokeColor = orgColor;
  const scale = isSelected ? 1.3 : 1;
  const w = 60;
  const h = 70;
  const count = members.length;

  const inner = anyWantToVisit
    ? `
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style="
        transform: scale(${scale});
        transform-origin: bottom center;
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        overflow: visible;
        filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));
      ">
        <circle cx="20" cy="20" r="18" fill="#FFCC00" stroke="#FFFFFF" stroke-width="2.5"/>
        <path d="M20 9 L23.09 16.26 L31 17.27 L25 22.71 L26.18 30.5 L20 26.27 L13.82 30.5 L15 22.71 L9 17.27 L16.91 16.26 Z"
              fill="#FFFFFF" stroke="#FFFFFF" stroke-width="0.8" stroke-linejoin="round"/>
      </svg>
    `
    : `
      <svg width="28" height="40" viewBox="0 0 28 40" fill="none" style="
        transform: scale(${scale});
        transform-origin: bottom center;
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        overflow: visible;
        filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));
      ">
        <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 40 14 40S28 24.5 28 14C28 6.268 21.732 0 14 0Z"
              fill="${pinColor}" stroke="${strokeColor}" stroke-width="${anyVisited ? 1 : 2}"/>
        <circle cx="14" cy="13.5" r="5" fill="${dotColor}"/>
      </svg>
    `;

  // バッジは ピン頭部右上に重ねる。SVG 内ではなく外側 div で position:absolute
  // で配置することで、ピン本体の transform に合わせて拡縮できる。
  // 容器 60x70、ピンSVG (28x40) は flex-end + center で 下中央。
  // つまり SVG 占有矩形は x:16-44, y:30-70。
  // バッジはピン頭の右上に 少し重ねて 数字が読める位置に。
  //   - ピン頭の右端 (x=44) に左半分を被せる
  //   - 上端 (y=30) より 4px 上にはみ出す
  //   - z-index 2 で SVG (drop-shadow filter で stacking context 作る) より上
  //     に強制 → 兄弟 DOM 順だけだと iOS Safari でバッジが沈むことがある
  const badge = `
    <div style="
      position: absolute;
      top: 22px;
      right: 6px;
      min-width: 22px;
      height: 22px;
      padding: 0 5px;
      border-radius: 999px;
      background: #FF3B30;
      color: white;
      font-size: 12px;
      font-weight: 800;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #FFFFFF;
      box-shadow: 0 1px 3px rgba(0,0,0,0.35);
      box-sizing: border-box;
      transform: scale(${scale});
      transform-origin: top right;
      pointer-events: none;
      z-index: 2;
    ">${count}</div>
  `;

  // 内側 SVG を z-index:1 の div に包む。badge の z-index:2 と合わせて
  // 「badge が必ずピンの上に乗る」レイヤー順を強制。
  const html = `
    <div style="
      position: relative;
      width: ${w}px;
      height: ${h}px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      overflow: visible;
      cursor: pointer;
      will-change: transform;
    "><div style="position: relative; z-index: 1; display: flex; align-items: flex-end;">${inner}</div>${badge}</div>
  `;

  return L.divIcon({
    className: 'map-pin-icon-cluster',
    html,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h + 10],
  });
}

// 同じ住所判定の精度。 5桁 ≒ 1.1m。
// 兄弟など同じ建物に紐づくピンは確実に同じキーになる。
// 1m 以上ズラしたいユーザー操作 (手動ドラッグ) では別グループになる。
function coordKey(m: MemberWithVisitInfo): string {
  return `${m.lat!.toFixed(5)},${m.lng!.toFixed(5)}`;
}

// ── 選択メンバーにパン ──
// ボトムシートのアニメ(380ms)と同時にマップを動かすと iPhone ではコンポジター
// が詰まってガタガタになる。シートアニメが終わってから静かにパンする。
// また、ピンがシート(peek)の下に隠れないよう、少し上に寄せた位置にパンする。
const SHEET_PEEK_HEIGHT_PX = 270;
const SHEET_ANIM_SETTLE_MS = 420;
function PanToSelected({ members, selectedId }: { members: MemberWithVisitInfo[]; selectedId: string | null }) {
  const map = useMap();
  const prevRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedId || selectedId === prevRef.current) return;
    const m = members.find(x => x.id === selectedId);
    // members がまだロード中なら prevRef を更新せずリトライを待つ
    // （詳細ページから戻ってきた時、初回レンダーでは members が空のことがある）
    if (m?.lat == null || m?.lng == null) return;
    prevRef.current = selectedId;

    const latLng = L.latLng(m.lat, m.lng);
    const t = window.setTimeout(() => {
      // ピンをシートの上側に見せるため、画面中央より上にオフセット
      const zoom = map.getZoom();
      const targetPoint = map.project(latLng, zoom);
      targetPoint.y += SHEET_PEEK_HEIGHT_PX / 2;
      const adjusted = map.unproject(targetPoint, zoom);
      map.panTo(adjusted, { animate: true, duration: 0.3, easeLinearity: 0.5 });
    }, SHEET_ANIM_SETTLE_MS);

    return () => window.clearTimeout(t);
  }, [selectedId, members, map]);

  return null;
}

// 入力バーから渡された座標へ プログラムでパンする small helper.
// panTarget が更新されたら panTo + 必要なら zoom を保証する。
function PanToInputTarget({ panTarget }: { panTarget: { lat: number; lng: number; nonce: number } | null }) {
  const map = useMap();
  const lastNonceRef = useRef<number | null>(null);
  useEffect(() => {
    if (!panTarget) return;
    if (panTarget.nonce === lastNonceRef.current) return;
    lastNonceRef.current = panTarget.nonce;
    const zoom = map.getZoom();
    // ピン編集中は detail を見やすい zoom 17 以上を保証
    const targetZoom = zoom < 17 ? 17 : zoom;
    map.flyTo([panTarget.lat, panTarget.lng], targetZoom, { animate: true, duration: 0.5 });
  }, [panTarget, map]);
  return null;
}

// 編集モードに入った瞬間、対象ピンを画面の少し上(検索バーから余裕を持って下)に
// パンする。編集ピンは大きい (56px 上方向) ので、上端で見切れないようにする。
// (2026-05-07 ヒデさん指示)
function PanToEditing({ members, editingId }: { members: MemberWithVisitInfo[]; editingId: string | null }) {
  const map = useMap();
  const prevRef = useRef<string | null>(null);

  useEffect(() => {
    if (!editingId) {
      prevRef.current = null;
      return;
    }
    if (editingId === prevRef.current) return;
    const m = members.find(x => x.id === editingId);
    if (m?.lat == null || m?.lng == null) return;
    prevRef.current = editingId;

    const latLng = L.latLng(m.lat, m.lng);
    // 上 (検索バー) に約 80px、下 (タブバー) に 90px のクリアランスを確保した
    // 上で、編集ピン (56px 上方向) が中央 やや下に来るように寄せる。
    const t = window.setTimeout(() => {
      const zoom = map.getZoom();
      const targetPoint = map.project(latLng, zoom);
      // ピンを画面のやや下寄り (= map を少し上にパン) にして 上方向の余白を作る
      targetPoint.y -= 80;
      const adjusted = map.unproject(targetPoint, zoom);
      map.panTo(adjusted, { animate: true, duration: 0.3, easeLinearity: 0.5 });
    }, 200);

    return () => window.clearTimeout(t);
  }, [editingId, members, map]);

  return null;
}

// ========================================
// スムーズズーム（wheel / pinch 統一）
// - すべての wheel イベントをピンチと同じ連続ズームとして扱う
// - deltaMode に応じて係数を正規化
// - アニメーションなしで即時反映 → カクつきなし
// - ズーム値を0.01刻みに丸めてサブピクセルジッター防止
// ========================================
function SmoothZoomHandler() {
  const map = useMap();

  useEffect(() => {
    // leaflet-rotate の setTransform がサブピクセルで丸めないので
    // L.DomUtil.setPosition をパッチして座標を整数に丸める
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const origSetPosition = (L.DomUtil as any).setPosition;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (L.DomUtil as any).setPosition = function (...args: any[]) {
      const point = args[1] as L.Point | undefined;
      if (point && typeof point.x === 'number') {
        point.x = Math.round(point.x);
        point.y = Math.round(point.y);
      }
      return origSetPosition.apply(this, args);
    };

    const container = map.getContainer();
    let accumulatedDelta = 0;
    let lastPoint: { x: number; y: number } | null = null;
    let rafId: number | null = null;

    const flush = () => {
      rafId = null;
      if (!lastPoint || Math.abs(accumulatedDelta) < 0.005) {
        accumulatedDelta = 0;
        return;
      }
      const currentZoom = map.getZoom();
      // 0.01刻みに丸めてサブピクセルジッターを防止
      const raw = currentZoom + accumulatedDelta;
      const newZoom = Math.round(Math.min(19, Math.max(3, raw)) * 100) / 100;
      accumulatedDelta = 0;
      if (newZoom === currentZoom) return;
      const latlng = map.containerPointToLatLng([lastPoint.x, lastPoint.y]);
      map.setZoomAround(latlng, newZoom, { animate: false });
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // deltaMode 正規化: 0=pixel, 1=line(~16px), 2=page(~800px)
      let dx = e.deltaX;
      let dy = e.deltaY;
      if (e.deltaMode === 1) { dx *= 16; dy *= 16; }
      else if (e.deltaMode === 2) { dx *= 800; dy *= 800; }

      // ピンチ(ctrl+wheel / メタ) → ズーム（感度高め）
      const isPinch = e.ctrlKey || e.metaKey;
      // マウスホイール判定: deltaX=0 かつ deltaYが大きい離散値（トラックパッド小刻みスクロールと区別）
      const isMouseWheel = !isPinch && e.deltaX === 0 && Math.abs(e.deltaY) >= 50 && e.deltaMode === 0;

      if (isPinch || isMouseWheel) {
        const sensitivity = isPinch ? 0.01 : 0.005;
        accumulatedDelta += -dy * sensitivity;
        const rect = container.getBoundingClientRect();
        lastPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        if (rafId === null) rafId = requestAnimationFrame(flush);
        return;
      }

      // トラックパッド2本指スワイプ → パン
      map.panBy([dx, dy], { animate: false });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
      if (rafId !== null) cancelAnimationFrame(rafId);
      // パッチ復元
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (L.DomUtil as any).setPosition = origSetPosition;
    };
  }, [map]);

  return null;
}

// ── 現在地ボタン用コントローラー ──
function LocationController({ onLocate }: { onLocate: (lat: number, lng: number) => void }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ lat: number; lng: number } | undefined>).detail;
      if (detail) {
        onLocate(detail.lat, detail.lng);
        map.setView([detail.lat, detail.lng], 16, { animate: true, duration: 0.5 });
        return;
      }
      // フォールバック: 詳細なしで呼ばれた場合は自前で取得
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          onLocate(latitude, longitude);
          map.setView([latitude, longitude], 16, { animate: true, duration: 0.5 });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      );
    };
    container.addEventListener('locate-me', handler);
    return () => container.removeEventListener('locate-me', handler);
  }, [map, onLocate]);

  return null;
}

// ── フィルター変更時に表示範囲を自動調整 ──
function FitToMembers({ members }: { members: MemberWithVisitInfo[] }) {
  const map = useMap();
  const firstRef = useRef(true);
  const prevKeyRef = useRef<string>('');

  useEffect(() => {
    // 初回マウントはデフォルトの中心/ズームを優先（スキップ）
    if (firstRef.current) {
      firstRef.current = false;
      prevKeyRef.current = members.map(m => m.id).join(',');
      return;
    }
    const key = members.map(m => m.id).join(',');
    if (key === prevKeyRef.current) return;
    prevKeyRef.current = key;

    if (members.length === 0) return;
    const coords = members
      .filter(m => m.lat != null && m.lng != null)
      .map(m => [m.lat!, m.lng!] as [number, number]);
    if (coords.length === 0) return;

    if (coords.length === 1) {
      map.setView(coords[0], 17, { animate: true, duration: 0.5 });
      return;
    }

    const bounds = L.latLngBounds(coords);
    map.flyToBounds(bounds, { padding: [60, 60], maxZoom: 17, duration: 0.6 });
  }, [members, map]);

  return null;
}

// ── マップクリック検知 ──
function MapClickHandler({ onClick }: { onClick?: () => void }) {
  const map = useMap();
  useEffect(() => {
    if (!onClick) return;
    const handler = () => onClick();
    map.on('click', handler);
    return () => { map.off('click', handler); };
  }, [map, onClick]);
  return null;
}

// ── ユーザードラッグ検知 ──
// Leaflet の 'dragstart' は map.panTo() 等の programmatic な移動では発火しない。
// ユーザーがマップを掴んで動かした時だけ呼ばれる純粋なジェスチャーイベント。
function MapDragHandler({ onDrag }: { onDrag?: () => void }) {
  const map = useMap();
  useEffect(() => {
    if (!onDrag) return;
    const handler = () => onDrag();
    map.on('dragstart', handler);
    return () => { map.off('dragstart', handler); };
  }, [map, onDrag]);
  return null;
}

// ── メインコンポーネント ──
export default function MapView({
  members,
  selectedMemberId,
  onMemberSelect,
  onMapClick,
  onUserMapDrag,
  layerMode = 'standard',
  editingMemberId: editingMemberIdProp = null,
  onEditingMemberIdChange,
}: MapViewProps) {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  // 2026-05-07 ピン位置編集モードは 親 (HomePage) が制御する props に切替済。
  // 旧: 長押しで内部 state を立てる Google Maps 風。
  // 新: ボトムシート内の「ピン編集」ボタン → 親 → editingMemberIdProp で渡る。
  const editingMemberId = editingMemberIdProp;
  const setEditingMemberId = (next: string | null) => {
    onEditingMemberIdChange?.(next);
  };

  const [savingMessage, setSavingMessage] = useState<string | null>(null);
  // 2026-05-06 ヒデさん指示: ドラッグ後に即コミットせず、確認モーダルを出す。
  //   newAddress: リバースジオコードのプレビュー結果 (取得中は undefined → '取得中…')
  const [pendingPin, setPendingPin] = useState<
    | { memberId: string; oldLat: number; oldLng: number; newLat: number; newLng: number; newAddress?: string; addrLoading: boolean }
    | null
  >(null);

  // 2026-05-09 ヒデさん指示: 編集モード上部に住所/Maps URL/座標 入力バーを追加。
  //   inputDraft = ユーザーが入力中の生テキスト
  //   inputBusy  = 住所→座標変換 (geocode) 中フラグ
  //   panTarget  = 入力決定時に flyTo するための「目標座標 + 連番」
  //                (連番は 同じ座標を再決定したとき再 fire させるため)
  const [inputDraft, setInputDraft] = useState('');
  const [inputBusy, setInputBusy] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [panTarget, setPanTarget] = useState<{ lat: number; lng: number; nonce: number } | null>(null);
  const panNonceRef = useRef(0);

  // 編集モードを抜けたら入力バーをクリア
  useEffect(() => {
    if (!editingMemberId) {
      setInputDraft('');
      setInputBusy(false);
      setInputError(null);
    }
  }, [editingMemberId]);

  // ドラッグ終了 → 即コミットせず pendingPin に入れて確認バーを出す。
  // 同時にリバースジオコード (バックグラウンド) して住所プレビューも引いておく。
  const handlePinDragRelease = async (memberId: string, oldLat: number, oldLng: number, newLat: number, newLng: number) => {
    setPendingPin({ memberId, oldLat, oldLng, newLat, newLng, addrLoading: true });
    try {
      const r = await fetch(`/api/geocode-reverse?lat=${newLat}&lng=${newLng}`);
      const data = await r.json();
      const newAddress = r.ok && data?.found && data.address ? (data.address as string) : undefined;
      setPendingPin(prev =>
        prev && prev.memberId === memberId && prev.newLat === newLat && prev.newLng === newLng
          ? { ...prev, newAddress, addrLoading: false }
          : prev,
      );
    } catch {
      setPendingPin(prev =>
        prev && prev.memberId === memberId && prev.newLat === newLat && prev.newLng === newLng
          ? { ...prev, addrLoading: false }
          : prev,
      );
    }
  };

  const cancelPendingPin = () => {
    setPendingPin(null);
    setEditingMemberId(null);
  };

  // 入力バー submit ハンドラ。住所/座標/URL を解析して pendingPin を更新。
  // 同時に map を新位置へ flyTo する (PanToInputTarget 経由)。
  const handleInputSubmit = async () => {
    if (!editingMemberId) return;
    const member = members.find(m => m.id === editingMemberId);
    if (!member || member.lat == null || member.lng == null) return;

    const parsed = parseLocationInput(inputDraft);
    if (!parsed) {
      setInputError('住所か Maps の URL/座標 (例 43.77, 142.36) を入力してね');
      return;
    }

    setInputError(null);
    let newLat: number;
    let newLng: number;

    if (parsed.type === 'coords') {
      newLat = parsed.lat;
      newLng = parsed.lng;
    } else {
      // 住所 → ジオコード
      setInputBusy(true);
      try {
        const r = await fetch(`/api/geocode?q=${encodeURIComponent(parsed.query)}`);
        const data = await r.json();
        if (!r.ok || !data.found) {
          setInputError('この住所が見つからへんかった');
          setInputBusy(false);
          return;
        }
        newLat = parseFloat(data.lat);
        newLng = parseFloat(data.lng);
      } catch {
        setInputError('住所検索に失敗');
        setInputBusy(false);
        return;
      }
      setInputBusy(false);
    }

    // pendingPin 更新 (= 確認カードに新住所のプレビューが入る)
    await handlePinDragRelease(editingMemberId, member.lat, member.lng, newLat, newLng);
    // map をその位置へ flyTo (PanToInputTarget が拾う)
    panNonceRef.current += 1;
    setPanTarget({ lat: newLat, lng: newLng, nonce: panNonceRef.current });
    // 入力欄はクリア (連続入力しやすく)
    setInputDraft('');
  };

  const confirmPendingPin = async () => {
    const p = pendingPin;
    if (!p) return;
    setSavingMessage('ピン位置を保存中…');
    try {
      const patch: { lat: number; lng: number; address?: string } = { lat: p.newLat, lng: p.newLng };
      if (p.newAddress) patch.address = p.newAddress;
      await updateMember(p.memberId, patch);
      setSavingMessage(p.newAddress ? `住所を「${p.newAddress}」に更新` : 'ピン位置を更新');
    } catch (e) {
      setSavingMessage(`保存失敗: ${e instanceof Error ? e.message : String(e)}`);
    }
    setTimeout(() => setSavingMessage(null), 2400);
    setPendingPin(null);
    setEditingMemberId(null);
  };

  // マウント時、「既に許可済み」のときだけ watchPosition で青ドット表示する。
  // 許可未取得(prompt/denied) の場合は起動時に勝手にダイアログを出さず、
  // ユーザーが locate ボタンを押した時だけ prompt が出るようにする。
  // (毎回起動時に許可を求められる体験を避けるため・ヒデさん要望 2026-04-26)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    let watchId: number | null = null;
    const startWatch = () => {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => { /* サイレントに失敗 */ },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
      );
    };

    if ('permissions' in navigator && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then(result => {
          if (result.state === 'granted') startWatch();
          // 'prompt' / 'denied' は何もしない(ダイアログを出さない)
          // 後からユーザーが OS 設定で許可状態を変えたら、次回起動時に有効化される
        })
        .catch(() => { /* Permissions API 失敗時もダイアログ抑制側へ倒す */ });
    }
    // Permissions API 未対応の古いブラウザは安全側で何もしない

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const geoMembers = useMemo(
    () => members.filter(m => m.lat != null && m.lng != null),
    [members]
  );

  // ── アイコンキャッシュ ──
  // createMemberPin は毎回新しい L.DivIcon を返す。icon prop reference が
  // 変わると react-leaflet は marker DOM を再生成するため、全 118 マーカーが
  // selectedMemberId 変化のたびに DOM 置換される → シートアニメ中にメインスレッド
  // が詰まり、iPhone で明確にガタつく。
  //
  // 対策: 非選択アイコンを member 単位で memoize し、同じ reference を保つ。
  // 選択中アイコンだけ別途計算 → selectedMemberId 変化時は「旧選択」「新選択」の
  // 2 個だけ DOM 更新される。
  const baseIcons = useMemo(() => {
    const cache = new Map<string, L.DivIcon>();
    for (const m of geoMembers) {
      cache.set(m.id, createMemberPin(m, false));
    }
    return cache;
    // member.id / totalVisits / district / wantToVisit 変化でのみ再生成
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    geoMembers.length,
    geoMembers.map(m => `${m.id}:${m.totalVisits}:${m.district}:${m.wantToVisit ? 1 : 0}`).join('|'),
  ]);

  const selectedIcon = useMemo(() => {
    if (!selectedMemberId) return null;
    const m = geoMembers.find(x => x.id === selectedMemberId);
    if (!m) return null;
    return createMemberPin(m, true);
  }, [selectedMemberId, geoMembers]);

  // ── 同一住所のメンバーを束ねる ──
  // 同じ lat/lng (5桁丸め ≒ 1m 以内) のメンバーをグループ化。
  // 2人以上いる位置は クラスタピン (人数バッジ付き) で 1個だけ立て、
  // タップしたら下の cluster picker で全員を選べるようにする。
  //
  // 編集中/pendingPin メンバーが居るグループは「位置が動く可能性あり」なので
  // クラスタリングをスキップして、そのグループは個別ピンに分解して表示する。
  const renderUnits = useMemo(() => {
    type Unit =
      | { kind: 'single'; member: MemberWithVisitInfo }
      | { kind: 'cluster'; key: string; members: MemberWithVisitInfo[] };
    const groups = new Map<string, MemberWithVisitInfo[]>();
    for (const m of geoMembers) {
      const k = coordKey(m);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(m);
    }
    const units: Unit[] = [];
    for (const [k, group] of groups.entries()) {
      const containsInteractive = group.some(
        m => m.id === editingMemberId || pendingPin?.memberId === m.id,
      );
      if (group.length === 1 || containsInteractive) {
        for (const m of group) units.push({ kind: 'single', member: m });
      } else {
        units.push({ kind: 'cluster', key: k, members: group });
      }
    }
    return units;
  }, [geoMembers, editingMemberId, pendingPin?.memberId]);

  // クラスタ用 picker (同住所メンバー一覧のボトムシート)
  // 他のシート (FilterModal 等) と同じく スライドイン/アウトのアニメを付ける。
  // - clusterPicker: 表示中の members 配列。null なら未表示。
  // - clusterClosing: 閉じアニメ再生中。true の間は シートに translateY(100%) +
  //   backdrop に opacity 0 transition を当てて、320ms 後に DOM から外す。
  const CLUSTER_SHEET_MS = 320;
  const [clusterPicker, setClusterPicker] = useState<MemberWithVisitInfo[] | null>(null);
  const [clusterClosing, setClusterClosing] = useState(false);
  const clusterCloseTimerRef = useRef<number | null>(null);

  const openClusterPicker = (members: MemberWithVisitInfo[]) => {
    // 閉じアニメ中に別ピン押されたらアニメ取り消して即差し替え
    if (clusterCloseTimerRef.current != null) {
      window.clearTimeout(clusterCloseTimerRef.current);
      clusterCloseTimerRef.current = null;
    }
    setClusterClosing(false);
    setClusterPicker(members);
  };

  const closeClusterPicker = () => {
    if (!clusterPicker || clusterClosing) return;
    setClusterClosing(true);
    clusterCloseTimerRef.current = window.setTimeout(() => {
      setClusterPicker(null);
      setClusterClosing(false);
      clusterCloseTimerRef.current = null;
    }, CLUSTER_SHEET_MS);
  };

  // アンマウント時 タイマーリーク防止
  useEffect(() => () => {
    if (clusterCloseTimerRef.current != null) {
      window.clearTimeout(clusterCloseTimerRef.current);
    }
  }, []);

  if (typeof window === 'undefined') {
    return <div style={{ width: '100%', height: '100%', background: '#E8EAED' }} />;
  }

  return (
    <>
    <MapContainer
      center={MAP_DEFAULT_CENTER}
      zoom={MAP_DEFAULT_ZOOM}
      style={{ width: '100%', height: '100%' }}
      scrollWheelZoom={false}
      zoomControl={false}
      attributionControl={false}
      touchZoom={true}
      doubleClickZoom={true}
      dragging={true}
      inertia
      inertiaDeceleration={3000}
      // 2026-05-07 ヒデさん指摘で 滑らかさ優先 に方針転換。
      // 旧: アニメ全 OFF (ガタつき対策) → 補間フレームが出ず ピンチ中チラつく
      // 新: Leaflet native アニメを再有効化。CSS transform で 1 つの pane 全体を
      //     スケールするため、ピン群もまとめて滑らかに動く。
      zoomAnimation={true}
      markerZoomAnimation={true}
      fadeAnimation={true}
      // 4レベル以上の急ジャンプはアニメ無効化 (一瞬で飛ぶ方が UX 良い)
      zoomAnimationThreshold={4}
      // 0.25 刻みに丸めて 過度な fractional zoom を抑制 (タイル CSS スケールでの
      // ぼやけが減る)。ピンチは中間値を発生させるが、release 後 0.25 に snap される。
      zoomSnap={0.25}
      zoomDelta={0.25}
      wheelPxPerZoomLevel={120}
      {...({ rotate: true, rotateControl: false, touchRotate: true, bearing: 0 } as object)}
    >
      <TileLayer
        // key を付けて layerMode 変更時に TileLayer を作り直す（url 変更だけだと
        // 古いタイルが残ることがある）
        key={layerMode}
        url={TILE_URLS[layerMode]}
        attribution={TILE_ATTRIBUTION}
        maxZoom={20}
        // 2026-05-07 ヒデさん指摘で 画質を Google Maps native と同等まで引き上げる。
        // 旧: tileSize=512 + zoomOffset=-1 → 実は zoom Z-1 のタイル (詳細半分)
        //     を 2倍拡大表示していて、タイル枚数を減らす省メモリ最適化だった。
        //     これが「Google Maps と比べて画質が荒い」主因。
        // 新: デフォルト (tileSize=256, zoomOffset=0) に戻し zoom Z をそのまま
        //     表示 → 詳細レベルが本来の Google Maps 相当に。
        //     detectRetina=true で DPR ≥ 2 では zoom+1 タイルを取りに行き、
        //     scale=2 (URL) と合わせて計 4倍ピクセル密度 → DPR 3 (iPhone Pro)
        //     でも 1.33倍のダウンサンプリングで くっきり。
        tileSize={256}
        detectRetina={true}
        // ピンチ中もタイル更新する → 中間ズームでタイルが古いまま CSS で引き
        // 伸ばされてぼやける問題を緩和。updateInterval で過剰 fetch を抑える。
        updateWhenZooming={true}
        updateWhenIdle={true}
        updateInterval={150}
        // バッファ 6 タイル分: パン/ズーム時に画面外タイルを多めに保持して
        // 描画の継ぎ目で白縁が出にくくする。
        keepBuffer={6}
      />
      <PanToSelected members={geoMembers} selectedId={selectedMemberId} />
      <PanToEditing members={geoMembers} editingId={editingMemberId} />
      <PanToInputTarget panTarget={panTarget} />
      <FitToMembers members={geoMembers} />
      <MapClickHandler
        onClick={() => {
          // 編集モード中のマップ空白タップは編集解除のみ (本来の onMapClick は呼ばない)
          if (editingMemberId) {
            setEditingMemberId(null);
            return;
          }
          onMapClick?.();
        }}
      />
      <MapDragHandler
        onDrag={() => {
          onUserMapDrag?.();
        }}
      />
      <SmoothZoomHandler />
      <LocationController onLocate={(lat, lng) => setCurrentLocation({ lat, lng })} />

      {currentLocation && (
        <Marker
          position={[currentLocation.lat, currentLocation.lng]}
          icon={GPS_DOT_ICON}
          zIndexOffset={2000}
          interactive={false}
        />
      )}

      {renderUnits.map(unit => {
        if (unit.kind === 'cluster') {
          const { key, members: group } = unit;
          const selectedInGroup = group.some(m => m.id === selectedMemberId);
          const icon = createClusterPin(group, selectedInGroup);
          // クラスタは同一座標なので 代表 1 件の lat/lng を使う
          const head = group[0];
          return (
            <Marker
              key={`cluster-${key}`}
              position={[head.lat!, head.lng!]}
              icon={icon}
              zIndexOffset={selectedInGroup ? 1000 : 0}
              eventHandlers={{
                click: () => openClusterPicker(group),
              }}
            />
          );
        }

        const member = unit.member;
        const isSelected = member.id === selectedMemberId;
        const isEditing = member.id === editingMemberId;
        const isPending = pendingPin?.memberId === member.id;
        // 編集モードのピンは赤くハイライト。それ以外は通常ロジック。
        const icon = isEditing
          ? createEditingPin(member)
          : isSelected && selectedIcon
            ? selectedIcon
            : (baseIcons.get(member.id) ?? createMemberPin(member, false));
        // 確認待ち (pendingPin) のとき、Marker は新しい位置にいる。
        // member.lat/lng はまだ更新されていない (= 古い位置)。
        // 取消 で pendingPin がクリアされたら member.lat/lng の元位置に戻る。
        const displayLat = isPending ? pendingPin.newLat : member.lat!;
        const displayLng = isPending ? pendingPin.newLng : member.lng!;
        return (
          <Marker
            // pendingPin の確定/取消で再マウントして position を確実に追従させる
            key={`${member.id}-${isPending ? `pend-${pendingPin.newLat.toFixed(6)}-${pendingPin.newLng.toFixed(6)}` : 'orig'}`}
            position={[displayLat, displayLng]}
            icon={icon}
            zIndexOffset={isEditing || isPending ? 2500 : (isSelected ? 1000 : 0)}
            // 2026-05-09 ヒデさん指示: pending 中でもドラッグ可能に。OK 押すまで
            // 何度でも調整できる体験にする (ドラッグするたびに pendingPin 更新)。
            draggable={isEditing}
            eventHandlers={{
              click: () => onMemberSelect(member.id),
              dragend: (e) => {
                const ll = (e.target as L.Marker).getLatLng();
                if (member.lat == null || member.lng == null) return;
                void handlePinDragRelease(member.id, member.lat, member.lng, ll.lat, ll.lng);
              },
            }}
          />
        );
      })}
      {savingMessage && (
        <div className="leaflet-top leaflet-right" style={{ pointerEvents: 'none' }}>
          <div className="leaflet-control" style={{ marginTop: 12, marginRight: 12 }}>
            <div
              style={{
                background: 'rgba(17, 17, 17, 0.88)',
                color: 'white',
                fontSize: 12,
                fontWeight: 600,
                padding: '8px 12px',
                borderRadius: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}
            >
              {savingMessage}
            </div>
          </div>
        </div>
      )}
      {editingMemberId && !pendingPin && (
        <div className="leaflet-bottom leaflet-left" style={{ right: 0, marginBottom: 100, pointerEvents: 'none' }}>
          <div className="leaflet-control" style={{ margin: '0 16px', float: 'none' }}>
            <div
              style={{
                background: 'rgba(17, 17, 17, 0.85)',
                color: 'white',
                fontSize: 12,
                fontWeight: 700,
                padding: '8px 14px',
                borderRadius: 999,
                boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                textAlign: 'center',
                pointerEvents: 'auto',
              }}
            >
              ピンをドラッグ または 上のバーから住所/座標を入力
            </div>
          </div>
        </div>
      )}
    </MapContainer>

    {/* ─────── 同じ住所に複数人いる時の cluster picker ───────
        マップ上で「2」「3」のバッジ付きピンをタップしたら、その住所に
        紐づいてるメンバーを ボトムシートで全員見せる。タップで通常の
        メンバー詳細シートが開く (= onMemberSelect 経由)。 */}
    {clusterPicker && typeof document !== 'undefined' && createPortal(
      <>
        {/* backdrop: 開く時 fadeIn、閉じる時 opacity-0 transition */}
        <div
          className={`fixed inset-0 z-[70] bg-black/30 ${
            clusterClosing ? 'opacity-0 transition-opacity duration-300' : 'animate-modal-backdrop-fade'
          }`}
          onClick={closeClusterPicker}
        />
        {/* sheet: 開く時 modal-slide-up、閉じる時 translateY(100%) transition */}
        <div
          className={`fixed left-0 right-0 bottom-0 z-[71] bg-white rounded-t-2xl shadow-2xl px-5 pt-3 pb-[max(24px,env(safe-area-inset-bottom))] max-w-md mx-auto ${
            clusterClosing ? '' : 'animate-modal-slide-up'
          }`}
          style={{
            transform: clusterClosing ? 'translateY(100%)' : undefined,
            transition: clusterClosing
              ? `transform ${CLUSTER_SHEET_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`
              : undefined,
            willChange: 'transform',
          }}
        >
          <div className="w-10 h-1 bg-black/15 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs text-[var(--color-subtext)]">📍 同じ住所に</div>
              <div className="font-bold text-base mt-0.5">{clusterPicker.length}人</div>
            </div>
            <button
              type="button"
              onClick={closeClusterPicker}
              aria-label="閉じる"
              className="w-8 h-8 rounded-full bg-[#F0F0F0] flex items-center justify-center active:bg-[#E0E0E0]"
            >
              <XIcon size={16} className="text-[#666]" />
            </button>
          </div>
          <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
            {clusterPicker.map(m => {
              const color = getMemberOrgColor(m);
              const visited = m.totalVisits > 0;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    // 閉じアニメ走らせつつ、詳細シートは即開く
                    // (両者が同時にスライドして自然な遷移になる)
                    closeClusterPicker();
                    onMemberSelect(m.id);
                  }}
                  className="flex items-center gap-3 py-2 px-3 rounded-xl border border-black/10 active:bg-[#F8F8F8] text-left"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                    style={{ background: color }}
                  >
                    {(m.name ?? '?').slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{m.name}</div>
                    <div className="text-[11px] text-[var(--color-subtext)] mt-0.5">
                      {visited ? `訪問 ${m.totalVisits}回` : '未訪問'}
                      {m.wantToVisit ? ' ・ ★行きたい' : ''}
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-[#999] shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      </>,
      document.body,
    )}

    {/* ─────── 編集モード: 上部 住所/URL/座標 入力バー ───────
        ヒデさん指示 (2026-05-09): ドラッグだけじゃなく、住所文字列や Google Maps の
        URL / 座標 (lat,lng) を貼り付けてピンを移動できる入力欄を追加。
        createPortal で body 直下に出して、ホームの検索バー(z-20)より上 (z-[90]) に
        重ねる。編集モード中は検索バーを覆い隠す形で表示される。 */}
    {editingMemberId && typeof document !== 'undefined' && createPortal(
      <div
        className="fixed inset-x-0 top-0 z-[90] pointer-events-none"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}
      >
        <div className="px-3 pointer-events-auto">
          <form
            onSubmit={(e) => { e.preventDefault(); if (!inputBusy) void handleInputSubmit(); }}
            className="bg-white rounded-full shadow-[0_3px_10px_rgba(0,0,0,0.22)] flex items-center h-12 px-4 border border-[#E5E5EA]"
          >
            <SearchIcon size={20} className="text-[#8E8E93] shrink-0" />
            <input
              type="text"
              value={inputDraft}
              onChange={(e) => { setInputDraft(e.target.value); setInputError(null); }}
              placeholder="住所 / Maps URL / 座標 を入力"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="flex-1 ml-3 bg-transparent outline-none text-[15px] placeholder:text-[#8E8E93]"
            />
            {inputDraft && !inputBusy && (
              <button
                type="button"
                onClick={() => { setInputDraft(''); setInputError(null); }}
                aria-label="クリア"
                className="w-8 h-8 rounded-full flex items-center justify-center active:bg-[#F0F0F0] mr-1"
              >
                <XIcon size={16} className="text-[#8E8E93]" />
              </button>
            )}
            {inputDraft && (
              <button
                type="submit"
                disabled={inputBusy}
                aria-label="移動"
                className="w-9 h-9 rounded-full bg-[#007AFF] text-white flex items-center justify-center active:opacity-80 disabled:opacity-50 transition-opacity"
              >
                {inputBusy ? (
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowRight size={18} />
                )}
              </button>
            )}
          </form>
          {inputError && (
            <div className="mt-2 mx-2 px-3 py-2 rounded-xl bg-[#FFE5E3] text-[#B91C1C] text-[12px] font-bold">
              {inputError}
            </div>
          )}
        </div>
      </div>,
      document.body,
    )}

    {/* ─────── ピン位置確認カード (非ブロッキング) ───────
        ヒデさん指示 (2026-05-09): 確認モーダルだとマップ操作がブロックされて
        「OK 押すまでにドラッグで微調整」ができなかった。背景の半透明バック
        ドロップを撤去して、ボトムカードだけ pointer-events: auto にする。
        マップ部分は引き続きピンチ・パン・ピンドラッグ全て可能。 */}
    {pendingPin && typeof document !== 'undefined' && createPortal(
      <div
        className="fixed inset-x-0 bottom-0 z-[100] pointer-events-none"
        style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto max-w-sm px-2">
          <div
            className="bg-white rounded-2xl shadow-2xl p-5 pointer-events-auto"
            style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.18)' }}
          >
            <h2 className="text-base font-bold text-[#000] mb-1">ここでよろしいですか？</h2>
            <p className="text-[11px] text-[#6E6E73] mb-3">
              ピンをドラッグするか、上のバーから住所・座標を再入力すれば 何度でも微調整できます。
            </p>

            <div className="rounded-xl bg-[#F2F2F7] px-3 py-2.5 mb-4">
              <div className="text-[10px] font-bold text-[#6E6E73] mb-0.5">新しい住所</div>
              <div className="text-[13px] font-bold text-[#000] break-all">
                {pendingPin.addrLoading ? '住所を取得中…' : (pendingPin.newAddress ?? '住所は取得できませんでした')}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelPendingPin}
                className="flex-1 h-11 rounded-full font-bold text-sm text-[#3C3C43] bg-[#F2F2F7] active:bg-[#E5E5EA] transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => { void confirmPendingPin(); }}
                disabled={pendingPin.addrLoading}
                className="flex-1 h-11 rounded-full font-bold text-sm text-white bg-[#007AFF] active:opacity-80 disabled:opacity-50 transition-opacity"
              >
                決定
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    )}
  </>
  );
}

// ── 編集モード用ピン: 大きめの赤ピン + 揺れアニメ ──
//
// 2026-05-07 ヒデさん指摘修正: 旧実装は コンテナ (48x56) が SVG (40x56) より
// ほぼ余白ゼロで、wobble の傾き や drop-shadow が箱の外で切れていた。
//   - SVG 自体に `overflow: visible` を入れて、フィルター(影)が
//     SVG box の外側まで描画できるようにする (標準ピンと同じ書き方)。
//   - コンテナを 80x80 に拡張して 上方向 24px / 左右 20px の余白を確保。
//     これで rotate ±4° の角と shadow 6px blur が完全に収まる。
//   - iconSize / iconAnchor も合わせて補正 (anchor は箱の bottom-center で
//     SVG 先端 = lat/lng なので 数値は変わるが意味は同じ)。
function createEditingPin(_m: MemberWithVisitInfo): L.DivIcon {
  return L.divIcon({
    className: 'map-pin-icon-editing',
    html: `
      <div style="
        width: 80px;
        height: 80px;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        overflow: visible;
        animation: houmonPinWobble 1.1s ease-in-out infinite;
        transform-origin: bottom center;
      ">
        <svg width="40" height="56" viewBox="0 0 28 40" fill="none"
             style="overflow: visible; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.45));">
          <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 40 14 40S28 24.5 28 14C28 6.268 21.732 0 14 0Z"
                fill="#FF3B30" stroke="#FFFFFF" stroke-width="2.5"/>
          <circle cx="14" cy="13.5" r="5.5" fill="#FFFFFF"/>
        </svg>
      </div>
      <style>
        @keyframes houmonPinWobble {
          0%, 100% { transform: rotate(-4deg) translateY(0); }
          50%      { transform: rotate(4deg) translateY(-2px); }
        }
      </style>
    `,
    iconSize: [80, 80],
    iconAnchor: [40, 80],
  });
}
