'use client';

import { useEffect, useRef, useState, type Ref, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, MapPin, Clock, Footprints, PencilLine, Star, Move } from 'lucide-react';
import type { MemberWithVisitInfo, Visit, MemberRow } from '../lib/types';
import { formatDate, resolveAge, stripBuildingName, formatOrgLabelShort } from '../lib/utils';
import { getVisits, updateMember } from '../lib/storage';
import SwipeableBottomSheet, { type SheetHandle } from './SwipeableBottomSheet';
import VisitsCarousel from './VisitsCarousel';
import { tapHaptic } from '../lib/haptics';

interface Props {
  member: MemberWithVisitInfo | null;
  onClose: () => void;
  /** 親から imperative にスナップ位置を制御したい時の ref
   *  （マップドラッグで mini に下げる用） */
  sheetHandleRef?: Ref<SheetHandle>;
  /** シート上端の外に浮かべる要素（現在地ボタン等） */
  renderAbove?: () => ReactNode;
  /** メンバー情報がシート内で変更された時の通知(行きたいトグル等) */
  onMemberUpdate?: (memberId: string, updates: Partial<MemberWithVisitInfo>) => void;
  /** true の時は full snap で開く (カードタップ時用)。デフォルト false=peek。
   *  リスト全展開状態からカードタップ → 詳細シートも全展開で開きたいケース。 */
  openAtFull?: boolean;
  /** ピン位置編集を開始するときに親に通知。親はマップ側を編集モードにし、
   *  シートを閉じる責務を持つ。 (2026-05-07 ヒデさん指示) */
  onStartEditPin?: (memberId: string) => void;
}

// mini スナップ時の可視高さ。
//
// 内訳の想定:
//   handle 28
// + pt-1.5 6
// + 名前/釦行 ≈ 40
// + chip 行(地区/ヤング/日付) ≈ 22 + mt 4
// + 住所行 ≈ 18 + mt 6
// + pb-3 12
// = 約 136 + 余白
//
// 旧 120 だと住所行が下端で切れて見えてしまっていた(2026-04-26 ヒデさん指摘)。
// → 170 に拡大。マップ可視範囲が 50px 狭くなるトレードオフはあるが、住所が
//   完全に見える方が UX 的にはるかに良い。
const MINI_HEIGHT = 170;

// 詳細・訪問ページへ遷移する時に「ホームに戻ってきた時どのピンに戻るか」を記録する。
// ホーム画面 (page.tsx) が sessionStorage から読み込んで selectedId に復元 → PanToSelected で中央へ。
const LAST_VIEWED_MEMBER_KEY = 'houmon_lastViewedMemberId';
function rememberMemberForReturn(memberId: string) {
  try { sessionStorage.setItem(LAST_VIEWED_MEMBER_KEY, memberId); } catch { /* ignore */ }
}

