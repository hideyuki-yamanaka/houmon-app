'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import type { Visit, MemberWithVisitInfo } from '../../lib/types';
import { getAllVisits, getVisitsByDate, getMembersWithVisitInfo } from '../../lib/storage';
import CalendarGrid from '../../components/CalendarGrid';
import MemberCard from '../../components/MemberCard';

// ──────────────────────────────────────────────────────────────
// v2.1 でタブ名を「メンバー」→「カレンダー」に変更。
// メンバー一覧はホームの地図下のボトムシートに移したので、
// このページはカレンダー表示のみ。旧 list view は削除済み。
// ──────────────────────────────────────────────────────────────

export default function CalendarPage() {
  // カレンダービュー用 state
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  );
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [dayVisits, setDayVisits] = useState<(Visit & { memberName: string; memberDistrict: string })[]>([]);
  // 訪問ログの表示を MemberCard に統一するため、メンバー一覧も取得しておく。
  // memberId をキーに引いて、その日のログ + 全メンバー情報を結合表示する。
  const [members, setMembers] = useState<MemberWithVisitInfo[]>([]);
  const memberById = useMemo(() => {
    const m = new Map<string, MemberWithVisitInfo>();
    for (const x of members) m.set(x.id, x);
    return m;
  }, [members]);

  useEffect(() => {
    getAllVisits().then(setAllVisits).catch(() => setAllVisits([]));
    getMembersWithVisitInfo().then(setMembers).catch(() => setMembers([]));
  }, []);

  useEffect(() => {
    getVisitsByDate(selectedDate).then(setDayVisits).catch(() => setDayVisits([]));
  }, [selectedDate]);

  const visitDates = useMemo(() => new Set(allVisits.map(v => v.visitedAt)), [allVisits]);

  const handlePrevMonth = useCallback(() => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1);
  }, [month]);
  const handleNextMonth = useCallback(() => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1);
  }, [month]);

  // 選択日表示用の見出しフォーマット (2026年4月10日(金) のような)
  const selectedDateLabel = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const wd = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
    return `${y}年${m}月${d}日(${wd})`;
  }, [selectedDate]);

  // ── 右カラム（訪問ログカード）。モバイルでは下に縦積み、md 以上では右側 ──
  const visitListSection = (
    <>
      <div className="hidden md:block mb-3">
        <h2 className="text-lg font-bold">{selectedDateLabel}</h2>
        <p className="text-xs text-[var(--color-subtext)] mt-0.5">
          {dayVisits.length > 0 ? `${dayVisits.length}件の訪問ログ` : '訪問ログなし'}
        </p>
      </div>
      {dayVisits.length === 0 ? (
        // ブランクステート
        <div className="flex flex-col items-center justify-center py-10 md:py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-[#F0F0F0] flex items-center justify-center mb-3">
            <span className="text-xl">📅</span>
          </div>
          <p className="text-sm text-[var(--color-subtext)]">この日の訪問ログはありません</p>
          <p className="text-xs text-[var(--color-subtext)] mt-1 opacity-70">訪問した日はカレンダーに印が付くで</p>
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: 'var(--tune-mc-gap, 8px)' }}>
          {/* 2026-05-06 統一: ホームのメンバー一覧と同じ MemberCard で表示。
              該当メンバー情報を members から引いて、その日の visit を 1 件だけ
              withLogs 経由で渡す (VisitsCarousel と同じステータスチップ + メモ)。
              memberById に未登録 (削除済み等) の場合はスキップ。 */}
          {dayVisits.map((v) => {
            const member = memberById.get(v.memberId);
            if (!member) return null;
            return (
              <MemberCard
                key={v.id}
                member={member}
                withLogs
                visits={[v]}
              />
            );
          })}
        </div>
      )}
    </>
  );

  return (
    // absolute inset-0 で親の padding box 全体をカバー → tab bar の裏まで伸びる
    // (親の layout.tsx 側は `pb-[calc(60px+safe)] relative`)
    <div className="absolute inset-0 flex flex-col bg-[var(--color-bg)]">
      {/* ヘッダー */}
      <div className="ios-nav px-4 py-3 shrink-0">
        <h1 className="text-xl font-bold text-center">カレンダー</h1>
      </div>

      {/* md 未満: カレンダーは固定で訪問ログ部分だけスクロール
          md 以上: 左カレンダー + 右訪問ログカードの2カラム */}
      {/* モバイル: カレンダー固定領域 (コンパクト化で訪問ログの一覧性 UP) */}
      <div className="px-3 pt-2 shrink-0 md:hidden">
        <div className="bg-white rounded-xl p-1">
          <CalendarGrid
            year={year}
            month={month}
            selectedDate={selectedDate}
            visitDates={visitDates}
            onSelectDate={setSelectedDate}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            compact
          />
        </div>
      </div>

      {/* モバイル: 訪問ログだけスクロール */}
      <div
        className="flex-1 overflow-y-auto md:hidden"
        style={{ paddingBottom: 'calc(60px + env(safe-area-inset-bottom) + 16px)' }}
      >
        <div className="px-4 pt-4">
          {visitListSection}
        </div>
      </div>

      {/* md 以上: 既存の2カラムレイアウト（カレンダーは sticky） */}
      <div className="hidden md:block flex-1 overflow-y-auto">
        <div
          className="md:grid md:grid-cols-[minmax(460px,560px)_1fr] md:gap-12 md:px-8 md:pt-6 md:max-w-6xl md:mx-auto md:w-full"
          style={{ paddingBottom: 'calc(60px + env(safe-area-inset-bottom) + 16px)' }}
        >
          <div className="md:px-0 md:pt-0">
            <div className="bg-white rounded-xl md:p-4 md:sticky md:top-4">
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
          <div className="md:px-0 md:pt-0">
            {visitListSection}
          </div>
        </div>
      </div>
    </div>
  );
}
