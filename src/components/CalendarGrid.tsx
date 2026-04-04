'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  year: number;
  month: number; // 1-12
  selectedDate: string; // YYYY-MM-DD
  visitDates: Set<string>; // 訪問がある日付のセット
  onSelectDate: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export default function CalendarGrid({
  year, month, selectedDate, visitDates,
  onSelectDate, onPrevMonth, onNextMonth,
}: Props) {
  const days = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const startDow = firstDay.getDay(); // 0=Sun
    const daysInMonth = new Date(year, month, 0).getDate();

    const cells: (number | null)[] = [];
    // 前月の空セル
    for (let i = 0; i < startDow; i++) cells.push(null);
    // 当月の日
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    // 後続の空セル（6行に揃える）
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div>
      {/* 月ナビ */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onPrevMonth} className="p-2 -ml-2 text-[var(--color-primary)]">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-lg font-bold">{year}年{month}月</h2>
        <button onClick={onNextMonth} className="p-2 -mr-2 text-[var(--color-primary)]">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 text-center px-4">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`text-xs font-medium py-1 ${
              i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-[var(--color-subtext)]'
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7 text-center px-4 pb-4">
        {days.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="py-4" />;

          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          const hasVisit = visitDates.has(dateStr);
          const dow = i % 7;

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`py-4 relative flex flex-col items-center gap-1 rounded-lg transition-colors ${
                isSelected
                  ? 'bg-[var(--color-primary)] text-white'
                  : isToday
                    ? 'bg-blue-50'
                    : ''
              }`}
            >
              <span className={`text-base font-medium ${
                isSelected
                  ? 'text-white'
                  : dow === 0
                    ? 'text-red-400'
                    : dow === 6
                      ? 'text-blue-400'
                      : ''
              }`}>
                {day}
              </span>
              {hasVisit && (
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[var(--color-primary)]'}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
