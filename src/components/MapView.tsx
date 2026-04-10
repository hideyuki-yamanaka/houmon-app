'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-rotate';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
} from 'react-leaflet';
import type { MemberWithVisitInfo } from '../lib/types';
import {
  MAP_DEFAULT_CENTER,
  MAP_DEFAULT_ZOOM,
  findOrgLeaf,
  findParentOrg,
  getParentOrgKey,
} from '../lib/constants';

// ── タイルレイヤー設定 ──
// Google Maps と同じタイルサーバーを使う
// - standard: 通常の道路地図 (lyrs=m)
// - satellite: 純粋な航空写真 (lyrs=s)
export type MapLayerMode = 'standard' | 'satellite';

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
// - 色は ORG_HIERARCHY の leaf.hex（なければ parent.hex）を使用
// - 訪問済み = 塗りつぶし + 白いドット
// - 未訪問   = 白地 + 組織色のストローク + 組織色のドット
// - 未分類   = グレー
const FALLBACK_COLOR = '#9AA0A6';

function getMemberOrgColor(member: MemberWithVisitInfo): string {
  const leaf = findOrgLeaf(member.district);
  if (leaf) return leaf.hex;
  const parentKey = getParentOrgKey(member);
  if (parentKey) {
    const parent = findParentOrg(parentKey);
    if (parent) return parent.hex;
  }
  return FALLBACK_COLOR;
}

function createMemberPin(member: MemberWithVisitInfo, isSelected: boolean): L.DivIcon {
  const hasVisited = member.totalVisits > 0;
  const orgColor = getMemberOrgColor(member);

  const pinColor = hasVisited ? orgColor : '#FFFFFF';
  const dotColor = hasVisited ? '#FFFFFF' : orgColor;
  const strokeColor = orgColor;

  const scale = isSelected ? 1.3 : 1;

  const w = 60;
  const h = 70;

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
    ">
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
    </div>
  `;

  return L.divIcon({
    className: 'map-pin-icon',
    html,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h + 10],
  });
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
    if (!selectedId || selectedId === prevRef.current) {
      prevRef.current = selectedId;
      return;
    }
    prevRef.current = selectedId;
    const m = members.find(x => x.id === selectedId);
    if (m?.lat == null || m?.lng == null) return;

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
export default function MapView({ members, selectedMemberId, onMemberSelect, onMapClick, onUserMapDrag, layerMode = 'standard' }: MapViewProps) {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  // マウント時にサイレントに現在地を取りに行って、GPS 青ドットを最初から表示する。
  // watchPosition でユーザー移動にも追従。権限拒否やタイムアウト時は黙って何もしない
  // （ユーザーが locate ボタンを押した時だけエラーメッセージを出す方針）。
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        /* サイレントに失敗。マーカーは出さない。 */
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
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
    // member.id / totalVisits / district 変化でのみ再生成
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    geoMembers.length,
    geoMembers.map(m => `${m.id}:${m.totalVisits}:${m.district}`).join('|'),
  ]);

  const selectedIcon = useMemo(() => {
    if (!selectedMemberId) return null;
    const m = geoMembers.find(x => x.id === selectedMemberId);
    if (!m) return null;
    return createMemberPin(m, true);
  }, [selectedMemberId, geoMembers]);

  if (typeof window === 'undefined') {
    return <div style={{ width: '100%', height: '100%', background: '#E8EAED' }} />;
  }

  return (
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
      zoomAnimation={false}
      markerZoomAnimation={false}
      fadeAnimation={false}
      zoomSnap={0}
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
        tileSize={512}
        zoomOffset={-1}
        detectRetina={true}
        updateWhenZooming={false}
        updateWhenIdle={true}
        keepBuffer={4}
      />
      <PanToSelected members={geoMembers} selectedId={selectedMemberId} />
      <FitToMembers members={geoMembers} />
      <MapClickHandler onClick={onMapClick} />
      <MapDragHandler onDrag={onUserMapDrag} />
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

      {geoMembers.map(member => {
        const isSelected = member.id === selectedMemberId;
        // 選択中はメモ化された selectedIcon、それ以外はキャッシュ済みの
        // 非選択アイコンを使う。これにより selectedMemberId 変化時も、
        // 非選択 marker の icon reference は同一のまま → DOM 置換が起きない。
        const icon = isSelected && selectedIcon
          ? selectedIcon
          : (baseIcons.get(member.id) ?? createMemberPin(member, false));
        return (
          <Marker
            key={member.id}
            position={[member.lat!, member.lng!]}
            icon={icon}
            zIndexOffset={isSelected ? 1000 : 0}
            eventHandlers={{ click: () => onMemberSelect(member.id) }}
          />
        );
      })}
    </MapContainer>
  );
}
