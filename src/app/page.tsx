'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { Plus, LocateFixed, Search, X } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { MemberWithVisitInfo } from '../lib/types';
import { getMembersWithVisitInfo } from '../lib/storage';
import MemberBottomSheet from '../components/MemberBottomSheet';
import DistrictMembersBottomSheet from '../components/DistrictMembersBottomSheet';

const MapView = dynamic(() => import('../components/MapView'), { ssr: false });

const DISTRICTS: { key: string; short: string }[] = [
  { key: '豊岡部香城地区', short: '香城' },
  { key: '豊岡部英雄地区', short: '英雄' },
  { key: '豊岡部正義地区', short: '正義' },
  { key: '光陽部光陽地区', short: '光陽' },
  { key: '光陽部光輝地区', short: '光輝' },
  { key: '光陽部黄金地区', short: '黄金' },
  { key: '豊岡中央支部歓喜地区', short: '歓喜' },
  { key: '豊岡中央支部ナポレオン地区', short: 'ナポレオン' },
  { key: '豊岡中央支部幸福地区', short: '幸福' },
];

export default function HomePage() {
  const [members, setMembers] = useState<MemberWithVisitInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [district, setDistrict] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
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

  // 地区フィルター適用後のメンバー
  const filteredMembers = useMemo(() => {
    if (!district) return members;
    return members.filter(m => m.district === district);
  }, [members, district]);

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
      {/* マップ全面表示 — absoluteで親コンテナ内に収める（fixedはタッチイベント干渉の原因）。
          親のpb分だけ下に拡張してタブバー境界のグレー線を消す */}
      <div
        ref={mapWrapRef}
        className="absolute inset-0 z-0"
        style={{ touchAction: 'none', bottom: 'calc(-60px - env(safe-area-inset-bottom))' }}
      >
        <MapView
          members={filteredMembers}
          selectedMemberId={selectedId}
          onMemberSelect={(id) => setSelectedId(id)}
          onMapClick={() => { setSelectedId(null); setDistrict(null); setShowSuggestions(false); }}
        />
      </div>

      {/* Google Maps風 上部オーバーレイ: 検索バー + 地区チップ */}
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

        {/* 地区フィルターチップ */}
        <div className="mt-2 overflow-x-auto no-scrollbar pointer-events-auto">
          <div className="flex gap-2 px-3 pb-1">
            <button
              onClick={() => setDistrict(null)}
              className={`shrink-0 h-8 px-3 rounded-full text-[13px] font-medium whitespace-nowrap shadow-[0_1px_3px_rgba(0,0,0,0.15)] transition-colors ${
                district === null
                  ? 'bg-[#E8F0FE] text-[#1A73E8] border border-[#1A73E8]'
                  : 'bg-white text-[#3C4043] border border-white'
              }`}
            >
              すべて
            </button>
            {DISTRICTS.map(({ key, short }) => (
              <button
                key={key}
                onClick={() => setDistrict(district === key ? null : key)}
                className={`shrink-0 h-8 px-3 rounded-full text-[13px] font-medium whitespace-nowrap shadow-[0_1px_3px_rgba(0,0,0,0.15)] transition-colors ${
                  district === key
                    ? 'bg-[#E8F0FE] text-[#1A73E8] border border-[#1A73E8]'
                    : 'bg-white text-[#3C4043] border border-white'
                }`}
              >
                {short}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 現在地ボタン */}
      <button
        onClick={handleLocate}
        disabled={locating}
        aria-label="現在地"
        className="fixed right-5 bottom-[calc(152px+env(safe-area-inset-bottom))] z-30 w-14 h-14 rounded-full bg-white text-[#111] flex items-center justify-center shadow-lg active:scale-95 transition-transform disabled:opacity-70"
      >
        <LocateFixed size={24} className={locating ? 'animate-spin' : ''} />
      </button>

      {/* FAB: 訪問を記録 */}
      <Link
        href="/visits/new"
        className="fixed right-5 bottom-[calc(80px+env(safe-area-inset-bottom))] z-30 w-14 h-14 rounded-full bg-[#111] text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      >
        <Plus size={24} />
      </Link>

      {/* 地区メンバー一覧ボトムシート（地区選択中 & メンバー未選択時のみ） */}
      <DistrictMembersBottomSheet
        districtShort={district && !selectedId ? (DISTRICTS.find(d => d.key === district)?.short ?? null) : null}
        members={filteredMembers}
        onSelectMember={(id) => setSelectedId(id)}
        onClose={() => setDistrict(null)}
      />

      {/* メンバー詳細ボトムシート */}
      <MemberBottomSheet
        member={selectedMember}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
