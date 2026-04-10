'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Table, Calendar, ChevronDown, X } from 'lucide-react';
import Link from 'next/link';
import type { MemberWithVisitInfo, Visit } from '../../lib/types';
import { VISIT_STATUS_CONFIG } from '../../lib/constants';
import { getMembersWithVisitInfo, getAllVisits, getVisitsByDate } from '../../lib/storage';
import MemberCard from '../../components/MemberCard';
import CalendarGrid from '../../components/CalendarGrid';

// ひらがな/カタカナの先頭文字から行を判定
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

const PERIOD_FILTERS: { key: string; label: string; minDays: number; maxDays: number }[] = [
  { key: 'this_week', label: '今週',    minDays: 0,  maxDays: 7 },
  { key: 'last_week', label: '先週',    minDays: 8,  maxDays: 14 },
  { key: 'two_weeks', label: '2週間前', minDays: 15, maxDays: 21 },
  { key: 'one_month', label: '1ヶ月',   minDays: 0,  maxDays: 30 },
];

const CATEGORY_FILTERS: { key: string; label: string }[] = [
  { key: 'visited', label: '訪問済み' },
  { key: 'unvisited', label: '未訪問' },
  ...Object.entries(VISIT_STATUS_CONFIG).map(([key, config]) => ({ key, label: config.label })),
];

type PillKey = 'district' | 'period' | 'category' | null;

