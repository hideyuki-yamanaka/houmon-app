'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  year: number;
  month: number; // 1-12
  selectedDate?: string; // YYYY-MM-DD
  rangeStart?: string;
  rangeEnd?: string;
  visitDates?: Set<string>;
  onSelectDate?: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  compact?: boolean;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export default function CalendarGrid({
  year, month, selectedDate, rangeStart, rangeEnd, visitDates,
  onSelectDate, onPrevMonth, onNextMonth, compact = false,
}: Props) {
  const days = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const startDow = firstDay.getDay();
    const daysInMonth = new Date(year, month, 0).getDate();

    const cells: (number | null)[] = [];
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div>
      {/* 月ナビ — Airbnb風: 小さな円形ボタン + 中央タイトル */}
      <div className={`flex items-center justify-between ${compact ? 'px-1 pt-1 pb-2' : 'px-2 pt-2 pb-4'}`}>
        <button
          onClick={onPrevMonth}
          aria-label="前月"
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F5F5F5] active:bg-[#EBEBEB] text-[#222]"
        >
          <ChevronLeft size={18} />
        </button>
        <h2 className={`font-semibold text-[#222] ${compact ? 'text-sm' : 'text-base'}`}>{year}年{month}月</h2>
        <button
          onClick={onNextMonth}
          aria-label="翌月"
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F5F5F5] active:bg-[#EBEBEB] text-[#222]"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 曜日ヘッダー — Airbnb風: 全てグレー、細字 */}
      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="text-[11px] font-normal text-[#717171] py-1"
          >
            {w}
          </div>
        ))}
      </div>

      {/* 日付グリッド — Airbnb風: 円形、選択時は黒塗り */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="aspect-square" />;

          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          const hasVisit = visitDates?.has(dateStr) ?? false;

          // 範囲選択サポート
          const inRange = rangeStart && rangeEnd && dateStr >= rangeStart && dateStr <= rangeEnd;
          const isRangeStart = rangeStart === dateStr;
          const isRangeEnd = rangeEnd === dateStr;
          const isRangeEdge = isRangeStart || isRangeEnd;

          return (
            <div key={dateStr} className="aspect-square relative flex items-center justify-center">
              {/* 範囲背景（選択中の日付以外） */}
              {inRange && !isRangeEdge && (
                <div className="absolute inset-y-1 inset-x-0 bg-[#F0F0F0]" />
              )}
              {isRangeStart && rangeEnd && rangeStart !== rangeEnd && (
                <div className="absolute inset-y-1 right-0 left-1/2 bg-[#F0F0F0]" />
              )}
              {isRangeEnd && rangeStart && rangeStart !== rangeEnd && (
                <div className="absolute inset-y-1 left-0 right-1/2 bg-[#F0F0F0]" />
              )}

              <button
                onClick={() => onSelectDate?.(dateStr)}
                disabled={!onSelectDate}
                className={`relative w-full h-full flex items-center justify-center transition-colors ${
                  onSelectDate ? 'cursor-pointer' : 'cursor-default'
                }`}
              >
                <span className={`w-[88%] h-[88%] rounded-full flex flex-col items-center justify-center transition-colors ${
                  isSelected || isRangeEdge
                    ? 'bg-[#222] text-white'
                    : isToday
                      ? 'border border-[#222] text-[#222]'
                      : onSelectDate
                        ? 'hover:bg-[#F0F0F0] text-[#222]'
                        : 'text-[#222]'
                }`}>
                  <span className={`${compact ? 'text-[13px]' : 'text-sm'} font-normal leading-none`}>
                    {day}
                  </span>
                  {hasVisit && (
                    <span className={`w-1 h-1 rounded-full mt-0.5 ${
                      isSelected || isRangeEdge ? 'bg-white' : 'bg-[#FF385C]'
                    }`} />
                  )}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