export default function MemberBottomSheet({ member, onClose, sheetHandleRef, renderAbove: renderAboveProp, onMemberUpdate, openAtFull = false, onStartEditPin }: Props) {
  const router = useRouter();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  // 「行きたい」トグル: optimistic に即座に塗り替え、DB は裏で更新
  // (失敗時はサイレントに元に戻す)
  const [savingWant, setSavingWant] = useState(false);

  // 閉じるアニメーション中も前のメンバーを表示するため
  const lastMemberRef = useRef<MemberWithVisitInfo | null>(null);
  if (member) lastMemberRef.current = member;
  const displayMember = member ?? lastMemberRef.current;

  useEffect(() => {
    if (!member) return;
    setVisits([]);
    setLoading(true);
    // 開きアニメ(380ms)の最中にネットワーク fetch + setState が走ると
    // メイン thread が詰まってアニメがガタつく。アニメ完了後に取得開始。
    const t = setTimeout(() => {
      getVisits(member.id)
        .then(v => setVisits(v.slice(0, 5)))
        .catch(() => setVisits([]))
        .finally(() => setLoading(false));
    }, 420);
    return () => clearTimeout(t);
  }, [member?.id]);

  // peek 高さの内訳(2026-04-26 住所見切れバグ修正で再設計):
  //   handle 28 + pt 6 + 名前/釦行 ≈40 + mt 4 + chip 行 ≈18
  //   + (住所あり時) mt 6 + 住所 ≈18
  //   + (訪問あり時) pt 16 + 見出し 22 + ログ1件 ≈38 + pb 8
  //   + pb 12
  //
  // 住所がある場合は最低でも ~152px 必要。150 だとピッタリ住所が下端に
  // 来て iOS のセーフエリア込みで「見切れて見える」状態になっていた。
  // → 住所有無 × 訪問有無の 3 ケースで余裕を持たせて切り分け。
  const hasVisits = (displayMember?.totalVisits ?? 0) > 0;
  const hasAddress = !!displayMember?.address;
  const peekHeight = hasVisits
    ? 260                     // 訪問ログあり: ヘッダー全部 + ログ1件分
    : hasAddress
      ? 220                   // 訪問なし + 住所あり: 住所まで完全に見せる
      : 160;                  // 訪問なし + 住所なし: コンパクト

  // ストリートビュー URL（Google Maps web/アプリの Street View モード）
  // シート外の「上端貼り付き」ボタンで使うので、外側で計算しておく
  const streetViewUrl =
    displayMember?.lat != null && displayMember?.lng != null
      ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${displayMember.lat},${displayMember.lng}`
      : null;

  return (
    <SwipeableBottomSheet
      open={!!member}
      onClose={onClose}
      peekHeight={peekHeight}
      miniHeight={MINI_HEIGHT}
      handleRef={sheetHandleRef}
      zIndex={40}
      initialSnap={openAtFull ? 'full' : 'peek'}
      // full のとき safe-area-inset-top の すぐ下まで上がる (検索バー越え 目一杯)。
      // MembersListSheet と同じ topGap で 統一感を出す。 (2026-05-04 ヒデさん指示)
      topGap="env(safe-area-inset-top)"
      renderAbove={
        (streetViewUrl || renderAboveProp)
          ? () => (
              <>
                {/* 左側スロット: ストリートビュー + ピン編集 を横並び。
                    ヒデさん指示 (2026-05-07): 旧 長押しドラッグ廃止。
                    ピン編集アイコン (Move) で 編集モード入る。 */}
                {streetViewUrl && displayMember ? (
                  <div className="flex items-end gap-2">
                    <a
                      href={streetViewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="ストリートビューで見る"
                      onClick={e => e.stopPropagation()}
                      className="w-12 h-12 rounded-full bg-white shadow-[0_3px_10px_rgba(0,0,0,0.22)] flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <Footprints size={22} className="text-[#5F6368]" strokeWidth={2} />
                    </a>
                    {onStartEditPin && (
                      <button
                        type="button"
                        aria-label="ピンの位置を変更"
                        onClick={(e) => {
                          e.stopPropagation();
                          tapHaptic();
                          onStartEditPin(displayMember.id);
                        }}
                        className="w-12 h-12 rounded-full bg-white shadow-[0_3px_10px_rgba(0,0,0,0.22)] flex items-center justify-center active:scale-95 transition-transform"
                      >
                        <Move size={22} className="text-[#5F6368]" strokeWidth={2} />
                      </button>
                    )}
                  </div>
                ) : <div />}
                {renderAboveProp?.()}
              </>
            )
          : undefined
      }
    >
      {(snap) => {
        if (!displayMember) return null;
        const m = displayMember;

        return (
          <div className="flex flex-col">
            {/* 2026-05-06: ボトムシート個別表示。レイアウト構造は MemberCard 踏襲、
                ただし ボトムシート用に: 左帯なし / フォント大きめ /
                星+記録 釦は横並び (ヒデさん指示)。
                Chevron は 2026-05-06 復活: タップで詳細ページへ行けるサインを残す。 */}
            <div className="px-4 pt-1.5 pb-3">
              <div className="flex items-start justify-between gap-3">
                <button
                  onClick={() => { tapHaptic(); rememberMemberForReturn(m.id); router.push(`/members/${m.id}`); }}
                  className="flex-1 min-w-0 text-left"
                >
                  {m.nameKana && (
                    <span className="text-[9px] font-normal text-[var(--color-subtext)] tracking-wide leading-none block">
                      {m.nameKana}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h2 className="text-lg font-bold truncate">{m.name}</h2>
                    {(() => {
                      const age = resolveAge(m);
                      return age != null ? <span className="text-[13px] font-normal text-[var(--color-subtext)]">({age})</span> : null;
                    })()}
                    {m.category === 'young' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#5AC8FA] text-white leading-none whitespace-nowrap">
                        ヤング
                      </span>
                    )}
                    {/* Chevron: サイズを少し大きく & ヤングタグ右に少し余白を残す。
                        ヒデさん指示 (2026-05-06)。
                        2026-05-07 ヒデさん指示で もっと薄く: 線細め (1.5) + 色を
                        #CCCCCC (icon-gray よりさらに淡い)。 */}
                    <ChevronRight
                      size={26}
                      strokeWidth={1.5}
                      className="ml-0.5 text-[#CCCCCC] shrink-0"
                      aria-hidden
                    />
                  </div>
                </button>
                {/* 星 + 記録 ボタン を 横並び */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      if (savingWant) return;
                      tapHaptic();
                      const next = !m.wantToVisit;
                      onMemberUpdate?.(m.id, { wantToVisit: next });
                      setSavingWant(true);
                      try {
                        await updateMember(m.id, { want_to_visit: next } as Partial<MemberRow>);
                      } catch {
                        onMemberUpdate?.(m.id, { wantToVisit: !next });
                      } finally {
                        setSavingWant(false);
                      }
                    }}
                    aria-pressed={!!m.wantToVisit}
                    aria-label={m.wantToVisit ? '行きたいから外す' : '行きたいに追加'}
                    title={m.wantToVisit ? '行きたいから外す' : '行きたいに追加'}
                    className={`shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors active:scale-95 ${
                      m.wantToVisit
                        ? 'bg-[#FFF6CC] border-[#FFCC00] text-[#B25E07]'
                        : 'bg-white border-[#D1D5DB] text-[#6E6E73]'
                    } ${savingWant ? 'opacity-70' : ''}`}
                  >
                    <Star size={18} strokeWidth={2.2} fill={m.wantToVisit ? '#FFCC00' : 'none'} />
                  </button>
                  <button
                    onClick={() => { tapHaptic(); router.push(`/visits/new?memberId=${m.id}`); }}
                    className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[#111] text-white text-[13px] font-bold px-3.5 py-2 active:scale-95 transition-transform"
                    aria-label="訪問を記録する"
                  >
                    <PencilLine size={16} strokeWidth={2.2} />
                    記録する
                  </button>
                </div>
              </div>
              {/* メンバーカードの並び順に揃える (2026-05-06 ヒデさん指示):
                  上から: 名前+ヤング (上の button 内) → 組織タグ → 住所 → 訪問日時。 */}
              {/* 1) 組織タグ (グレー) */}
              <div className="mt-1">
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F0F0F0] text-[var(--color-subtext)] inline-block max-w-full truncate">
                  {formatOrgLabelShort(m)}
                </span>
              </div>
              {/* 2) 住所 + Google Maps ボタン */}
              {m.address && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="flex-1 min-w-0 text-xs text-[var(--color-subtext)] truncate flex items-center gap-1">
                    <MapPin size={12} className="shrink-0" />
                    {m.address}
                  </span>
                  <a
                    href={
                      m.lat != null && m.lng != null
                        ? `https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stripBuildingName(m.address))}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Google Maps で開く"
                    onClick={e => e.stopPropagation()}
                    className="shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-[#F3F4F6] text-[11px] font-medium text-[#111] active:scale-95"
                  >
                    <MapPin size={11} />Maps
                  </a>
                </div>
              )}
              {/* 3) 訪問日時 */}
              <div className="flex items-center gap-1 mt-1 text-xs text-[var(--color-subtext)]">
                <Clock size={14} strokeWidth={1.8} />
                {m.lastVisitDate
                  ? `${formatDate(m.lastVisitDate, 'yyyy年M月d日')}${m.lastVisitHour !== undefined ? ` ${m.lastVisitHour}時` : ''}（${m.totalVisits}回）`
                  : '----年--月--日'}
              </div>
            </div>

            {/* 訪問ログ: 訪問実績がある場合のみセクション丸ごと表示
                blank state (totalVisits === 0) のときは見出しも非表示にして余白を詰める。
                ヒデさん指示 (2026-05-03 v3): メンバー一覧の MemberCard と同じ
                VisitsCarousel で統一 (横スワイプ + 名前タグ + ステータス)。 */}
            {m.totalVisits > 0 && (
              <div
                className="px-4 pt-4 pb-2"
                onClickCapture={() => rememberMemberForReturn(m.id)}
              >
                <h3 className="text-sm font-semibold text-[var(--color-subtext)] mb-2">訪問ログ</h3>
                {loading ? (
                  <p className="text-sm text-[var(--color-subtext)]">読み込み中...</p>
                ) : (
                  <>
                    {/* noScroll で 1件目だけ表示。横スクロール領域を作ると
                        iOS Safari の縦ドラッグ判定と衝突して シートのドラッグが
                        途中で止まるバグが出るため (2026-05-04 ヒデさん指摘)。
                        他の訪問は「もっと見る」or タップで詳細遷移から確認可。 */}
                    <VisitsCarousel visits={visits} noScroll />
                    {m.totalVisits > 1 && (
                      <button
                        onClick={() => { tapHaptic(); rememberMemberForReturn(m.id); router.push(`/members/${m.id}`); }}
                        className="text-sm text-[var(--color-primary)] font-medium flex items-center gap-1 mt-2"
                      >
                        もっと見る <ChevronRight size={16} />
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

          </div>
        );
      }}
    </SwipeableBottomSheet>
  );
}