export default function MembersPage() {
  const [members, setMembers] = useState<MemberWithVisitInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [district, setDistrict] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<string | null>(null);
  const [periodStart, setPeriodStart] = useState<string | null>(null);
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [openPill, setOpenPill] = useState<PillKey>(null);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [compact, setCompact] = useState(false);

  // カレンダービュー用 state
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  // 期間ピッカー用カレンダー月
  const [pickerYear, setPickerYear] = useState(now.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  );
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [dayVisits, setDayVisits] = useState<(Visit & { memberName: string; memberDistrict: string })[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getMembersWithVisitInfo()
      .then(setMembers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (view !== 'calendar') return;
    getAllVisits().then(setAllVisits).catch(() => setAllVisits([]));
  }, [view]);

  useEffect(() => {
    if (view !== 'calendar') return;
    getVisitsByDate(selectedDate).then(setDayVisits).catch(() => setDayVisits([]));
  }, [selectedDate, view]);

  const visitDates = useMemo(() => new Set(allVisits.map(v => v.visitedAt)), [allVisits]);

  const handlePrevMonth = useCallback(() => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1);
  }, [month]);
  const handleNextMonth = useCallback(() => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1);
  }, [month]);

  const handlePickerPrev = useCallback(() => {
    if (pickerMonth === 1) { setPickerYear(y => y - 1); setPickerMonth(12); } else setPickerMonth(m => m - 1);
  }, [pickerMonth]);
  const handlePickerNext = useCallback(() => {
    if (pickerMonth === 12) { setPickerYear(y => y + 1); setPickerMonth(1); } else setPickerMonth(m => m + 1);
  }, [pickerMonth]);

  // カレンダーで日付タップ → 範囲選択
  const handlePeriodDateSelect = useCallback((date: string) => {
    setPeriodFilter(null); // プリセットはクリア
    if (!periodStart || (periodStart && periodEnd)) {
      setPeriodStart(date);
      setPeriodEnd(null);
    } else {
      if (date < periodStart) {
        setPeriodEnd(periodStart);
        setPeriodStart(date);
      } else {
        setPeriodEnd(date);
      }
    }
  }, [periodStart, periodEnd]);

  // プリセット選択 → 範囲はクリア
  const selectPreset = useCallback((key: string | null) => {
    setPeriodFilter(key);
    setPeriodStart(null);
    setPeriodEnd(null);
  }, []);

  // スクロール検知 → コンパクトモード
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const y = e.currentTarget.scrollTop;
    setCompact(y > 20);
  }, []);

  // フィルタリング＆アイウエオ順ソート
  const filtered = useMemo(() => {
    const period = periodFilter ? PERIOD_FILTERS.find(p => p.key === periodFilter) : null;
    const result = members.filter(m => {
      if (district && m.district !== district) return false;
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
      // 範囲選択: 最終訪問日が範囲内
      if (periodStart && periodEnd) {
        if (!m.lastVisitDate) return false;
        if (m.lastVisitDate < periodStart || m.lastVisitDate > periodEnd) return false;
      } else if (periodStart && !periodEnd) {
        if (m.lastVisitDate !== periodStart) return false;
      }
      return true;
    });
    result.sort((a, b) => {
      const aKana = a.nameKana ?? a.name;
      const bKana = b.nameKana ?? b.name;
      return aKana.localeCompare(bKana, 'ja');
    });
    return result;
  }, [members, district, categoryFilter, periodFilter, periodStart, periodEnd]);

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

  // 各ピルの現在値ラベル
  const districtLabel = district ? DISTRICTS.find(d => d.key === district)?.short ?? 'すべて' : 'すべて';
  const fmtShort = (d: string) => {
    const [, m, day] = d.split('-');
    return `${Number(m)}/${Number(day)}`;
  };
  const periodLabel = periodStart && periodEnd
    ? `${fmtShort(periodStart)}–${fmtShort(periodEnd)}`
    : periodStart
      ? fmtShort(periodStart)
      : periodFilter
        ? PERIOD_FILTERS.find(p => p.key === periodFilter)?.label ?? 'すべて'
        : 'すべて';
  const periodActive = periodFilter !== null || periodStart !== null;
  const categoryLabel = categoryFilter ? CATEGORY_FILTERS.find(c => c.key === categoryFilter)?.label ?? 'すべて' : 'すべて';

  const hasAnyFilter = district !== null || periodActive || categoryFilter !== null;

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg)]">
      {/* ヘッダー */}
      <div className="ios-nav px-4 py-3">
        <h1 className="text-xl font-bold text-center">メンバー</h1>
      </div>

      {/* ビュー切替タブ */}
      <div className="px-4 pt-2">
        <div className="flex gap-1">
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-md transition-colors ${
              view === 'list' ? 'text-[var(--color-text)] font-medium border-b-2 border-[var(--color-text)]' : 'text-[var(--color-subtext)]'
            }`}
          >
            <Table size={14} />
            メンバー
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-md transition-colors ${
              view === 'calendar' ? 'text-[var(--color-text)] font-medium border-b-2 border-[var(--color-text)]' : 'text-[var(--color-subtext)]'
            }`}
          >
            <Calendar size={14} />
            カレンダー
          </button>
        </div>
      </div>

      {view === 'calendar' ? (
        <>
          <div className="px-4 pt-3">
            <div className="bg-white rounded-xl p-2">
              <CalendarGrid
                year={year}
                month={month}
                selectedDate={selectedDate}
                visitDates={visitDates}
                onSelectDate={setSelectedDate}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-4">
              {dayVisits.length === 0 ? (
                <p className="text-sm text-[var(--color-subtext)] text-center mt-6">この日の訪問ログはありません</p>
              ) : (
                <div className="space-y-2">
                  {dayVisits.map(v => {
                    const statusConfig = VISIT_STATUS_CONFIG[v.status];
                    return (
                      <Link key={v.id} href={`/visits/${v.id}`} className="block">
                        <div className="ios-card px-3 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[15px]">{v.memberName}</span>
                            {statusConfig && (
                              <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
                                {statusConfig.label}
                              </span>
                            )}
                          </div>
                          {v.summary && (
                            <p className="text-xs text-[var(--color-subtext)] mt-0.5 line-clamp-1">{v.summary}</p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[var(--color-subtext)]">読み込み中...</p>
        </div>
      ) : (
        <>
          {/* 固定エリア: 人数 + Airbnb風3分割ピル */}
          <div className="px-4 pt-3 pb-2">
            <div className={`flex items-baseline justify-between transition-all ${compact ? 'mb-2' : 'mb-3'}`}>
              <p className={`font-bold text-[var(--color-text)] transition-all ${compact ? 'text-base' : 'text-2xl'}`}>
                {filtered.length}人
              </p>
              {hasAnyFilter && (
                <button
                  onClick={() => { setDistrict(null); setPeriodFilter(null); setPeriodStart(null); setPeriodEnd(null); setCategoryFilter(null); }}
                  className="text-xs text-[var(--color-subtext)] underline"
                >
                  クリア
                </button>
              )}
            </div>

            {/* 3分割ピル */}
            <div className="relative">
              <div className={`flex items-stretch bg-white rounded-xl shadow-[0_2px_6px_rgba(0,0,0,0.08)] border border-[#E5E5EA] overflow-hidden transition-all ${compact ? 'h-9' : 'h-10'}`}>
                <button
                  onClick={() => setOpenPill(openPill === 'district' ? null : 'district')}
                  className={`flex-1 text-left px-3 transition-colors min-w-0 ${openPill === 'district' ? 'bg-[#F5F5F5]' : 'active:bg-[#F5F5F5]'}`}
                >
                  <div className="flex items-center justify-between h-full gap-1">
                    <div className="flex items-baseline gap-1.5 min-w-0">
                      <span className="text-[10px] font-bold text-[var(--color-text)] shrink-0">地区</span>
                      <span className={`text-[12px] truncate ${district ? 'text-[var(--color-text)] font-medium' : 'text-[var(--color-subtext)]'}`}>{districtLabel}</span>
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
                      <span className={`text-[12px] truncate ${periodActive ? 'text-[var(--color-text)] font-medium' : 'text-[var(--color-subtext)]'}`}>{periodLabel}</span>
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
                      <span className={`text-[12px] truncate ${categoryFilter ? 'text-[var(--color-text)] font-medium' : 'text-[var(--color-subtext)]'}`}>{categoryLabel}</span>
                    </div>
                    <ChevronDown size={12} className="text-[var(--color-subtext)] shrink-0" />
                  </div>
                </button>
              </div>

              {/* インラインドロップダウン */}
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
                    <div className="max-h-[60vh] overflow-y-auto">
                      {openPill === 'district' && (
                        <>
                          <DropdownItem label="すべて" selected={district === null} onClick={() => { setDistrict(null); setOpenPill(null); }} />
                          {DISTRICTS.map(d => (
                            <DropdownItem
                              key={d.key}
                              label={d.short}
                              count={members.filter(m => m.district === d.key).length}
                              selected={district === d.key}
                              onClick={() => { setDistrict(d.key); setOpenPill(null); }}
                            />
                          ))}
                        </>
                      )}
                      {openPill === 'period' && (
                        <div className="p-3">
                          {/* クイックプリセット */}
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            <button
                              onClick={() => selectPreset(null)}
                              className={`px-3 py-1.5 text-[12px] rounded-full border transition-colors ${
                                !periodActive ? 'bg-[#222] text-white border-[#222]' : 'bg-white text-[#222] border-[#E5E5EA] active:bg-[#F5F5F5]'
                              }`}
                            >
                              すべて
                            </button>
                            {PERIOD_FILTERS.map(p => (
                              <button
                                key={p.key}
                                onClick={() => selectPreset(p.key)}
                                className={`px-3 py-1.5 text-[12px] rounded-full border transition-colors ${
                                  periodFilter === p.key ? 'bg-[#222] text-white border-[#222]' : 'bg-white text-[#222] border-[#E5E5EA] active:bg-[#F5F5F5]'
                                }`}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                          {/* Airbnb風カレンダー */}
                          <CalendarGrid
                            year={pickerYear}
                            month={pickerMonth}
                            rangeStart={periodStart ?? undefined}
                            rangeEnd={periodEnd ?? undefined}
                            onSelectDate={handlePeriodDateSelect}
                            onPrevMonth={handlePickerPrev}
                            onNextMonth={handlePickerNext}
                            compact
                          />
                          {/* 適用/クリアボタン */}
                          <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#F0F0F0]">
                            <button
                              onClick={() => { setPeriodFilter(null); setPeriodStart(null); setPeriodEnd(null); }}
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
                      {openPill === 'category' && (
                        <>
                          <DropdownItem label="すべて" selected={categoryFilter === null} onClick={() => { setCategoryFilter(null); setOpenPill(null); }} />
                          {CATEGORY_FILTERS.map(c => (
                            <DropdownItem
                              key={c.key}
                              label={c.label}
                              selected={categoryFilter === c.key}
                              onClick={() => { setCategoryFilter(c.key); setOpenPill(null); }}
                            />
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* スクロール領域: メンバー名簿 */}
          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
            <div className="px-4 pb-4">
              {filtered.length === 0 ? (
                <p className="text-center text-[var(--color-subtext)] mt-8">メンバーが見つかりません</p>
              ) : (
                <div className="space-y-1">
                  {grouped.map(group => (
                    <div key={group.label}>
                      <div className="text-xs font-bold text-[var(--color-subtext)] bg-[var(--color-bg)] sticky top-0 py-1.5 px-1 z-10">
                        {group.label}行
                      </div>
                      <div className="space-y-2">
                        {group.members.map(m => (
                          <MemberCard key={m.id} member={m} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function DropdownItem({ label, count, selected, onClick }: { label: string; count?: number; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between active:bg-[#F5F5F5] border-b border-[#F5F5F5] last:border-b-0 ${
        selected ? 'bg-[#F8F8F8] font-bold' : ''
      }`}
    >
      <span className="flex items-center gap-2">
        {label}
        {count !== undefined && <span className="text-xs text-[var(--color-subtext)]">({count})</span>}
      </span>
      {selected && <span className="text-[var(--color-primary)] text-sm">✓</span>}
    </button>
  );
}
