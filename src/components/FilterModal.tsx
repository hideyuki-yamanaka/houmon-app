'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { type FilterSelection } from './DistrictFilter';

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

// 2026-05-13 ヒデさん指示で「最終訪問からの期間」フィルタを廃止。
// PERIOD_FILTERS は 後方互換のため空配列としてエクスポート (旧呼び出し対策)。
export const PERIOD_FILTERS: { key: string; label: string; minDays: number; maxDays: number }[] = [];

// ── 2026-05-13 フィルタ全面リニューアル (ヒデさん指示) ──
// 旧「カテゴリ」(訪問ステータス 全6種を 1つ選ぶ) を 2 セクションに分割:
//   1. カテゴリ (大まかな見え方): すべて / 訪問済み / 未訪問
//   2. 訪問ログ (細かい行動カテゴリ): ダッシュボード内訳と統一感のある 4 グループ
//        会えた (met_self + met_family + refused)
//        不在 (absent)
//        住所不明 (unknown_address)
//        転居 (moved)
// 色も ダッシュボードの 4 ブロック (src/app/log/page.tsx) と同じ tinted bg + fg。

export type CategoryKey = 'visited' | 'unvisited';
export type VisitLogKey = 'met' | 'absent' | 'unknown_address' | 'moved';

export const CATEGORY_OPTIONS: { key: CategoryKey; label: string }[] = [
  { key: 'visited',   label: '訪問済み' },
  { key: 'unvisited', label: '未訪問' },
];

// 訪問ログ の 4 グループ。ダッシュボード log/page.tsx の blocks 定義と
// 同じ fg/bg 色、同じ statuses 配列。タップ時にこれらの statuses の
// いずれかに lastVisitStatus が当たれば該当扱い。
import type { VisitStatus } from '../lib/types';
export const VISITLOG_GROUPS: {
  key: VisitLogKey;
  label: string;
  statuses: VisitStatus[];
  fg: string;
  bg: string;
}[] = [
  { key: 'met',             label: '会えた',   statuses: ['met_self', 'met_family', 'refused'], fg: '#1D7A3F', bg: '#D6F4DE' },
  { key: 'absent',          label: '不在',     statuses: ['absent'],                            fg: '#3C3C43', bg: '#E5E5EA' },
  { key: 'unknown_address', label: '住所不明', statuses: ['unknown_address'],                   fg: '#C2410C', bg: '#FFEAD0' },
  { key: 'moved',           label: '転居',     statuses: ['moved'],                             fg: '#7B2DBF', bg: '#F3E8FF' },
];

// 旧 CATEGORY_FILTERS (string union) は コードから 0 件参照になるよう削除予定。
// 一旦 空配列で後方互換 (型保持) のためエクスポート。
export const CATEGORY_FILTERS: { key: string; label: string }[] = [];

// ── タブ別 動的絞り込み ──
// 3 タブ判定 (classifyMember) と矛盾する 訪問ログ option は、そのタブでは
// 選んでも 必ず 0 件になるので、最初から選択肢に出さない。
export type VisitTabKey = 'go' | 'no' | 'skip';
export function getVisitLogOptionsForTab(tab: VisitTabKey | undefined): typeof VISITLOG_GROUPS {
  if (!tab) return VISITLOG_GROUPS;
  if (tab === 'go') {
    // いける人: 会えた (met_self + met_family のみ) / 不在
    // 拒否 は いけない人タブに行くので 会えた は表示するが refused は当たらない
    return VISITLOG_GROUPS.filter(g => g.key === 'met' || g.key === 'absent');
  }
  if (tab === 'no') {
    // いけない人: 会えた (refused のみ当たる) / 転居
    return VISITLOG_GROUPS.filter(g => g.key === 'met' || g.key === 'moved');
  }
  // skip: 住所不明 のみ
  return VISITLOG_GROUPS.filter(g => g.key === 'unknown_address');
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** 現在の地区フィルター（親から） */
  filter: FilterSelection;
  /** 現在のカテゴリ (すべて / 訪問済み / 未訪問) */
  categoryFilter: CategoryKey | null;
  /** 現在の 訪問ログ グループ (会えた / 不在 / 住所不明 / 転居) */
  visitLogFilter: VisitLogKey | null;
  /** タップした瞬間に親へ通知する（リアルタイム反映） */
  onChange: (next: {
    filter: FilterSelection;
    categoryFilter: CategoryKey | null;
    visitLogFilter: VisitLogKey | null;
  }) => void;
  /** 現在のフィルターでマッチする件数（親で計算して渡す） */
  matchCount: number;
  /** 現在の 3 タブ (いける/いけない/スキップ)。訪問ログ選択肢を動的に絞るのに使う。
   *  渡さない (undefined) と 後方互換で全選択肢を表示。 */
  tab?: VisitTabKey;
  /** タブ切替通知。2026-06-09 で 3 タブを モーダル内に移設したため必要。 */
  onTabChange?: (next: VisitTabKey) => void;
  /** 3 タブごとの件数バッジ (フィルタ前)。モーダル内のタブ選択 UI に出す。 */
  tabCounts?: { go: number; no: number; skip: number };
}

