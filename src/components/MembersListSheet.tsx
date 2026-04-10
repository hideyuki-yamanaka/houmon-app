'use client';

import { useMemo, useState, useCallback, type Ref } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { MemberWithVisitInfo } from '../lib/types';
import MemberCard from './MemberCard';
import { type FilterSelection, matchFilter, EMPTY_FILTER } from './DistrictFilter';
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

function getKanaGroup(kana: string | undefined): string {
  if (!kana) return 'その他';
  const c = kana.charAt(0);
  if (/[あいうえおアイウエオ]/.test(c)) return 'あ';
  if (/[かきくけこがぎぐげごカキクケコガギグゲゴ]/.test(c)) return 'か';
  if (/[さしすせそざじずぜぞサシスセソザジズゼゾ]/.test(c)) return 'さ';
  if (/[たちつてとだぢづでどタチツテトダヂヅデド]/.test(c)) return 'た';
  if (/[なにぬねのナニヌネノ]/.test(c)) return 'な';
  if (/[はひふへほばびぶべぼぱぴぷぺぽハヒフヘホバビブベボパピプペポ]/.test(c)) return 'は';
  if (/[まみむめもマミムメモ]/.test(c)) return 'ま';
  if (/[やゆよヤユヨ]/.test(c)) return 'や';
  if (/[らりるれろラリルレロ]/.test(c)) return 'ら';
  if (/[わをんワヲン]/.test(c)) return 'わ';
  return 'その他';
}

interface Props {
  members: MemberWithVisitInfo[];
  /** シートを開くかどうか（ホームでは常に true） */
  open: boolean;
  /** ジェスチャーで閉じられた時 */
  onClose: () => void;
  /** カード/ピンから選択された時 */
  onSelectMember: (id: string) => void;
  /** 地図ピンをフィルターするために filter 変更を親に通知 */
  filter: FilterSelection;
  onFilterChange: (f: FilterSelection) => void;
  /** 親から imperative にスナップ位置を制御したい時の ref */
  sheetHandleRef?: Ref<SheetHandle>;
}

type AppliedFilters = {
  filter: FilterSelection;
  periodFilter: string | null;
  categoryFilter: string | null;
};

// 実際の matcher。FilterModal からプレビュー件数を求めるのにも使う。
function applyAllFilters(members: MemberWithVisitInfo[], a: AppliedFilters): MemberWithVisitInfo[] {
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

// peek: 見出し＋アイコンの1行＋ちょっとだけリストが覗く高さ
const PEEK_HEIGHT = 140;
// mini: 見出し行＋ドラッグハンドルだけ（限界まで下げる）
const MINI_HEIGHT = 72;

export default function MembersListSheet({
  members,
  open,
  onClose,
  onSelectMember,
  filter,
  onFilterChange,
  sheetHandleRef,
}: Props) {
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<string | null>(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const result = applyAllFilters(members, { filter, periodFilter, categoryFilter });
    result.sort((a, b) => {
      const aKana = a.nameKana ?? a.name;
      const bKana = b.nameKana ?? b.name;
      return aKana.localeCompare(bKana, 'ja');
    });
    return result;
  }, [members, filter, categoryFilter, periodFilter]);

  const grouped = useMemo(() => {
    const groups: { label: string; members: MemberWithVisitInfo[] }[] = [];
    let currentGroup = '';
    for (const m of filtered) {
      const g = getKanaGroup(m.nameKana);
      if (g !== currentGroup) {
        currentGroup = g;
        groups.push({ label: g, members: [m] });
      } else {
        groups[groups.length - 1].members.push(m);
      }
    }
    return groups;
  }, [filtered]);

  const hasAnyFilter =
    filter.parent !== null ||
    filter.category !== null ||
    periodFilter !== null ||
    categoryFilter !== null;

  // FilterModal の件数プレビュー用
  const countMatches = useCallback(
    (a: AppliedFilters) => applyAllFilters(members, a).length,
    [members],
  );

  const handleApply = useCallback(
    (next: AppliedFilters) => {
      onFilterChange(next.filter);
      setPeriodFilter(next.periodFilter);
      setCategoryFilter(next.categoryFilter);
    },
    [onFilterChange],
  );

  const handleClearAll = useCallback(() => {
    onFilterChange(EMPTY_FILTER);
    setPeriodFilter(null);
    setCategoryFilter(null);
  }, [onFilterChange]);

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
      >
        {() => (
          <div className="flex flex-col h-full">
            {/* ヘッダー: メンバー + 人数 + フィルターアイコン（右端） */}
            <div className="px-4 pt-1 pb-2 border-b border-[#F0F0F0] shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-lg font-bold">メンバー</h2>
                  <span className="text-sm text-[var(--color-subtext)]">{filtered.length}人</span>
                </div>
                <div className="flex items-center gap-2">
                  {hasAnyFilter && (
                    <button
                      onClick={handleClearAll}
                      className="text-xs text-[var(--color-subtext)] underline"
                    >
                      クリア
                    </button>
                  )}
                  <button
                    onClick={() => setFilterModalOpen(true)}
                    aria-label="フィルター"
                    className={`relative w-9 h-9 rounded-full flex items-center justify-center active:bg-[#F0F0F0] ${
                      hasAnyFilter ? 'bg-[#F0F0F0]' : ''
                    }`}
                  >
                    <SlidersHorizontal
                      size={18}
                      className={hasAnyFilter ? 'text-[var(--color-text)]' : 'text-[var(--color-subtext)]'}
                    />
                    {hasAnyFilter && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* リスト */}
            <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
              {filtered.length === 0 ? (
                <p className="text-sm text-[var(--color-subtext)] text-center py-4">メンバーが見つかりません</p>
              ) : (
                <div className="space-y-1">
                  {grouped.map((group) => (
                    <div key={group.label}>
                      <div className="text-xs font-bold text-[var(--color-subtext)] bg-white sticky top-0 py-1.5 px-1 z-10">
                        {group.label}行
                      </div>
                      <div className="space-y-2">
                        {group.members.map((m) => (
                          <MemberCard key={m.id} member={m} onSelect={onSelectMember} />
                        ))}
                      </div>
                    </div>
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
        onApply={handleApply}
        members={members}
        countMatches={countMatches}
      />
    </>
  );
}
