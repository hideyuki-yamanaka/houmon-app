'use client';

import { useMemo, useState, useCallback, type Ref, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal, Printer, MapPinOff } from 'lucide-react';
import type { MemberWithVisitInfo, Visit } from '../lib/types';
import { hasUnknownAddress } from '../lib/utils';
import MemberCard from './MemberCard';
import DistrictFilter, { type FilterSelection, matchFilter } from './DistrictFilter';
import SwipeableBottomSheet, { type SheetHandle } from './SwipeableBottomSheet';
import FilterModal, { VISITLOG_GROUPS, type CategoryKey, type VisitLogKey } from './FilterModal';

// ── 2 タブ判定 ──
//   いける人  : 訪問対象。転居/拒否/住所不明 以外。
//   いけない人: 前回の訪問ログが moved / refused / unknown_address。
//
// 2026-08-09 ヒデさん指示で「スキップ」タブと 手動スキップ (⏭) を撤去。
// 住所不明の人は いけない人タブに寄せた (メンバーカードの「住所不明」タグと
// 一覧シートの絞り込みからも辿れる)。
// members.skipped カラムと保存済みデータはそのまま残してある — 「一旦は」との
// 指示なので、また使うことになったら判定を足すだけで戻せる。
export type VisitTab = 'go' | 'no';

export function classifyMember(m: MemberWithVisitInfo): VisitTab {
  if (m.lastVisitStatus === 'moved'
    || m.lastVisitStatus === 'refused'
    || m.lastVisitStatus === 'unknown_address') return 'no';
  return 'go';
}

// ──────────────────────────────────────────────────────────────
// ホームの地図上に常時出す「メンバー一覧シート」
//
// peek の高さを極端に低くして、マップ操作時に sheet を mini まで
// 下げられるようにした（mini = 見出し 1 行だけ）。
// フィルター UI は peek からは消し、右上のアイコンから開く FilterModal
// に集約している。
// ──────────────────────────────────────────────────────────────

interface Props {
  members: MemberWithVisitInfo[];
  /** 全メンバー (地区/カテゴリ/訪問ログ で絞る前)。
   *  トップの地区フィルターの セグメント/本部/部/地区 のカウント表示に使う。
   *  preTabMembers を使うと 地区を絞った瞬間に他本部が (0) になってしまうため、
   *  カウントだけは常に全件ベースで出す。 */
  allMembers?: MemberWithVisitInfo[];
  /** メンバー単位の訪問ログ Map(新しい順)。各メンバーカードに withLogs で渡す */
  visitsByMember?: Map<string, Visit[]>;
  /** シートを開くかどうか（ホームでは常に true） */
  open: boolean;
  /** ジェスチャーで閉じられた時 */
  onClose: () => void;
  /** カード/ピンから選択された時 */
  onSelectMember: (id: string) => void;
  /** 地区フィルター（HomePage で hold） */
  filter: FilterSelection;
  /** カテゴリ (すべて/訪問済み/未訪問) */
  categoryFilter: CategoryKey | null;
  /** 訪問ログ (会えた/不在/住所不明/転居) */
  visitLogFilter: VisitLogKey | null;
  /** フィルターまとめて変更する（マップと一覧を同時に動かすため） */
  onFiltersChange: (next: AppliedFilters) => void;
  /** 2 タブ (いける/いけない)。HomePage で hold してマップピンと同期。 */
  tab: VisitTab;
  /** タブ切替通知 */
  onTabChange: (next: VisitTab) => void;
  /** 親から imperative にスナップ位置を制御したい時の ref */
  sheetHandleRef?: Ref<SheetHandle>;
  /** シート上端の外に浮かべる要素（現在地ボタン等） */
  renderAbove?: () => ReactNode;
}

export type AppliedFilters = {
  filter: FilterSelection;
  /** カテゴリ (すべて=null / 訪問済み / 未訪問) */
  categoryFilter: CategoryKey | null;
  /** 訪問ログ (会えた / 不在 / 住所不明 / 転居) */
  visitLogFilter: VisitLogKey | null;
};

// 実際の matcher。FilterModal からプレビュー件数を求めるのにも、
// HomePage がマップピンの絞り込みに使うのにも、両方に使う共通関数。
// 2026-05-13 大改装: 期間フィルタ撤廃、カテゴリ/訪問ログを 2 セクションに分離。
export function applyAllFilters(members: MemberWithVisitInfo[], a: AppliedFilters): MemberWithVisitInfo[] {
  const visitLogGroup = a.visitLogFilter
    ? VISITLOG_GROUPS.find((g) => g.key === a.visitLogFilter)
    : null;
  return members.filter((m) => {
    if (!matchFilter(m, a.filter)) return false;
    // カテゴリ: 訪問済み / 未訪問
    if (a.categoryFilter === 'unvisited') {
      if (m.totalVisits > 0) return false;
    } else if (a.categoryFilter === 'visited') {
      if (m.totalVisits === 0) return false;
    }
    // 訪問ログ: 4 グループ。lastVisitStatus が グループの statuses に含まれるか。
    if (visitLogGroup) {
      const s = m.lastVisitStatus;
      if (!s) return false;
      if (!visitLogGroup.statuses.includes(s)) return false;
    }
    return true;
  });
}