const SLIDE_DURATION_MS = 320;

export default function FilterModal({
  open,
  onClose,
  filter,
  categoryFilter,
  visitLogFilter,
  onChange,
  matchCount,
  tab,
  onTabChange,
  tabCounts,
}: Props) {
  // タブに応じた 訪問ログ選択肢。タブ未指定なら 全グループ。
  const visitLogOptions = getVisitLogOptionsForTab(tab);

  // タブ切替で 現在の訪問ログが 無効になった場合、自動でクリアする。
  useEffect(() => {
    if (!visitLogFilter) return;
    const stillValid = visitLogOptions.some(g => g.key === visitLogFilter);
    if (!stillValid) {
      onChange({ filter, categoryFilter, visitLogFilter: null });
    }
  }, [tab, visitLogFilter, visitLogOptions, filter, categoryFilter, onChange]);
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
  const setCategoryAndNotify = (next: CategoryKey | null) => {
    onChange({ filter, categoryFilter: next, visitLogFilter });
  };
  const setVisitLogAndNotify = (next: VisitLogKey | null) => {
    onChange({ filter, categoryFilter, visitLogFilter: next });
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
          {/* ── 表示する人 (いける人 / いけない人 / スキップ) ──
              2026-06-09 ヒデさん指示で トップの 3 タブを ここに移設。
              代わりに 地区フィルター(すべて/ヤング/男子部) を トップに常時表示。 */}
          {onTabChange && (
            <section>
              <h3 className="text-xs font-bold text-[var(--color-subtext)] mb-2">表示する人</h3>
              <div className="flex gap-1 bg-[#F2F2F7] rounded-full p-1">
                {([
                  { key: 'go' as const,   label: 'いける人',  n: tabCounts?.go ?? 0 },
                  { key: 'no' as const,   label: 'いけない人', n: tabCounts?.no ?? 0 },
                  { key: 'skip' as const, label: 'スキップ',  n: tabCounts?.skip ?? 0 },
                ]).map((t) => {
                  const active = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => onTabChange(t.key)}
                      className={`flex-1 py-1.5 rounded-full flex items-center justify-center gap-1 transition-colors ${
                        active ? 'bg-white shadow-sm' : ''
                      }`}
                    >
                      <span className={`text-[12px] font-bold ${active ? 'text-[#111]' : 'text-[var(--color-subtext)]'}`}>
                        {t.label}
                      </span>
                      <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
                        active ? 'bg-[#111] text-white' : 'bg-black/10 text-[#666]'
                      }`}>{t.n}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── カテゴリ (すべて / 訪問済み / 未訪問) ── */}
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
              {CATEGORY_OPTIONS.map((c) => (
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

          {/* ── 訪問ログ (会えた / 不在 / 住所不明 / 転居) ──
              ダッシュボード 訪問ログ内訳 (src/app/log/page.tsx) と統一感のある
              tinted bg + 同色 fg。タップで active = ボーダー強調 + 太字。 */}
          <section>
            <h3 className="text-xs font-bold text-[var(--color-subtext)] mb-2">訪問ログ</h3>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setVisitLogAndNotify(null)}
                className={`px-3 py-1.5 text-[12px] rounded-full border transition-colors ${
                  !visitLogFilter
                    ? 'bg-[#222] text-white border-[#222]'
                    : 'bg-white text-[#222] border-[#E5E5EA] active:bg-[#F5F5F5]'
                }`}
              >
                すべて
              </button>
              {visitLogOptions.map((g) => {
                const active = visitLogFilter === g.key;
                return (
                  <button
                    key={g.key}
                    onClick={() => setVisitLogAndNotify(active ? null : g.key)}
                    className="px-3 py-1.5 text-[12px] rounded-full border transition-colors font-semibold"
                    style={{
                      background: g.bg,
                      color: g.fg,
                      borderColor: active ? g.fg : 'transparent',
                      borderWidth: active ? 2 : 1,
                      // active 時は ボーダー幅 2 で他より一段強調
                      paddingLeft: active ? '11px' : '12px',
                      paddingRight: active ? '11px' : '12px',
                    }}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
