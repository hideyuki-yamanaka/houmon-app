'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { Plus, LocateFixed, Search, X, Layers, List } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { MemberWithVisitInfo } from '../lib/types';
import { getMembersWithVisitInfo } from '../lib/storage';
import MemberBottomSheet from '../components/MemberBottomSheet';
import MembersListSheet from '../components/MembersListSheet';
import { type FilterSelection, matchFilter, EMPTY_FILTER } from '../components/DistrictFilter';
import type { MapLayerMode } from '../components/MapView';

const MapView = dynamic(() => import('../components/MapView'), { ssr: false });

export default function HomePage() {
  const [members, setMembers] = useState<MemberWithVisitInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterSelection>(EMPTY_FILTER);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // マップのレイヤーモード（通常 ⇄ 航空写真）。セッション中のみ保持（永続化なし）
  const [layerMode, setLayerMode] = useState<MapLayerMode>('standard');
  // ボトムシートの表示状態。デフォルトは出ている。マップタップで下げる（Google Maps風）。
  const [sheetOpen, setSheetOpen] = useState(true);
  const mapWrapRef = useRef<HTMLDivElement>(null);

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

  const selectedMember = useMemo(
    () => members.find(m => m.id === selectedId) ?? null,
    [members, selectedId]
  );

  // 地区フィルター適用後のメンバー（階層対応）
  const filteredMembers = useMemo(() => {
    return members.filter(m => matchFilter(m, filter));
  }, [members, filter]);

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
            // Google Maps 風: マップをタップしたらシートを下げる（消す）
            // 地区フィルタや検索候補もクリア。メンバー選択中なら選択解除。
            setSelectedId(null);
            setFilter(EMPTY_FILTER);
            setShowSuggestions(false);
            setSheetOpen(false);
          }}
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

      {/* 現在地ボタン（シート peek の上に配置） */}
      <button
        onClick={handleLocate}
        disabled={locating}
        aria-label="現在地"
        className="fixed right-5 bottom-[calc(316px+env(safe-area-inset-bottom))] z-30 w-12 h-12 rounded-full bg-white text-[#111] flex items-center justify-center shadow-lg active:scale-95 transition-transform disabled:opacity-70"
      >
        <LocateFixed size={22} className={locating ? 'animate-spin' : ''} />
      </button>

      {/* FAB: 訪問を記録（現在地ボタンの上） */}
      <Link
        href="/visits/new"
        className="fixed right-5 bottom-[calc(380px+env(safe-area-inset-bottom))] z-30 w-12 h-12 rounded-full bg-[#111] text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      >
        <Plus size={22} />
      </Link>

      {/* メンバー一覧シート。
          - sheetOpen && !selectedId のときだけ表示
          - マップタップで sheetOpen=false になり隠れる
          - 隠れてる間は下の「一覧」チップで再表示 */}
      <MembersListSheet
        members={members}
        open={sheetOpen && !selectedId}
        onClose={() => setSheetOpen(false)}
        onSelectMember={(id) => setSelectedId(id)}
        filter={filter}
        onFilterChange={setFilter}
      />

      {/* シートが閉じてる時だけ出る「一覧」再表示チップ */}
      {!sheetOpen && !selectedId && (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="fixed left-1/2 -translate-x-1/2 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 h-10 px-4 rounded-full bg-white shadow-[0_3px_10px_rgba(0,0,0,0.18)] flex items-center gap-2 text-[13px] font-medium text-[#111] active:scale-95 transition-transform"
          aria-label="メンバー一覧を表示"
        >
          <List size={16} className="text-[#5F6368]" />
          メンバー一覧
        </button>
      )}

      {/* メンバー詳細ボトムシート（ピン/カードタップで上に重なる） */}
      <MemberBottomSheet
        member={selectedMember}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
