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
import { MAP_DEFAULT_CENTER, MAP_DEFAULT_ZOOM } from '../lib/constants';

const TILE_URL = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ja&scale=2';
const TILE_ATTRIBUTION = '&copy; Google';

interface MapViewProps {
  members: MemberWithVisitInfo[];
  selectedMemberId: string | null;
  onMemberSelect: (memberId: string) => void;
  onMapClick?: () => void;
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

// ── Google Maps風ピン（未訪問=白、訪問済み=赤） ──
const PIN_COLOR_VISITED = '#EA4335';   // Google Maps red
const PIN_COLOR_UNVISITED = '#FFFFFF'; // White

function createMemberPin(member: MemberWithVisitInfo, isSelected: boolean): L.DivIcon {
  const hasVisited = member.totalVisits > 0;
  const pinColor = hasVisited ? PIN_COLOR_VISITED : PIN_COLOR_UNVISITED;
  const dotColor = hasVisited ? '#FFFFFF' : '#BBBBC0';
  const strokeColor = hasVisited ? '#C1281E' : '#BBBBC0';

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
              fill="${pinColor}" stroke="${strokeColor}" stroke-width="1.5"/>
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
function PanToSelected({ members, selectedId }: { members: MemberWithVisitInfo[]; selectedId: string | null }) {
  const map = useMap();
  const prevRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedId && selectedId !== prevRef.current) {
      const m = members.find(m => m.id === selectedId);
      if (m?.lat != null && m?.lng != null) {
        map.panTo([m.lat, m.lng], { animate: true, duration: 0.4, easeLinearity: 0.5 });
      }
    }
    prevRef.current = selectedId;
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

// ── メインコンポーネント ──
export default function MapView({ members, selectedMemberId, onMemberSelect, onMapClick }: MapViewProps) {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  const geoMembers = useMemo(
    () => members.filter(m => m.lat != null && m.lng != null),
    [members]
  );

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
        url={TILE_URL}
        attribution={TILE_ATTRIBUTION}
        maxZoom={20}
        tileSize={512}
        zoomOffset={-1}
        updateWhenZooming={false}
        updateWhenIdle={true}
        keepBuffer={4}
      />
      <PanToSelected members={geoMembers} selectedId={selectedMemberId} />
      <FitToMembers members={geoMembers} />
      <MapClickHandler onClick={onMapClick} />
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

      {geoMembers.map(member => (
        <Marker
          key={member.id}
          position={[member.lat!, member.lng!]}
          icon={createMemberPin(member, member.id === selectedMemberId)}
          zIndexOffset={member.id === selectedMemberId ? 1000 : 0}
          eventHandlers={{ click: () => onMemberSelect(member.id) }}
        />
      ))}
    </MapContainer>
  );
}
