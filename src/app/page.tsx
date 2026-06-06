'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { LocateFixed, Search, X, Layers } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { MemberWithVisitInfo, Visit } from '../lib/types';
import { getMembersWithVisitInfo, getAllVisits } from '../lib/storage';
import { supabase, isMockMode } from '../lib/supabase';
import { searchMembers } from '../lib/search';
import MemberBottomSheet from '../components/MemberBottomSheet';
import MembersListSheet, { applyAllFilters, classifyMember, type AppliedFilters, type VisitTab } from '../components/MembersListSheet';
import type { CategoryKey, VisitLogKey } from '../components/FilterModal';
import SearchHits from '../components/SearchHits';
import { type FilterSelection, EMPTY_FILTER, migrateFilter } from '../components/DistrictFilter';
import type { MapLayerMode } from '../components/MapView';
import type { SheetHandle } from '../components/SwipeableBottomSheet';

const MapView = dynamic(() => import('../components/MapView'), { ssr: false });

// 詳細ページから戻ってきた時に「見ていた人のピンを中央に表示する」ための
// sessionStorage キー。詳細ページで setItem しておいて、このページのマウント時に
// 読み込んで selectedId に復元する。一度使ったらクリア。
const LAST_VIEWED_MEMBER_KEY = 'houmon_lastViewedMemberId';

