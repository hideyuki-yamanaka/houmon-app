'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import type { Visit } from '../lib/types';
import { getAllVisits, getVisitsByDate } from '../lib/storage';
import { VISIT_STATUS_CONFIG } from '../lib/constants';
import CalendarGrid from './CalendarGrid';

export default function CalendarView() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  );
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [dayVisits, setDayVisits] = useState<(Visit & { memberName: string; memberDistrict: string })[]>([]);

  useEffect(() => {
    getAllVisits()
      .then(setAllVisits)
      .catch(() => setAllVisits([]));
  }, []);

  useEffect(() => {
    getVisitsByDate(selectedDate)
      .then(setDayVisits)
      .catch(() => setDayVisits([]));
  }, [selectedDate]);

  const visitDates = useMemo(
    () => new Set(allVisits.map(v => v.visitedAt)),
    [allVisits]
  );

  const handlePrevMonth = useCallback(() => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }, [month]);

  const handleNextMonth = useCallback(() => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }, [month]);

  return (
    <>
      <div className="mb-4 bg-white rounded-xl p-2">
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

      <div className="pb-4">
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
    </>
  );
}
