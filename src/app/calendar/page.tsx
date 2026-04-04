'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import type { Visit } from '../../lib/types';
import { getVisitsByMonth, getVisitsByDate } from '../../lib/storage';
import { formatDate } from '../../lib/utils';
import { VISIT_STATUS_CONFIG } from '../../lib/constants';
import CalendarGrid from '../../components/CalendarGrid';

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  );
  const [monthVisits, setMonthVisits] = useState<Visit[]>([]);
  const [dayVisits, setDayVisits] = useState<(Visit & { memberName: string; memberDistrict: string })[]>([]);

  // 月の訪問データ取得
  useEffect(() => {
    getVisitsByMonth(year, month)
      .then(setMonthVisits)
      .catch(() => setMonthVisits([]));
  }, [year, month]);

  // 選択日の訪問データ取得
  useEffect(() => {
    getVisitsByDate(selectedDate)
      .then(setDayVisits)
      .catch(() => setDayVisits([]));
  }, [selectedDate]);

  const visitDates = useMemo(
    () => new Set(monthVisits.map(v => v.visitedAt)),
    [monthVisits]
  );

  const handlePrevMonth = useCallback(() => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }, [month]);

  const handleNextMonth = useCallback(() => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }, [month]);

  // 選択日を表示用にフォーマット
  const selectedDateDisplay = formatDate(selectedDate, 'M月d日');

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg)]">
      {/* ヘッダー */}
      <div className="ios-nav px-4 py-3">
        <h1 className="text-xl font-bold text-center">カレンダー</h1>
      </div>

      {/* カレンダーグリッド（固定） */}
      <div className="mx-4 mb-4 bg-white rounded-xl p-2">
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

      {/* 訪問ログ（スクロール） */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-2 pb-24">
          {dayVisits.length === 0 ? (
            <p className="text-sm text-[var(--color-subtext)] text-center mt-6">この日の訪問記録はありません</p>
          ) : (
            <div className="space-y-1.5">
              {dayVisits.map(v => {
                const statusConfig = VISIT_STATUS_CONFIG[v.status];
                return (
                  <Link key={v.id} href={`/visits/${v.id}`} className="block">
                    <div className="ios-card px-3 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{v.memberName}</span>
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

      {/* FAB: 訪問を追加 */}
      <Link
        href={`/visits/new?date=${selectedDate}`}
        className="fixed right-5 bottom-[calc(80px+env(safe-area-inset-bottom))] z-30 w-14 h-14 rounded-full bg-[#111] text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      >
        <Plus size={24} />
      </Link>
    </div>
  );
}
