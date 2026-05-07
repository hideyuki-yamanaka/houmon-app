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
import type { MemberWithVisitInfo } from '../lib/types';
import {
  MAP_DEFAULT_CENTER,
  MAP_DEFAULT_ZOOM,
  getMemberOrgColor,
} from '../lib/constants';
import { updateMember } from '../lib/storage';

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
        <circle cx="20" cy="20" r="18" fill="#FBC02D" stroke="#FFFFFF" stroke-width="2.5"/>
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
      <PanToEditing members={geoMembers} editingId={editingMemberId} />
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

      {geoMembers.map(member => {
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
            draggable={isEditing && !isPending}
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
              ピンをドラッグして位置を直す。マップタップで終了
            </div>
          </div>
        </div>
      )}
    </MapContainer>

    {/* ─────── ピン位置確認モーダル ───────
        ヒデさん指示 (2026-05-07): ドラッグ後すぐ決定/取消 ではなく
        「ここでよろしいですか」確認モーダルを挟む。
        createPortal で body 直下に出すことで 親要素 (z-0 のマップラッパ) の
        stacking context に閉じ込められ ボトムシートに覆われるバグを回避。 */}
    {pendingPin && typeof document !== 'undefined' && createPortal(
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.5)' }}
        onClick={cancelPendingPin}
      >
        <div
          className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl p-5"
          style={{ paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-lg font-bold text-[#111] mb-1">ここでよろしいですか？</h2>
          <p className="text-xs text-[#6B7280] mb-4">この位置にピンを移動します。</p>

          <div className="rounded-xl bg-[#F5F5F4] px-3 py-2.5 mb-5">
            <div className="text-[10px] font-bold text-[#6B7280] mb-0.5">新しい住所</div>
            <div className="text-[13px] font-bold text-[#111] break-all">
              {pendingPin.addrLoading ? '住所を取得中…' : (pendingPin.newAddress ?? '住所は取得できませんでした')}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelPendingPin}
              className="flex-1 h-12 rounded-full font-bold text-sm text-[#374151] bg-[#F3F4F6] active:bg-[#E5E7EB] transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => { void confirmPendingPin(); }}
              disabled={pendingPin.addrLoading}
              className="flex-1 h-12 rounded-full font-bold text-sm text-white bg-[#111] active:opacity-80 disabled:opacity-50 transition-opacity"
            >
              決定
            </button>
          </div>
        </div>
      </div>,
      document.body,
    )}
  </>
  );
}

// ── 編集モード用ピン: 大きめの赤ピン + 揺れアニメ ──
function createEditingPin(_m: MemberWithVisitInfo): L.DivIcon {
  return L.divIcon({
    className: 'map-pin-icon-editing',
    html: `
      <div style="
        width: 48px;
        height: 56px;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        animation: houmonPinWobble 1.1s ease-in-out infinite;
      ">
        <svg width="40" height="56" viewBox="0 0 28 40" fill="none"
             style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.45));">
          <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 40 14 40S28 24.5 28 14C28 6.268 21.732 0 14 0Z"
                fill="#EF4444" stroke="#FFFFFF" stroke-width="2.5"/>
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
    iconSize: [48, 56],
    iconAnchor: [24, 56],
  });
}