export default function HomePage() {
  const [members, setMembers] = useState<MemberWithVisitInfo[]>([]);
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const id = sessionStorage.getItem(LAST_VIEWED_MEMBER_KEY);
      if (id) sessionStorage.removeItem(LAST_VIEWED_MEMBER_KEY);
      return id;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // フィルター3点を全部 HomePage で hold する。
  // こうしないと、子の MembersListSheet が内部 state で抱えると
  // マップピン用の filteredMembers に反映されず「件数0なのにピン残ってる」状態になる。
  const [filter, setFilter] = useState<FilterSelection>(() => {
    if (typeof window === 'undefined') return EMPTY_FILTER;
    try {
      const s = localStorage.getItem('houmon_filter');
      if (!s) return EMPTY_FILTER;
      // 旧 {category, parent, leaf} → 新 {category, honbu, bu, district} へ移行
      return migrateFilter(JSON.parse(s));
    } catch { return EMPTY_FILTER; }
  });
  // 2026-05-13 フィルタ大改装 (ヒデさん指示):
  // - 「最終訪問からの期間」フィルタを廃止 → houmon_periodFilter は無視
  // - 旧 categoryFilter (訪問ステータス) を 2 セクションに分割:
  //     houmon_categoryFilter (新) = 'visited' | 'unvisited' | null
  //     houmon_visitLogFilter      = 'met' | 'absent' | 'unknown_address' | 'moved' | null
  const [categoryFilter, setCategoryFilter] = useState<CategoryKey | null>(() => {
    if (typeof window === 'undefined') return null;
    const v = localStorage.getItem('houmon_categoryFilter');
    return v === 'visited' || v === 'unvisited' ? v : null;
  });
  const [visitLogFilter, setVisitLogFilter] = useState<VisitLogKey | null>(() => {
    if (typeof window === 'undefined') return null;
    const v = localStorage.getItem('houmon_visitLogFilter');
    return v === 'met' || v === 'absent' || v === 'unknown_address' || v === 'moved' ? v : null;
  });
  // 3 タブ。マップピンと メンバー一覧シートを 1 つの state で同期。
  // (2026-05-13 ヒデさん指示で連動するように修正)
  const [tab, setTab] = useState<VisitTab>(() => {
    if (typeof window === 'undefined') return 'go';
    const v = localStorage.getItem('houmon_tab');
    return (v === 'go' || v === 'no' || v === 'skip') ? v : 'go';
  });
  const handleTabChange = useCallback((next: VisitTab) => {
    setTab(next);
    try { localStorage.setItem('houmon_tab', next); } catch {}
  }, []);
  // ピン位置編集モード: ボトムシート内の Move ボタン押下で立ち上がる。
  // null = 編集中ではない。string = その id のピンが draggable + 確認モーダル待ち。
  const [editingPinMemberId, setEditingPinMemberId] = useState<string | null>(null);
  const handleFiltersChange = useCallback((next: AppliedFilters) => {
    setFilter(next.filter);
    setCategoryFilter(next.categoryFilter);
    setVisitLogFilter(next.visitLogFilter);
    try {
      localStorage.setItem('houmon_filter', JSON.stringify(next.filter));
      if (next.categoryFilter) localStorage.setItem('houmon_categoryFilter', next.categoryFilter);
      else localStorage.removeItem('houmon_categoryFilter');
      if (next.visitLogFilter) localStorage.setItem('houmon_visitLogFilter', next.visitLogFilter);
      else localStorage.removeItem('houmon_visitLogFilter');
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
    // 検索で使う訪問ログ summary も一緒に取得(最初の1回だけ)
    Promise.all([getMembersWithVisitInfo(), getAllVisits()])
      .then(([m, v]) => { setMembers(m); setAllVisits(v); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ─── iPhone / iPad シームレス同期: Supabase Realtime 購読 ───
  // visits / members どちらかが変わったら debounce 付きで全件再フェッチ。
  // 片方の端末で記録/編集 → もう片方が即時反映される(自動リロード不要)。
  // テーブルが Supabase 側で Realtime publication に登録されている前提
  // (sql/2026-04-26-status-split-and-realtime.sql で ALTER PUBLICATION 済)。
  useEffect(() => {
    if (isMockMode) return; // .env 未設定のローカル mock 時は購読しない
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefetch = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        Promise.all([getMembersWithVisitInfo(), getAllVisits()])
          .then(([m, v]) => { setMembers(m); setAllVisits(v); })
          .catch(() => {});
      }, 500);
    };
    const channel = supabase
      .channel('houmon-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visits' }, scheduleRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, scheduleRefetch)
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  // 起動時に自動で現在地を取得 — 「既に許可済み」のときだけ実行する。
  //   - Permissions API が使える環境(Safari16+, Chrome 等)で state が 'granted' なら静かに実行
  //   - 'prompt' / 'denied' / Permissions API 未対応のレガシー環境では起動時に呼ばない
  //     (毎回の許可ダイアログを抑制。ユーザーが「現在地ボタン」を押した時だけ prompt が出る)
  const autoLocatedRef = useRef(false);
  useEffect(() => {
    if (autoLocatedRef.current) return;
    autoLocatedRef.current = true;
    if (!navigator.geolocation) return;

    const runSilent = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const container = mapWrapRef.current?.querySelector('.leaflet-container');
          container?.dispatchEvent(
            new CustomEvent('locate-me', { detail: { lat: pos.coords.latitude, lng: pos.coords.longitude } })
          );
        },
        () => { /* サイレントに失敗 */ },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
      );
    };

    // Permissions API があればチェックして granted のときだけ位置取得
    if ('permissions' in navigator && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then(result => {
          if (result.state === 'granted') runSilent();
          // 'prompt' / 'denied' は起動時にダイアログを出さない
        })
        .catch(() => { /* Permissions API がコケたら何もしない(ダイアログ出ないように) */ });
    }
    // Permissions API 未対応のブラウザでも安全側に倒す: 起動時の自動取得はせず、
    // ユーザーが現在地ボタンを押した時だけ prompt 出す
  }, []);

  const selectedMember = useMemo(
    () => members.find(m => m.id === selectedId) ?? null,
    [members, selectedId]
  );

  // 現在地ボタンのみ。設定ボタンは 2026-05-13 にボトムナビへ移設。
  const renderLocateButton = useCallback(() => (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleLocate}
        disabled={locating}
        aria-label="現在地"
        className="w-12 h-12 rounded-full bg-white text-[#5F6368] flex items-center justify-center shadow-[0_3px_10px_rgba(0,0,0,0.22)] active:scale-95 transition-transform disabled:opacity-70"
      >
        <LocateFixed size={22} strokeWidth={2} className={locating ? 'animate-spin' : ''} />
      </button>
    </div>
  ), [handleLocate, locating]);

  // フィルター3点（地区 / カテゴリ / 訪問ログ）を適用したメンバー (タブ判定の前)。
  // タブ件数バッジは これを土台に「いける/いけない/スキップ」の分布を出す。
  const preTabMembers = useMemo(
    () => applyAllFilters(members, { filter, categoryFilter, visitLogFilter }),
    [members, filter, categoryFilter, visitLogFilter],
  );

  // 上記に さらに タブ判定 (classifyMember) を掛けた最終集合。
  // マップピンと リスト両方の "唯一の真実"。
  // 「ヤング × いける人」のような組合せも自然に満たす。
  const filteredMembers = useMemo(
    () => preTabMembers.filter(m => classifyMember(m) === tab),
    [preTabMembers, tab],
  );

  // メンバー単位の訪問ログ Map。各シートで MemberCard withLogs に渡すため作る。
  // allVisits は既に visited_at desc(新しい順)で取得済 → そのまま push で OK。
  const visitsByMember = useMemo<Map<string, Visit[]>>(() => {
    const map = new Map<string, Visit[]>();
    for (const v of allVisits) {
      const arr = map.get(v.memberId);
      if (arr) arr.push(v);
      else map.set(v.memberId, [v]);
    }
    return map;
  }, [allVisits]);

  // 検索ヒット(横断検索: 名前/ふりがな/地区/住所/職場/家族/情報/備考/訪問ログsummary)
  // 1メンバー内で複数フィールドマッチした場合、1ヒット=1エントリで返る(P1 密リスト方式)。
  const searchHits = useMemo(() => {
    return searchMembers(searchQuery, filteredMembers, allVisits);
  }, [filteredMembers, allVisits, searchQuery]);

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
          editingMemberId={editingPinMemberId}
          onEditingMemberIdChange={setEditingPinMemberId}
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
          <div className="bg-white rounded-full shadow-[0_3px_10px_rgba(0,0,0,0.22)] flex items-center h-12 px-4">
            <Search size={22} className="text-[#5F6368] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="名前・住所・情報・訪問ログから検索"
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

          {/* 検索ヒットリスト(P1 密リスト方式: 1ヒット=1行、ハイライト付き)
              クリックするとメンバー詳細ページへ遷移し、該当セクションにスクロール＋フラッシュする。
              SearchHits 内部で Next Link を使うため、遷移はここで setSelectedId を呼ばなくて OK。 */}
          {showSuggestions && searchQuery.trim() && (
            <SearchHits
              hits={searchHits}
              query={searchQuery}
              onNavigate={() => {
                setShowSuggestions(false);
                setSearchQuery('');
              }}
            />
          )}
        </div>

        {/* 右端アクション: レイヤー切替のみ。
            (歯車アイコンは ヒデさん指示 2026-05-06 で renderLocateButton 内・現在地ボタンの真上に移動) */}
        <div className="mt-2 px-3 pointer-events-auto flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setLayerMode(m => (m === 'standard' ? 'satellite' : 'standard'))}
            aria-label={layerMode === 'standard' ? '航空写真に切り替え' : '通常マップに切り替え'}
            className="shrink-0 w-12 h-12 rounded-full bg-white shadow-[0_3px_10px_rgba(0,0,0,0.22)] flex items-center justify-center active:scale-95 transition-transform"
          >
            <Layers
              size={22}
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
        // タブ件数バッジを 現在のフィルタ下で計算したいので、
        // 「タブ判定前 / 地区・期間・カテゴリ適用後」の集合を渡す。
        // MembersListSheet 内で classifyMember(m) === tab に絞り直す。
        members={preTabMembers}
        visitsByMember={visitsByMember}
        // 編集モード中は一覧シートも閉じておく。ピン編集に集中させる + 確認モーダルが
        // シートに覆われる事故を防ぐ (2026-05-07 ヒデさん指示)。
        open={!selectedId && !editingPinMemberId}
        onClose={() => { /* closable=false なので呼ばれない */ }}
        onSelectMember={(id) => setSelectedId(id)}
        filter={filter}
        categoryFilter={categoryFilter}
        visitLogFilter={visitLogFilter}
        onFiltersChange={handleFiltersChange}
        tab={tab}
        onTabChange={handleTabChange}
        sheetHandleRef={listSheetRef}
        renderAbove={renderLocateButton}
      />

      {/* メンバー詳細ボトムシート（ピン/カードタップで上に重なる）。
          ヒデさん指示 (2026-05-04): どっちのタップでも peek で開く。
          ユーザーが上スワイプした時に full (検索バー越え 目一杯) まで上がる。 */}
      <MemberBottomSheet
        member={selectedMember}
        onClose={() => setSelectedId(null)}
        sheetHandleRef={memberSheetRef}
        renderAbove={renderLocateButton}
        // 行きたいトグル等で member 状態が変わったら、HomePage が握る配列も
        // 楽観更新する。これでマップピンの再描画(星マーク化)も即時に走る。
        onMemberUpdate={(memberId, updates) => {
          setMembers(prev =>
            prev.map(m => (m.id === memberId ? { ...m, ...updates } : m)),
          );
        }}
        // ピン編集ボタン: マップ側を編集モードにし、シートを閉じてピンが
        // 見えるようにする (2026-05-07 ヒデさん指示)。
        onStartEditPin={(memberId) => {
          setEditingPinMemberId(memberId);
          setSelectedId(null);
        }}
      />
    </div>
  );
}
