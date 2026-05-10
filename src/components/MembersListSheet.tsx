'use client';

import { useMemo, useState, useCallback, type Ref, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal, Printer } from 'lucide-react';
import type { MemberWithVisitInfo, Visit } from '../lib/types';
import MemberCard from './MemberCard';
import { type FilterSelection, matchFilter } from './DistrictFilter';
import SwipeableBottomSheet, { type SheetHandle } from './SwipeableBottomSheet';
import FilterModal, { PERIOD_FILTERS } from './FilterModal';

// ──────────────────────────────────────────────────────────────
// ホームの地図上に常時出す「メンバー一覧シート」
//
// peek の高さを極端に低くして、マップ操作時に sheet を mini まで
// 下げられるようにした（mini = 見出し 1 行だけ）。
// フィルター UI は peek からは消し、右上のアイコンから開く FilterModal
// に集約している。
// ──────────────────────────────────────────────────────────────

interface Props {
  members: MemberWithVisitInfo[];
  /** メンバー単位の訪問ログ Map(新しい順)。各メンバーカードに withLogs で渡す */
  visitsByMember?: Map<string, Visit[]>;
  /** シートを開くかどうか（ホームでは常に true） */
  open: boolean;
  /** ジェスチャーで閉じられた時 */
  onClose: () => void;
  /** カード/ピンから選択された時 */
  onSelectMember: (id: string) => void;
  /** 地区フィルター（HomePage で hold） */
  filter: FilterSelection;
  /** 期間フィルター（HomePage で hold） */
  periodFilter: string | null;
  /** カテゴリフィルター（HomePage で hold） */
  categoryFilter: string | null;
  /** フィルター3点まとめて変更する（マップと一覧を同時に動かすため） */
  onFiltersChange: (next: AppliedFilters) => void;
  /** 親から imperative にスナップ位置を制御したい時の ref */
  sheetHandleRef?: Ref<SheetHandle>;
  /** シート上端の外に浮かべる要素（現在地ボタン等） */
  renderAbove?: () => ReactNode;
}

export type AppliedFilters = {
  filter: FilterSelection;
  periodFilter: string | null;
  categoryFilter: string | null;
};

// 実際の matcher。FilterModal からプレビュー件数を求めるのにも、
// HomePage がマップピンの絞り込みに使うのにも、両方に使う共通関数。
export function applyAllFilters(members: MemberWithVisitInfo[], a: AppliedFilters): MemberWithVisitInfo[] {
  const period = a.periodFilter ? PERIOD_FILTERS.find((p) => p.key === a.periodFilter) : null;
  return members.filter((m) => {
    if (!matchFilter(m, a.filter)) return false;
    if (a.categoryFilter) {
      if (a.categoryFilter === 'unvisited') {
        if (m.totalVisits > 0) return false;
      } else if (a.categoryFilter === 'visited') {
        if (m.totalVisits === 0) return false;
      } else {
        if (m.lastVisitStatus !== a.categoryFilter) return false;
      }
    }
    if (period) {
      const d = m.daysSinceLastVisit;
      if (d === undefined) return false;
      if (d < period.minDays || d > period.maxDays) return false;
    }
    return true;
  });
}

// peek: 初期表示で「メンバーの3〜4人目ぐらいまで見える」高さ
// （ヘッダー + あ行ラベル + カード数枚 + 下部タブに被らない余白）
// 320: スマホで iOS のホームインジケータ域を考慮しても
//      フィルターアイコンやボタンが見切れないサイズ
const PEEK_HEIGHT = 320;
// mini: 見出し行＋ドラッグハンドルだけ（限界まで下げる）
const MINI_HEIGHT = 80;

