'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { MemberWithVisitInfo } from '../lib/types';
import { VISIT_STATUS_CONFIG } from '../lib/constants';
import DistrictFilter, { type FilterSelection, EMPTY_FILTER } from './DistrictFilter';

// ──────────────────────────────────────────────────────────────
// フィルター設定モーダル（地区 / 期間 / カテゴリ を縦並びで一括編集）
// MembersListSheet のヘッダーのフィルターアイコンから呼び出す。
//
// 設計:
//   - 単一モーダル、縦スクロール
//   - 内部で「ドラフト」state を持ち、『適用』押下で親に commit
//     → ユーザーが途中まで触って閉じても地図側フィルターに反映されない
//   - 『クリア』は全部リセット（フッター常設）
//   - 『適用』ボタンは件数付き "(N件)"
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
  /** ドラフトを commit したいとき親に反映 */
  onApply: (next: {
    filter: FilterSelection;
    periodFilter: string | null;
    categoryFilter: string | null;
  }) => void;
  members: MemberWithVisitInfo[];
  /** 件数プレビュー用の matcher. 現在のドラフトで何人残るかを計算する関数 */
  countMatches: (next: {
    filter: FilterSelection;
    periodFilter: string | null;
    categoryFilter: string | null;
  }) => number;
}

const SLIDE_DURATION_MS = 320;

export default function FilterModal({
  open,
  onClose,
  filter,
  periodFilter,
  categoryFilter,
  onApply,
  members,
  countMatches,
}: Props) {
  // ドラフト state
  const [draftFilter, setDraftFilter] = useState<FilterSelection>(filter);
  const [draftPeriod, setDraftPeriod] = useState<string | null>(periodFilter);
  const [draftCategory, setDraftCategory] = useState<string | null>(categoryFilter);

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

  // 開いた瞬間に親の現在値でドラフトを初期化
  useEffect(() => {
    if (open) {
      setDraftFilter(filter);
      setDraftPeriod(periodFilter);
      setDraftCategory(categoryFilter);
    }
  }, [open, filter, periodFilter, categoryFilter]);

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

  const count = countMatches({
    filter: draftFilter,
    periodFilter: draftPeriod,
    categoryFilter: draftCategory,
  });

  const handleClear = () => {
    setDraftFilter(EMPTY_FILTER);
    setDraftPeriod(null);
    setDraftCategory(null);
  };

  const handleApply = () => {
    onApply({
      filter: draftFilter,
      periodFilter: draftPeriod,
      categoryFilter: draftCategory,
    });
    onClose();
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
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0F0F0] shrink-0">
          <h2 className="text-base font-bold">フィルター</h2>
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
              selection={draftFilter}
              onChange={setDraftFilter}
              members={members}
              alwaysOpen
            />
          </section>

          {/* ── 期間 ── */}
          <section>
            <h3 className="text-xs font-bold text-[var(--color-subtext)] mb-2">最終訪問からの期間</h3>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setDraftPeriod(null)}
                className={`px-3 py-1.5 text-[12px] rounded-full border transition-colors ${
                  !draftPeriod
                    ? 'bg-[#222] text-white border-[#222]'
                    : 'bg-white text-[#222] border-[#E5E5EA] active:bg-[#F5F5F5]'
                }`}
              >
                すべて
              </button>
              {PERIOD_FILTERS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setDraftPeriod(p.key)}
                  className={`px-3 py-1.5 text-[12px] rounded-full border transition-colors ${
                    draftPeriod === p.key
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
                onClick={() => setDraftCategory(null)}
                className={`px-3 py-1.5 text-[12px] rounded-full border transition-colors ${
                  !draftCategory
                    ? 'bg-[#222] text-white border-[#222]'
                    : 'bg-white text-[#222] border-[#E5E5EA] active:bg-[#F5F5F5]'
                }`}
              >
                すべて
              </button>
              {CATEGORY_FILTERS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setDraftCategory(c.key)}
                  className={`px-3 py-1.5 text-[12px] rounded-full border transition-colors ${
                    draftCategory === c.key
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

        {/* フッター: クリア(左) + 適用(右) */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#F0F0F0] shrink-0">
          <button
            onClick={handleClear}
            className="text-xs text-[var(--color-subtext)] underline px-2 py-2"
          >
            クリア
          </button>
          <button
            onClick={handleApply}
            className="text-sm font-bold text-white bg-[#111] rounded-full px-5 py-2 active:scale-95 transition-transform"
          >
            適用（{count}件）
          </button>
        </div>
      </div>
    </div>
  );
}