// peek: 初期表示で「メンバーの3〜4人目ぐらいまで見える」高さ
// （ヘッダー + あ行ラベル + カード数枚 + 下部タブに被らない余白）
// 320: スマホで iOS のホームインジケータ域を考慮しても
//      フィルターアイコンやボタンが見切れないサイズ
const PEEK_HEIGHT = 320;
// mini: 見出し行＋ドラッグハンドルだけ（限界まで下げる）
const MINI_HEIGHT = 80;

export default function MembersListSheet({
  members,
  allMembers,
  visitsByMember,
  open,
  onClose,
  onSelectMember,
  filter,
  categoryFilter,
  visitLogFilter,
  onFiltersChange,
  tab,
  onTabChange,
  sheetHandleRef,
  renderAbove,
}: Props) {
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const router = useRouter();

  // 3 タブごとの件数 (フィルタ前)。タブ切替 UI のバッジに使う
  const tabCounts = useMemo(() => {
    const c = { go: 0, no: 0 };
    for (const m of members) c[classifyMember(m)]++;
    return c;
  }, [members]);

  // 注意: ここで filtered に渡す members は、すでに HomePage 側でも
  // 同じ applyAllFilters を通った filteredMembers が渡ってくるので、
  // 二重適用しても結果は同じ（idempotent）。あえて再適用してるのは、
  // FilterModal が「地区/期間/カテゴリ」を個別の draft 状態で動かしても
  // ちゃんと再計算されるようにするための保険。
  // members は HomePage で「地区/期間/カテゴリ」までは絞り込み済み (タブ判定前)。
  // ここで タブ判定を掛けて 表示用リストを作る。
  // タブ件数バッジ (tabCounts) はこの members を そのまま走査するので、
  // 「ヤング × (いける/いけない)」のような件数が正しく出る。
  const tabFiltered = useMemo(() => {
    const result = members.filter(m => classifyMember(m) === tab);
    result.sort((a, b) => {
      const aKana = a.nameKana ?? a.name;
      const bKana = b.nameKana ?? b.name;
      return aKana.localeCompare(bKana, 'ja');
    });
    return result;
  }, [members, tab]);

  // 住所不明 (地図にピンを出せない人) の絞り込み。
  // 2026-08-09 ヒデさん指示: 住所が分からんまま登録した人が一覧に埋もれるので、
  // ヘッダーのタグをタップでその人達だけに切り替えられるようにする。
  const [unknownAddressOnly, setUnknownAddressOnly] = useState(false);
  const unknownAddressCount = useMemo(
    () => tabFiltered.filter(hasUnknownAddress).length,
    [tabFiltered],
  );
  const filtered = useMemo(
    () => (unknownAddressOnly ? tabFiltered.filter(hasUnknownAddress) : tabFiltered),
    [tabFiltered, unknownAddressOnly],
  );

  // フィルターアイコンの「●」ドットは モーダル内に格納したフィルタが
  // 効いている時だけ点ける。地区/ヤング/男子部 はトップに常時出したので除外。
  //   - tab: 既定 'go' (いける人) 以外を選んでいる
  //   - categoryFilter (訪問済み/未訪問) / visitLogFilter (会えた等) が ON
  const hasAnyFilter =
    tab !== 'go' ||
    categoryFilter !== null ||
    visitLogFilter !== null;

  // FilterModal のリアルタイム onChange ハンドラ
  // 親 (HomePage) に3点まとめて通知 → マップピンも即連動
  const handleFilterChange = useCallback(
    (next: AppliedFilters) => {
      onFiltersChange(next);
    },
    [onFiltersChange],
  );

  // 旧「クリア」ボタンは PDF 出力ボタンに置き換え (2026-05-09)。
  // フィルタ全クリアは FilterModal 内のボタンから可能。

  return (
    <>
      <SwipeableBottomSheet
        open={open}
        onClose={onClose}
        peekHeight={PEEK_HEIGHT}
        miniHeight={MINI_HEIGHT}
        zIndex={30}
        closable={false}
        // full のとき safe-area-inset-top のすぐ下まで上がる
        topGap="env(safe-area-inset-top)"
        handleRef={sheetHandleRef}
        renderAbove={renderAbove ? () => <><div />{renderAbove()}</> : undefined}
      >
        {() => (
          <div className="flex flex-col h-full">
            {/* ヘッダー: メンバー + 人数 + フィルターアイコン（右端） */}
            <div className="px-4 pt-0 pb-2 border-b border-[#F0F0F0] shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-lg font-bold">メンバー</h2>
                  <span className="text-sm text-[var(--color-subtext)]">
                    {filtered.length}人
                    {tab === 'go' && (
                      <span className="ml-1 text-[var(--color-subtext)]">
                        （訪問済み{filtered.filter(m => m.totalVisits > 0).length}人）
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* PDF (印刷) ボタン: フィルタ済み全員を 1人1ページ A4 横で出力。
                      旧「クリア」リンクの動線をここに置き換え (2026-05-09 ヒデさん指示)。
                      sessionStorage 経由で対象 ID リストを /members/print に渡す。 */}
                  <button
                    onClick={() => {
                      if (filtered.length === 0) return;
                      try {
                        window.sessionStorage.setItem(
                          'print:memberIds',
                          JSON.stringify(filtered.map(m => m.id)),
                        );
                      } catch { /* sessionStorage 不可環境は黙って諦める */ }
                      router.push('/members/print');
                    }}
                    aria-label={`PDF出力 (${filtered.length}人)`}
                    disabled={filtered.length === 0}
                    className="w-11 h-11 rounded-full flex items-center justify-center active:bg-[#F0F0F0] disabled:opacity-40"
                  >
                    <Printer size={22} className="text-[var(--color-subtext)]" />
                  </button>
                  <button
                    onClick={() => setFilterModalOpen(true)}
                    aria-label="フィルター"
                    className={`relative w-11 h-11 rounded-full flex items-center justify-center active:bg-[#F0F0F0] ${
                      hasAnyFilter ? 'bg-[#F0F0F0]' : ''
                    }`}
                  >
                    <SlidersHorizontal
                      size={24}
                      className={hasAnyFilter ? 'text-[var(--color-text)]' : 'text-[var(--color-subtext)]'}
                    />
                    {hasAnyFilter && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                    )}
                  </button>
                </div>
              </div>
              {/* 地区フィルター (すべて/ヤング/男子部 + 本部→部→地区) をトップに常時表示。
                  2026-06-09 ヒデさん指示: いける/いけない は フィルターアイコン
                  (FilterModal) に格納し、代わりに地区の絞り込みを表に出す。
                  セグメントは常時表示、本部/部/地区 の詳細は▼で開閉 (alwaysOpen 無し)。
                  カウントは preTabMembers ではなく全件 (allMembers) ベースで安定表示。 */}
              {/* 住所不明タグ (2026-08-09)。該当者がいる時だけ出る トグル。 */}
              {unknownAddressCount > 0 && (
                <button
                  type="button"
                  onClick={() => setUnknownAddressOnly(v => !v)}
                  className={`mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                    unknownAddressOnly
                      ? 'bg-[#C2410C] text-white'
                      : 'bg-[#FFEAD0] text-[#C2410C]'
                  }`}
                >
                  <MapPinOff size={12} />
                  住所不明 {unknownAddressCount}人
                  {unknownAddressOnly && <span className="ml-0.5">×</span>}
                </button>
              )}
              <div className="mt-2">
                <DistrictFilter
                  selection={filter}
                  onChange={(next) => onFiltersChange({ filter: next, categoryFilter, visitLogFilter })}
                  members={allMembers ?? members}
                />
              </div>
            </div>

            {/* リスト (50音ラベル撤廃 2026-05-06: フラットな1列表示)
                pt は --tune-mc-list-pad-top で Tuner 調整可。
                ヒデさん指示 (2026-05-06): 一番上のカードと検索ヘッダーの間をもう少し空けたい。
                ヒデさん指示 (2026-05-08): さらにもう一段広げる (12 → 18px)。
                24px だと開きすぎだったので 18px に微調整。 */}
            <div
              className="flex-1 overflow-y-auto px-4 pb-4"
              style={{ paddingTop: 'var(--tune-mc-list-pad-top, 18px)' }}
            >
              {filtered.length === 0 ? (
                <p className="text-sm text-[var(--color-subtext)] text-center py-4">メンバーが見つかりません</p>
              ) : (
                <div className="flex flex-col" style={{ gap: 'var(--tune-mc-gap, 8px)' }}>
                  {filtered.map((m) => (
                    <MemberCard
                      key={m.id}
                      member={m}
                      onSelect={onSelectMember}
                      withLogs
                      visits={visitsByMember?.get(m.id) ?? []}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SwipeableBottomSheet>

      <FilterModal
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        filter={filter}
        categoryFilter={categoryFilter}
        visitLogFilter={visitLogFilter}
        onChange={handleFilterChange}
        matchCount={filtered.length}
        // 2 タブ (いける/いけない) を モーダル内に移設 (2026-06-09)
        tab={tab}
        onTabChange={onTabChange}
        tabCounts={tabCounts}
      />
    </>
  );
}