export default function MembersListSheet({
  members,
  visitsByMember,
  open,
  onClose,
  onSelectMember,
  filter,
  periodFilter,
  categoryFilter,
  onFiltersChange,
  sheetHandleRef,
  renderAbove,
}: Props) {
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const router = useRouter();

  // 注意: ここで filtered に渡す members は、すでに HomePage 側でも
  // 同じ applyAllFilters を通った filteredMembers が渡ってくるので、
  // 二重適用しても結果は同じ（idempotent）。あえて再適用してるのは、
  // FilterModal が「地区/期間/カテゴリ」を個別の draft 状態で動かしても
  // ちゃんと再計算されるようにするための保険。
  const filtered = useMemo(() => {
    const result = applyAllFilters(members, { filter, periodFilter, categoryFilter });
    result.sort((a, b) => {
      const aKana = a.nameKana ?? a.name;
      const bKana = b.nameKana ?? b.name;
      return aKana.localeCompare(bKana, 'ja');
    });
    return result;
  }, [members, filter, categoryFilter, periodFilter]);

const hasAnyFilter =
    filter.honbu !== null ||
    filter.bu !== null ||
    filter.district !== null ||
    filter.category !== null ||
    periodFilter !== null ||
    categoryFilter !== null;

  // FilterModal のリアルタイム onChange ハンドラ
  // 親 (HomePage) に3点まとめて通知 → マップピンも即連動
  const handleFilterChange = useCallback(
    (next: AppliedFilters) => {
      onFiltersChange(next);
    },
    [onFiltersChange],
  );

  // 旧「クリア」ボタンは PDF 出力ボタンに置き換え (2026-05-09)。
  // フィルタ全クリアは FilterModal 内のボタンから可能。

  return (
    <>
      <SwipeableBottomSheet
        open={open}
        onClose={onClose}
        peekHeight={PEEK_HEIGHT}
        miniHeight={MINI_HEIGHT}
        zIndex={30}
        closable={false}
        // full のとき safe-area-inset-top のすぐ下まで上がる
        topGap="env(safe-area-inset-top)"
        handleRef={sheetHandleRef}
        renderAbove={renderAbove ? () => <><div />{renderAbove()}</> : undefined}
      >
        {() => (
          <div className="flex flex-col h-full">
            {/* ヘッダー: メンバー + 人数 + フィルターアイコン（右端） */}
            <div className="px-4 pt-0 pb-2 border-b border-[#F0F0F0] shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-lg font-bold">メンバー</h2>
                  <span className="text-sm text-[var(--color-subtext)]">
                    {filtered.length}人
                    <span className="ml-1 text-[var(--color-subtext)]">
                      （訪問済み{filtered.filter(m => m.totalVisits > 0).length}人）
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* PDF (印刷) ボタン: フィルタ済み全員を 1人1ページ A4 横で出力。
                      旧「クリア」リンクの動線をここに置き換え (2026-05-09 ヒデさん指示)。
                      sessionStorage 経由で対象 ID リストを /members/print に渡す。 */}
                  <button
                    onClick={() => {
                      if (filtered.length === 0) return;
                      try {
                        window.sessionStorage.setItem(
                          'print:memberIds',
                          JSON.stringify(filtered.map(m => m.id)),
                        );
                      } catch { /* sessionStorage 不可環境は黙って諦める */ }
                      router.push('/members/print');
                    }}
                    aria-label={`PDF出力 (${filtered.length}人)`}
                    disabled={filtered.length === 0}
                    className="w-11 h-11 rounded-full flex items-center justify-center active:bg-[#F0F0F0] disabled:opacity-40"
                  >
                    <Printer size={22} className="text-[var(--color-subtext)]" />
                  </button>
                  <button
                    onClick={() => setFilterModalOpen(true)}
                    aria-label="フィルター"
                    className={`relative w-11 h-11 rounded-full flex items-center justify-center active:bg-[#F0F0F0] ${
                      hasAnyFilter ? 'bg-[#F0F0F0]' : ''
                    }`}
                  >
                    <SlidersHorizontal
                      size={24}
                      className={hasAnyFilter ? 'text-[var(--color-text)]' : 'text-[var(--color-subtext)]'}
                    />
                    {hasAnyFilter && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* リスト (50音ラベル撤廃 2026-05-06: フラットな1列表示)
                pt は --tune-mc-list-pad-top で Tuner 調整可。
                ヒデさん指示 (2026-05-06): 一番上のカードと検索ヘッダーの間をもう少し空けたい。
                ヒデさん指示 (2026-05-08): さらにもう一段広げる (12 → 18px)。
                24px だと開きすぎだったので 18px に微調整。 */}
            <div
              className="flex-1 overflow-y-auto px-4 pb-4"
              style={{ paddingTop: 'var(--tune-mc-list-pad-top, 18px)' }}
            >
              {filtered.length === 0 ? (
                <p className="text-sm text-[var(--color-subtext)] text-center py-4">メンバーが見つかりません</p>
              ) : (
                <div className="flex flex-col" style={{ gap: 'var(--tune-mc-gap, 8px)' }}>
                  {filtered.map((m) => (
                    <MemberCard
                      key={m.id}
                      member={m}
                      onSelect={onSelectMember}
                      withLogs
                      visits={visitsByMember?.get(m.id) ?? []}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SwipeableBottomSheet>

      <FilterModal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        filter={filter}
        periodFilter={periodFilter}
        categoryFilter={categoryFilter}
        onChange={handleFilterChange}
        members={members}
        matchCount={filtered.length}
      />
    </>
  );
}
