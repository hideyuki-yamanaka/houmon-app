'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { MemberWithVisitInfo } from '../lib/types';
import { VISIT_STATUS_CONFIG } from '../lib/constants';
import DistrictFilter, { type FilterSelection } from './DistrictFilter';

// ──────────────────────────────────────────────────────────────
// フィルター設定モーダル（地区 / 期間 / カテゴリ を縦並びで一括編集）
// MembersListSheet のヘッダーのフィルターアイコンから呼び出す。
//
// 設計:
//   - 単一モーダル、縦スクロール
//   - 『リアルタイム反映モード』: タップした瞬間に親に通知 → 下のマップUIが即更新
//   - 適用/クリアのフッターは撤廃。件数はヘッダーに常時表示
//   - 閉じるのは ×ボタン or 背景タップ or ESC のみ
// ──────────────────────────────────────────────────────────────

export const PERIOD_FILTERS: { key: string; label: string; minDays: number; maxDays: number }[] = [
  { key: 'this_week', label: '今週', minDays: 0, maxDays: 7 },
  { key: 'last_week', label: '先週', minDays: 8, maxDays: 14 },
  { key: 'two_weeks', label: '2週間前', minDays: 15, maxDays: 21 },
  { key: 'one_month', label: '1ヶ月', minDays: 0, maxDays: 30 },
];

export const CATEGORY_FILTERS: { key: string; label: string }[] = [
  { key: 'visited', label: '訪問済み' },
  { key: 'unvisited', label: '未訪問' },
  ...Object.entries(VISIT_STATUS_CONFIG).map(([key, config]) => ({ key, label: config.label })),
];

interface Props {
  open: boolean;
  onClose: () => void;
  /** 現在の地区フィルター（親から） */
  filter: FilterSelection;
  /** 現在の期間フィルターキー */
  periodFilter: string | null;
  /** 現在のカテゴリフィルターキー */
  categoryFilter: string | null;
  /** タップした瞬間に親へ通知する（リアルタイム反映） */
  onChange: (next: {
    filter: FilterSelection;
    periodFilter: string | null;
    categoryFilter: string | null;
  }) => void;
  members: MemberWithVisitInfo[];
  /** 現在のフィルターでマッチする件数（親で計算して渡す） */
  matchCount: number;
}

const SLIDE_DURATION_MS = 320;

export default function FilterModal({
  open,
  onClose,
  filter,
  periodFilter,
  categoryFilter,
  onChange,
  members,
  matchCount,
}: Props) {
  // mounted: DOM に存在するか（閉じアニメ中も true）
  // closing: 閉じアニメ再生中（下にスライドアウト）
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const sheetElRef = useRef<HTMLDivElement>(null);

  // open が true に変わったらマウント、false に変わったら閉じアニメ再生後にアンマウント
  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
    } else if (mounted) {
      setClosing(true);
      const t = window.setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, SLIDE_DURATION_MS);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ESC で閉じる
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // 背景スクロール抑制
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  if (!mounted) return null;

  // タップ即 onChange（リアルタイム反映）
  const setFilterAndNotify = (next: FilterSelection) => {
    onChange({ filter: next, periodFilter, categoryFilter });
  };
  const setPeriodAndNotify = (next: string | null) => {
    onChange({ filter, periodFilter: next, categoryFilter });
  };
  const setCategoryAndNotify = (next: string | null) => {
    onChange({ filter, periodFilter, categoryFilter: next });
  };

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 animate-modal-backdrop-fade ${
        closing ? 'opacity-0 transition-opacity duration-300' : ''
      }`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="フィルター"
    >
      <div
        ref={sheetElRef}
        className={`bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl flex flex-col max-h-[85vh] overflow-hidden ${
          closing ? '' : 'animate-modal-slide-up'
        }`}
        onClick={(e) => e.stopPropagation()}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          // closing 中は下にスライドアウト
          transform: closing ? 'translateY(100%)' : undefined,
          transition: closing
            ? `transform ${SLIDE_DURATION_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`
            : undefined,
        }}
      >
        {/* ヘッダー: 見出しの横にリアルタイム件数を出す */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0F0F0] shrink-0">
          <div className="flex items-baseline gap-2">
            <h2 className="text-base font-bold">フィルター</h2>
            <span className="text-xs text-[var(--color-subtext)]">{matchCount}件</span>
          </div>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="w-8 h-8 rounded-full flex items-center justify-center active:bg-[#F0F0F0]"
          >
            <X size={18} className="text-[var(--color-subtext)]" />
          </button>
        </div>

        {/* 本体（スクロール） */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* ── 地区 ── */}
          <section>
            <h3 className="text-xs font-bold text-[var(--color-subtext)] mb-2">地区</h3>
            <DistrictFilter
              selection={filter}
              onChange={setFilterAndNotify}
              members={members}
              alwaysOpen
            />
          </section>

          {/* ── 期間 ── */}
          <section>
            <h3 className="text-xs font-bold text-[var(--color-subtext)] mb-2">最終訪問からの期間</h3>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setPeriodAndNotify(null)}
                className={`px-3 py-1.5 text-[12px] rounded-full border transition-colors ${
                  !periodFilter
                    ? 'bg-[#222] text-white border-[#222]'
                    : 'bg-white text-[#222] border-[#E5E5EA] active:bg-[#F5F5F5]'
                }`}
              >
                すべて
              </button>
              {PERIOD_FILTERS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriodAndNotify(periodFilter === p.key ? null : p.key)}
                  className={`px-3 py-1.5 text-[12px] rounded-full border transition-colors ${
                    periodFilter === p.key
                      ? 'bg-[#222] text-white border-[#222]'
                      : 'bg-white text-[#222] border-[#E5E5EA] active:bg-[#F5F5F5]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </section>

          {/* ── カテゴリ（訪問ステータス） ── */}
          <section>
            <h3 className="text-xs font-bold text-[var(--color-subtext)] mb-2">カテゴリ</h3>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCategoryAndNotify(null)}
                className={`px-3 py-1.5 text-[12px] rounded-full border transition-colors ${
                  !categoryFilter
                    ? 'bg-[#222] text-white border-[#222]'
                    : 'bg-white text-[#222] border-[#E5E5EA] active:bg-[#F5F5F5]'
                }`}
              >
                すべて
              </button>
              {CATEGORY_FILTERS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setCategoryAndNotify(categoryFilter === c.key ? null : c.key)}
                  className={`px-3 py-1.5 text-[12px] rounded-full border transition-colors ${
                    categoryFilter === c.key
                      ? 'bg-[#222] text-white border-[#222]'
                      : 'bg-white text-[#222] border-[#E5E5EA] active:bg-[#F5F5F5]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
