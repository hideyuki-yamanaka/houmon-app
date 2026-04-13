'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { LocateFixed, Search, X, Layers } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { MemberWithVisitInfo } from '../lib/types';
import { getMembersWithVisitInfo } from '../lib/storage';
import MemberBottomSheet from '../components/MemberBottomSheet';
import MembersListSheet, { applyAllFilters, type AppliedFilters } from '../components/MembersListSheet';
import { type FilterSelection, EMPTY_FILTER } from '../components/DistrictFilter';
import type { MapLayerMode } from '../components/MapView';
import type { SheetHandle } from '../components/SwipeableBottomSheet';

const MapView = dynamic(() => import('../components/MapView'), { ssr: false });

export default function HomePage() {
  const [members, setMembers] = useState<MemberWithVisitInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // フィルター3点を全部 HomePage で hold する。
  // こうしないと、子の MembersListSheet が内部 state で抱えると
  // マップピン用の filteredMembers に反映されず「件数0なのにピン残ってる」状態になる。
  const [filter, setFilter] = useState<FilterSelection>(() => {
    if (typeof window === 'undefined') return EMPTY_FILTER;
    try { const s = localStorage.getItem('houmon_filter'); return s ? JSON.parse(s) : EMPTY_FILTER; } catch { return EMPTY_FILTER; }
  });
  const [periodFilter, setPeriodFilter] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('houmon_periodFilter') || null;
  });
  const [categoryFilter, setCategoryFilter] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('houmon_categoryFilter') || null;
  });
  const handleFiltersChange = useCallback((next: AppliedFilters) => {
    setFilter(next.filter);
    setPeriodFilter(next.periodFilter);
    setCategoryFilter(next.categoryFilter);
    try {
      localStorage.setItem('houmon_filter', JSON.stringify(next.filter));
      if (next.periodFilter) localStorage.setItem('houmon_periodFilter', next.periodFilter);
      else localStorage.removeItem('houmon_periodFilter');
      if (next.categoryFilter) localStorage.setItem('houmon_categoryFilter', next.categoryFilter);
      else localStorage.removeItem('houmon_categoryFilter');
    } catch { /* ignore */ }
  }, []);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // マップのレイヤーモード（通常 ⇄ 航空写真）。セッション中のみ保持（永続化なし）
  const [layerMode, setLayerMode] = useState<MapLayerMode>('standard');
  const mapWrapRef = useRef<HTMLDivElement>(null);
  // ボトムシート類の imperative handle。マップドラッグ時にまとめて snapTo('mini') する。
  const listSheetRef = useRef<SheetHandle>(null);
  const memberSheetRef = useRef<SheetHandle>(null);

  // マップをユーザーがドラッグし始めたら、出てるシートを mini に下げて地図を広く見せる
  const handleMapDrag = useCallback(() => {
    // 現在どちらか出てるシートを対象にする（メンバー選択中ならメンバーシート、そうでなければ一覧シート）
    const target = memberSheetRef.current?.getSnap() && memberSheetRef.current?.getSnap() !== 'closed'
      ? memberSheetRef.current
      : listSheetRef.current;
    const cur = target?.getSnap();
    if (cur === 'mini' || cur === 'closed') return;
    target?.snapTo('mini');
  }, []);

  const handleLocate = () => {
    if (locating) return;
    if (!navigator.geolocation) {
      alert('このブラウザは位置情報に対応していません');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const container = mapWrapRef.current?.querySelector('.leaflet-container');
        container?.dispatchEvent(
          new CustomEvent('locate-me', { detail: { lat: latitude, lng: longitude } })
        );
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        const msg =
          err.code === err.PERMISSION_DENIED
            ? '位置情報の利用が許可されていません。ブラウザの設定で許可してください。'
            : err.code === err.TIMEOUT
            ? '位置情報の取得がタイムアウトしました'
            : '位置情報を取得できませんでした';
        alert(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    getMembersWithVisitInfo()
      .then(setMembers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 起動時に自動で現在地を取得してマップを移動（パーミッション済みなら無音で実行）
  const autoLocatedRef = useRef(false);
  useEffect(() => {
    if (autoLocatedRef.current) return;
    autoLocatedRef.current = true;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const container = mapWrapRef.current?.querySelector('.leaflet-container');
        container?.dispatchEvent(
          new CustomEvent('locate-me', { detail: { lat: pos.coords.latitude, lng: pos.coords.longitude } })
        );
      },
      () => { /* パーミッション未許可なら静かに無視 */ },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
    );
  }, []);

  const selectedMember = useMemo(
    () => members.find(m => m.id === selectedId) ?? null,
    [members, selectedId]
  );

  // 現在地ボタン（両シートの renderAbove に渡してシート上端右に追従させる）
  const renderLocateButton = useCallback(() => (
    <button
      onClick={handleLocate}
      disabled={locating}
      aria-label="現在地"
      className="w-12 h-12 rounded-full bg-white text-[#111] flex items-center justify-center shadow-[0_3px_10px_rgba(0,0,0,0.22)] active:scale-95 transition-transform disabled:opacity-70"
    >
      <LocateFixed size={22} className={locating ? 'animate-spin' : ''} />
    </button>
  ), [handleLocate, locating]);

  // フィルター3点（地区/期間/カテゴリ）を全部適用した後のメンバー。
  // これがマップピンとリスト両方の "唯一の真実" になる。
  const filteredMembers = useMemo(() => {
    return applyAllFilters(members, { filter, periodFilter, categoryFilter });
  }, [members, filter, periodFilter, categoryFilter]);

  // 検索候補（名前・カナ・住所で部分一致）
  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return filteredMembers
      .filter(m =>
        m.name.toLowerCase().includes(q) ||
        (m.nameKana ?? '').toLowerCase().includes(q) ||
        (m.address ?? '').toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [filteredMembers, searchQuery]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--color-subtext)]">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      {/* マップ全面表示 */}
      <div
        ref={mapWrapRef}
        className="absolute inset-0 z-0"
        style={{ touchAction: 'none', bottom: 'calc(-60px - env(safe-area-inset-bottom))' }}
      >
        <MapView
          members={filteredMembers}
          selectedMemberId={selectedId}
          onMemberSelect={(id) => setSelectedId(id)}
          onMapClick={() => {
            // マップタップは「選択解除・検索閉じる」のみ。
            // シート自体はタップでは下げない（ユーザー要望: ドラッグで下がる仕様）。
            setSelectedId(null);
            setShowSuggestions(false);
          }}
          onUserMapDrag={handleMapDrag}
          layerMode={layerMode}
        />
      </div>

      {/* Google Maps風 上部オーバーレイ: 検索バー + レイヤー切替
          z-index メモ:
            ここ z=20 / MembersListSheet z=30 / MemberBottomSheet z=40
          → シートが full で上がってきた時は Google Maps と同じで
            検索バーに被さる（下のレイヤーに回り込む）挙動。 */}
      <div className="absolute top-0 left-0 right-0 z-20 pt-[calc(env(safe-area-inset-top)+8px)] pointer-events-none">
        {/* 検索バー */}
        <div className="px-3 pointer-events-auto">
          <div className="bg-white rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.15)] flex items-center h-12 px-4">
            <Search size={20} className="text-[#5F6368] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="メンバー・住所で検索"
              className="flex-1 ml-3 bg-transparent outline-none text-[15px] placeholder:text-[#5F6368]"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setShowSuggestions(false); }}
                aria-label="クリア"
                className="w-8 h-8 rounded-full flex items-center justify-center active:bg-[#F0F0F0]"
              >
                <X size={18} className="text-[#5F6368]" />
              </button>
            )}
          </div>

          {/* 検索候補ドロップダウン */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="mt-1 bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] overflow-hidden max-h-[50vh] overflow-y-auto">
              {suggestions.map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedId(m.id);
                    setShowSuggestions(false);
                    setSearchQuery('');
                  }}
                  className="w-full text-left px-4 py-3 active:bg-[#F0F0F0] border-b border-[#F0F0F0] last:border-b-0"
                >
                  <div className="text-[14px] font-medium">{m.name}</div>
                  {m.address && (
                    <div className="text-[12px] text-[#5F6368] truncate mt-0.5">{m.address}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* レイヤー切替ボタンだけ右端に（フィルターはシート内に移動済み） */}
        <div className="mt-2 px-3 pointer-events-auto flex items-center justify-end">
          <button
            type="button"
            onClick={() => setLayerMode(m => (m === 'standard' ? 'satellite' : 'standard'))}
            aria-label={layerMode === 'standard' ? '航空写真に切り替え' : '通常マップに切り替え'}
            className="shrink-0 w-11 h-11 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.15)] flex items-center justify-center active:scale-95 transition-transform"
          >
            <Layers
              size={20}
              className={layerMode === 'satellite' ? 'text-[var(--color-primary)]' : 'text-[#5F6368]'}
              strokeWidth={2}
            />
          </button>
        </div>
      </div>

      {/* メンバー一覧シート。
          - メンバー選択中は隠す（MemberBottomSheet が前面に来る）
          - ユーザーがマップをドラッグしたら mini スナップへ自動で下がる */}
      <MembersListSheet
        members={members}
        open={!selectedId}
        onClose={() => { /* closable=false なので呼ばれない */ }}
        onSelectMember={(id) => setSelectedId(id)}
        filter={filter}
        periodFilter={periodFilter}
        categoryFilter={categoryFilter}
        onFiltersChange={handleFiltersChange}
        sheetHandleRef={listSheetRef}
        renderAbove={renderLocateButton}
      />

      {/* メンバー詳細ボトムシート（ピン/カードタップで上に重なる） */}
      <MemberBottomSheet
        member={selectedMember}
        onClose={() => setSelectedId(null)}
        sheetHandleRef={memberSheetRef}
        renderAbove={renderLocateButton}
      />
    </div>
  );
}
