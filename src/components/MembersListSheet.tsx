'use client';

import { useCallback, useMemo, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import type { MemberWithVisitInfo } from '../lib/types';
import { VISIT_STATUS_CONFIG, findParentOrg, ORG_HIERARCHY } from '../lib/constants';
import MemberCard from './MemberCard';
import DistrictFilter, { type FilterSelection, matchFilter, EMPTY_FILTER } from './DistrictFilter';
import SwipeableBottomSheet from './SwipeableBottomSheet';

// ──────────────────────────────────────────────────────────────
// ホームの地図上に常時出す「メンバー一覧シート」
// メンバータブの list view と同じ 3 分割ピル + 50音グルーピング + カード
// をそのままシート化したもの。
// ピンタップなどで親から selectedMemberId が立つと、このシートの上に
// MemberBottomSheet (z=40) が重なる。
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

const PERIOD_FILTERS: { key: string; label: string; minDays: number; maxDays: number }[] = [
  { key: 'this_week', label: '今週', minDays: 0, maxDays: 7 },
  { key: 'last_week', label: '先週', minDays: 8, maxDays: 14 },
  { key: 'two_weeks', label: '2週間前', minDays: 15, maxDays: 21 },
  { key: 'one_month', label: '1ヶ月', minDays: 0, maxDays: 30 },
];

const CATEGORY_FILTERS: { key: string; label: string }[] = [
  { key: 'visited', label: '訪問済み' },
  { key: 'unvisited', label: '未訪問' },
  ...Object.entries(VISIT_STATUS_CONFIG).map(([key, config]) => ({ key, label: config.label })),
];

type PillKey = 'district' | 'period' | 'category' | null;

interface Props {
  members: MemberWithVisitInfo[];
  /** シートを開くかどうか（地図タップで false, 再表示ボタンで true） */
  open: boolean;
  /** ジェスチャー/タップで閉じられた時 */
  onClose: () => void;
  /** カード/ピンから選択された時 */
  onSelectMember: (id: string) => void;
  /** 地図ピンをフィルターするために filter 変更を親に通知 */
  filter: FilterSelection;
  onFilterChange: (f: FilterSelection) => void;
}

export default function MembersListSheet({
  members,
  open,
  onClose,
  onSelectMember,
  filter,
  onFilterChange,
}: Props) {
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<string | null>(null);
  const [openPill, setOpenPill] = useState<PillKey>(null);

  const selectPreset = useCallback((key: string | null) => {
    setPeriodFilter(key);
  }, []);

  const filtered = useMemo(() => {
    const period = periodFilter ? PERIOD_FILTERS.find(p => p.key === periodFilter) : null;
    const result = members.filter(m => {
      if (!matchFilter(m, filter)) return false;
      if (categoryFilter) {
        if (categoryFilter === 'unvisited') {
          if (m.totalVisits > 0) return false;
        } else if (categoryFilter === 'visited') {
          if (m.totalVisits === 0) return false;
        } else {
          if (m.lastVisitStatus !== categoryFilter) return false;
        }
      }
      if (period) {
        const d = m.daysSinceLastVisit;
        if (d === undefined) return false;
        if (d < period.minDays || d > period.maxDays) return false;
      }
      return true;
    });
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

  const districtLabel = useMemo(() => {
    if (filter.parent) {
      const parent = findParentOrg(filter.parent);
      if (!parent) return 'すべて';
      if (filter.leaf) {
        const leaf = parent.children.find(c => c.key === filter.leaf);
        return leaf ? `${parent.short}・${leaf.short}` : parent.short;
      }
      return parent.short;
    }
    if (filter.category) {
      const cat = ORG_HIERARCHY.find(c => c.category === filter.category);
      return cat ? `${cat.label}すべて` : 'すべて';
    }
    return 'すべて';
  }, [filter]);

  const periodLabel = periodFilter
    ? PERIOD_FILTERS.find(p => p.key === periodFilter)?.label ?? 'すべて'
    : 'すべて';
  const categoryLabel = categoryFilter
    ? CATEGORY_FILTERS.find(c => c.key === categoryFilter)?.label ?? 'すべて'
    : 'すべて';

  const hasAnyFilter =
    filter.parent !== null || filter.category !== null || periodFilter !== null || categoryFilter !== null;

  return (
    <SwipeableBottomSheet
      open={open}
      onClose={onClose}
      peekHeight={240}
      zIndex={30}
      // full のとき safe-area-inset-top のすぐ下まで上がる → 検索バーを完全に覆う
      topGap="env(safe-area-inset-top)"
    >
      {() => (
        <div className="flex flex-col h-full">
          {/* ヘッダー: タイトル + 人数 + 3分割ピル（sticky ではなく固定） */}
          <div className="px-4 pt-1 pb-2 border-b border-[#F0F0F0] shrink-0">
            <div className="flex items-baseline justify-between mb-2">
              <div className="flex items-baseline gap-2">
                <h2 className="text-lg font-bold">メンバー</h2>
                <span className="text-sm text-[var(--color-subtext)]">{filtered.length}人</span>
              </div>
              {hasAnyFilter && (
                <button
                  onClick={() => {
                    onFilterChange(EMPTY_FILTER);
                    setPeriodFilter(null);
                    setCategoryFilter(null);
                  }}
                  className="text-xs text-[var(--color-subtext)] underline"
                >
                  クリア
                </button>
              )}
            </div>

            {/* 3分割ピル */}
            <div className="relative">
              <div className="flex items-stretch bg-white rounded-xl shadow-[0_2px_6px_rgba(0,0,0,0.08)] border border-[#E5E5EA] overflow-hidden h-9">
                <button
                  onClick={() => setOpenPill(openPill === 'district' ? null : 'district')}
                  className={`flex-1 text-left px-3 transition-colors min-w-0 ${openPill === 'district' ? 'bg-[#F5F5F5]' : 'active:bg-[#F5F5F5]'}`}
                >
                  <div className="flex items-center justify-between h-full gap-1">
                    <div className="flex items-baseline gap-1.5 min-w-0">
                      <span className="text-[10px] font-bold text-[var(--color-text)] shrink-0">地区</span>
                      <span className={`text-[12px] truncate ${(filter.parent || filter.category) ? 'text-[var(--color-text)] font-medium' : 'text-[var(--color-subtext)]'}`}>
                        {districtLabel}
                      </span>
                    </div>
                    <ChevronDown size={12} className="text-[var(--color-subtext)] shrink-0" />
                  </div>
                </button>

                <div className="w-px bg-[#E5E5EA] my-2" />

                <button
                  onClick={() => setOpenPill(openPill === 'period' ? null : 'period')}
                  className={`flex-1 text-left px-3 transition-colors min-w-0 ${openPill === 'period' ? 'bg-[#F5F5F5]' : 'active:bg-[#F5F5F5]'}`}
                >
                  <div className="flex items-center justify-between h-full gap-1">
                    <div className="flex items-baseline gap-1.5 min-w-0">
                      <span className="text-[10px] font-bold text-[var(--color-text)] shrink-0">期間</span>
                      <span className={`text-[12px] truncate ${periodFilter ? 'text-[var(--color-text)] font-medium' : 'text-[var(--color-subtext)]'}`}>
                        {periodLabel}
                      </span>
                    </div>
                    <ChevronDown size={12} className="text-[var(--color-subtext)] shrink-0" />
                  </div>
                </button>

                <div className="w-px bg-[#E5E5EA] my-2" />

                <button
                  onClick={() => setOpenPill(openPill === 'category' ? null : 'category')}
                  className={`flex-1 text-left px-3 transition-colors min-w-0 ${openPill === 'category' ? 'bg-[#F5F5F5]' : 'active:bg-[#F5F5F5]'}`}
                >
                  <div className="flex items-center justify-between h-full gap-1">
                    <div className="flex items-baseline gap-1.5 min-w-0">
                      <span className="text-[10px] font-bold text-[var(--color-text)] shrink-0">カテゴリ</span>
                      <span className={`text-[12px] truncate ${categoryFilter ? 'text-[var(--color-text)] font-medium' : 'text-[var(--color-subtext)]'}`}>
                        {categoryLabel}
                      </span>
                    </div>
                    <ChevronDown size={12} className="text-[var(--color-subtext)] shrink-0" />
                  </div>
                </button>
              </div>

              {openPill && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setOpenPill(null)} />
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.15)] z-20 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0F0F0]">
                      <span className="text-sm font-bold">
                        {openPill === 'district' ? '地区を選択' : openPill === 'period' ? '期間を選択' : 'カテゴリを選択'}
                      </span>
                      <button onClick={() => setOpenPill(null)} className="w-7 h-7 rounded-full flex items-center justify-center active:bg-[#F0F0F0]">
                        <X size={16} className="text-[var(--color-subtext)]" />
                      </button>
                    </div>
                    <div className="max-h-[50vh] overflow-y-auto">
                      {openPill === 'district' && (
                        <div className="p-3">
                          <DistrictFilter
                            selection={filter}
                            onChange={onFilterChange}
                            members={members}
                          />
                          <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#F0F0F0]">
                            <button
                              onClick={() => onFilterChange(EMPTY_FILTER)}
                              className="text-xs text-[var(--color-subtext)] underline px-1"
                            >
                              クリア
                            </button>
                            <button
                              onClick={() => setOpenPill(null)}
                              className="text-xs font-bold text-white bg-[#222] rounded-full px-4 py-1.5"
                            >
                              適用
                            </button>
                          </div>
                        </div>
                      )}
                      {openPill === 'period' && (
                        <div className="p-3">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => { selectPreset(null); setOpenPill(null); }}
                              className={`px-3 py-1.5 text-[12px] rounded-full border transition-colors ${
                                !periodFilter ? 'bg-[#222] text-white border-[#222]' : 'bg-white text-[#222] border-[#E5E5EA] active:bg-[#F5F5F5]'
                              }`}
                            >
                              すべて
                            </button>
                            {PERIOD_FILTERS.map(p => (
                              <button
                                key={p.key}
                                onClick={() => { selectPreset(p.key); setOpenPill(null); }}
                                className={`px-3 py-1.5 text-[12px] rounded-full border transition-colors ${
                                  periodFilter === p.key ? 'bg-[#222] text-white border-[#222]' : 'bg-white text-[#222] border-[#E5E5EA] active:bg-[#F5F5F5]'
                                }`}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {openPill === 'category' && (
                        <>
                          <button
                            onClick={() => { setCategoryFilter(null); setOpenPill(null); }}
                            className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between active:bg-[#F5F5F5] border-b border-[#F5F5F5] ${categoryFilter === null ? 'bg-[#F8F8F8] font-bold' : ''}`}
                          >
                            <span>すべて</span>
                            {categoryFilter === null && <span className="text-[var(--color-primary)]">✓</span>}
                          </button>
                          {CATEGORY_FILTERS.map(c => (
                            <button
                              key={c.key}
                              onClick={() => { setCategoryFilter(c.key); setOpenPill(null); }}
                              className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between active:bg-[#F5F5F5] border-b border-[#F5F5F5] last:border-b-0 ${categoryFilter === c.key ? 'bg-[#F8F8F8] font-bold' : ''}`}
                            >
                              <span>{c.label}</span>
                              {categoryFilter === c.key && <span className="text-[var(--color-primary)]">✓</span>}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* リスト */}
          <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4">
            {filtered.length === 0 ? (
              <p className="text-sm text-[var(--color-subtext)] text-center py-4">メンバーが見つかりません</p>
            ) : (
              <div className="space-y-1">
                {grouped.map(group => (
                  <div key={group.label}>
                    <div className="text-xs font-bold text-[var(--color-subtext)] bg-white sticky top-0 py-1.5 px-1 z-10">
                      {group.label}行
                    </div>
                    <div className="space-y-2">
                      {group.members.map(m => (
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
  );
}
