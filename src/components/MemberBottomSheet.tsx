'use client';

import { useEffect, useRef, useState, type Ref, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, MapPin, Clock, Footprints, PencilLine, Star } from 'lucide-react';
import type { MemberWithVisitInfo, Visit, MemberRow } from '../lib/types';
import { VISIT_STATUS_CONFIG } from '../lib/constants';
import { formatDate, resolveAge, stripBuildingName } from '../lib/utils';
import { getVisits, updateMember } from '../lib/storage';
import SwipeableBottomSheet, { type SheetHandle } from './SwipeableBottomSheet';

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
}

// mini スナップ時の可視高さ。
// 『記録する』ボタンが下端で切れたり、タブバーに貼りつくギリギリになって
// しまうのを避ける。
//
//   handle 28
// + pt-1.5 6
// + ボタン高さ 約34 (text-[13px] + py-2 + アイコン16)
// = 68  ← ここがボタン下端
//
// ボタン下端から sheet 下端まで 50px 以上空けて「明らかに浮いてる」感を
// 出すため 120 に設定。iOS Safari 側の JS キャッシュでも視覚的に差が
// 出るよう、以前の 72 からガッツリ差をつける。
const MINI_HEIGHT = 120;

// 詳細・訪問ページへ遷移する時に「ホームに戻ってきた時どのピンに戻るか」を記録する。
// ホーム画面 (page.tsx) が sessionStorage から読み込んで selectedId に復元 → PanToSelected で中央へ。
const LAST_VIEWED_MEMBER_KEY = 'houmon_lastViewedMemberId';
function rememberMemberForReturn(memberId: string) {
  try { sessionStorage.setItem(LAST_VIEWED_MEMBER_KEY, memberId); } catch { /* ignore */ }
}

export default function MemberBottomSheet({ member, onClose, sheetHandleRef, renderAbove: renderAboveProp, onMemberUpdate }: Props) {
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
      renderAbove={
        (streetViewUrl || renderAboveProp)
          ? () => (
              <>
                {streetViewUrl ? (
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
            {/* ヘッダー: 名前/地区/住所 + 右上『記録する』ボタン */}
            <div className="px-4 pt-1.5 pb-3">
              <div className="flex items-start justify-between gap-3">
                <button
                  onClick={() => { rememberMemberForReturn(m.id); router.push(`/members/${m.id}`); }}
                  className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                >
                  <div className="min-w-0">
                    {m.nameKana && (
                      <div className="text-[9px] font-normal text-[var(--color-subtext)] tracking-wide leading-none">{m.nameKana}</div>
                    )}
                    <h2 className="text-lg font-bold truncate">
                      {m.name}
                      {(() => {
                        // 生年月日があれば毎年自動で加齢、無ければ保存済みの age をフォールバック
                        const age = resolveAge(m);
                        return age != null ? <span className="text-[13px] font-normal text-[var(--color-subtext)] ml-1">({age})</span> : null;
                      })()}
                    </h2>
                  </div>
                  <ChevronRight size={24} className="text-[var(--color-icon-gray)] shrink-0" />
                </button>
                {/* 行きたい釦 + 記録するボタン を右側に並べる */}
                <div className="flex items-center gap-2 shrink-0">
                {/* 「行きたい」ブックマーク釦
                    - 単独丸アウトライン(モック Ⓐ 案)
                    - active 時は星マークを黄色塗りつぶし
                    - タップで楽観的に切り替え→裏で DB 更新 */}
                <button
                  type="button"
                  onClick={async () => {
                    if (savingWant) return;
                    const next = !m.wantToVisit;
                    onMemberUpdate?.(m.id, { wantToVisit: next });
                    setSavingWant(true);
                    try {
                      await updateMember(m.id, { want_to_visit: next } as Partial<MemberRow>);
                    } catch {
                      // ロールバック
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
                      ? 'bg-[#FFF8E1] border-[#FBC02D] text-[#F57F17]'
                      : 'bg-white border-[#D1D5DB] text-[#6B7280]'
                  } ${savingWant ? 'opacity-70' : ''}`}
                >
                  <Star
                    size={18}
                    strokeWidth={2.2}
                    fill={m.wantToVisit ? '#FBC02D' : 'none'}
                  />
                </button>
                <button
                  onClick={() => router.push(`/visits/new?memberId=${m.id}`)}
                  className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[#111] text-white text-[13px] font-bold px-3.5 py-2 active:scale-95 transition-transform"
                  aria-label="訪問を記録する"
                >
                  <PencilLine size={16} strokeWidth={2.2} />
                  記録する
                </button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F0F0F0] text-[var(--color-subtext)]">
                  {m.district.replace(/豊岡部|光陽部|豊岡中央支部/g, '')}
                </span>
                {m.category === 'young' && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#0EA5E9] text-white leading-none">
                    ヤング
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-[var(--color-subtext)]">
                  <Clock size={14} strokeWidth={1.8} />
                  {m.lastVisitDate
                    ? `${formatDate(m.lastVisitDate, 'yyyy年M月d日')}（${m.totalVisits}回）`
                    : '----年--月--日'}
                </span>
              </div>

              {/* 住所（Googleマップ遷移リンク）
                  表示は建物名込みのフル住所、Maps へ飛ばす時は建物名を除いた住所で検索 */}
              {m.address && (
                <a
                  href={
                    m.lat != null && m.lng != null
                      ? `https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stripBuildingName(m.address))}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 mt-1.5 text-xs text-[var(--color-subtext)] active:text-[var(--color-text)] transition-colors"
                  onClick={e => e.stopPropagation()}
                >
                  <MapPin size={16} strokeWidth={1.8} className="text-[var(--color-icon-gray)] shrink-0" />
                  <span className="flex-1 truncate">{m.address}</span>
                </a>
              )}
            </div>

            {/* 訪問ログ: 訪問実績がある場合のみセクション丸ごと表示
                blank state (totalVisits === 0) のときは見出しも非表示にして余白を詰める */}
            {m.totalVisits > 0 && (
              <div className="px-4 pt-4 pb-2">
                <h3 className="text-sm font-semibold text-[var(--color-subtext)] mb-2">訪問ログ</h3>
                {loading ? (
                  <p className="text-sm text-[var(--color-subtext)]">読み込み中...</p>
                ) : (
                  <div className="space-y-2">
                    {visits.map(v => {
                      const sc = VISIT_STATUS_CONFIG[v.status];
                      return (
                        <Link
                          key={v.id}
                          href={`/visits/${v.id}`}
                          onClick={() => rememberMemberForReturn(m.id)}
                          className="block w-full text-left"
                        >
                          <div className="px-3 py-2.5 rounded-lg bg-[#F5F5F5] active:bg-[#EBEBEB] transition-colors flex items-center gap-2">
                            <span className="text-sm font-medium shrink-0">
                              {formatDate(v.visitedAt, 'yyyy年M月d日')}
                            </span>
                            {sc && (
                              <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${sc.bg} ${sc.color}`}>
                                {sc.label}
                              </span>
                            )}
                            {v.summary && (
                              <span className="text-xs text-[var(--color-subtext)] truncate">
                                {v.summary}
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                    {m.totalVisits > 5 && (
                      <button
                        onClick={() => { rememberMemberForReturn(m.id); router.push(`/members/${m.id}`); }}
                        className="text-sm text-[var(--color-primary)] font-medium flex items-center gap-1"
                      >
                        もっと見る <ChevronRight size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        );
      }}
    </SwipeableBottomSheet>
  );
}
