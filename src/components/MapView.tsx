'use client';

import React, { useEffect, useMemo, useRef, useCallback, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapContainer,
  TileLayer,
  Marker,
  CircleMarker,
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

// ── 初回表示範囲の自動調整 ──
function FitBounds({ members }: { members: MemberWithVisitInfo[] }) {
  const map = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    const valid = members.filter(m => m.lat != null && m.lng != null);
    if (valid.length === 0 || fittedRef.current) return;

    if (valid.length === 1) {
      map.setView([valid[0].lat!, valid[0].lng!], 15, { animate: true, duration: 0.5 });
    } else {
      const bounds = L.latLngBounds(valid.map(m => [m.lat!, m.lng!] as L.LatLngTuple));
      map.fitBounds(bounds, { padding: [40, 40], animate: true, duration: 0.5 });
    }
    fittedRef.current = true;
  }, [members, map]);

  return null;
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
// PCトラックパッド/マウスホイール操作の振り分け
// - トラックパッド2本指スクロール → パン（移動）
// - トラックパッドピンチ（Ctrl+wheel）→ ズーム
// - マウスホイール → ズーム
// ========================================
function TrackpadPanHandler() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // ピンチズーム（トラックパッド2本指ピンチ = ctrlKey + wheel）
      if (e.ctrlKey || e.metaKey) {
        const zoomDelta = -e.deltaY * 0.01;
        const currentZoom = map.getZoom();
        const newZoom = Math.min(19, Math.max(3, currentZoom + zoomDelta));
        const mousePoint = map.mouseEventToContainerPoint(e);
        const mouseLatLng = map.containerPointToLatLng(mousePoint);
        map.setZoomAround(mouseLatLng, newZoom, { animate: false });
        return;
      }

      // マウスホイール判定: deltaXが0でdeltaYが大きい離散値 = マウスホイール → ズーム
      const isMouseWheel = e.deltaX === 0 && Math.abs(e.deltaY) >= 50 && e.deltaMode === 0;
      const isLineMode = e.deltaMode === 1; // line-based scroll = マウスホイール

      if (isMouseWheel || isLineMode) {
        const zoomDelta = e.deltaY > 0 ? -0.5 : 0.5;
        const currentZoom = map.getZoom();
        const newZoom = Math.min(19, Math.max(3, currentZoom + zoomDelta));
        const mousePoint = map.mouseEventToContainerPoint(e);
        const mouseLatLng = map.containerPointToLatLng(mousePoint);
        map.setZoomAround(mouseLatLng, newZoom, { animate: true });
        return;
      }

      // トラックパッド2本指スクロール → パン（移動）
      map.panBy([e.deltaX, e.deltaY], { animate: false });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [map]);

  return null;
}

// ── 現在地ボタン用コントローラー ──
function LocationController({ onLocate }: { onLocate: (lat: number, lng: number) => void }) {
  const map = useMap();

  const locate = useCallback(() => {
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
  }, [map, onLocate]);

  useEffect(() => {
    const container = map.getContainer();
    container.dataset.locate = '';
    const handler = () => locate();
    container.addEventListener('locate-me', handler);
    return () => container.removeEventListener('locate-me', handler);
  }, [map, locate]);

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
      zoomAnimation
      markerZoomAnimation
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} tileSize={256} />
      <FitBounds members={geoMembers} />
      <PanToSelected members={geoMembers} selectedId={selectedMemberId} />
      <MapClickHandler onClick={onMapClick} />
      <TrackpadPanHandler />
      <LocationController onLocate={(lat, lng) => setCurrentLocation({ lat, lng })} />

      {currentLocation && (
        <>
          <CircleMarker
            center={[currentLocation.lat, currentLocation.lng]}
            radius={20}
            pathOptions={{ color: '#4285F4', weight: 0, fillColor: '#4285F4', fillOpacity: 0.1 }}
          />
          <CircleMarker
            center={[currentLocation.lat, currentLocation.lng]}
            radius={7}
            pathOptions={{ color: 'white', weight: 2.5, fillColor: '#4285F4', fillOpacity: 1 }}
          />
        </>
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
