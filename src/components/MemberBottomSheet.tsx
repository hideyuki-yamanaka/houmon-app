'use client';

import { useEffect, useRef, useState, type Ref } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, MapPin, Clock, Footprints, PencilLine } from 'lucide-react';
import type { MemberWithVisitInfo, Visit } from '../lib/types';
import { formatDate } from '../lib/utils';
import { getVisits } from '../lib/storage';
import SwipeableBottomSheet, { type SheetHandle } from './SwipeableBottomSheet';

interface Props {
  member: MemberWithVisitInfo | null;
  onClose: () => void;
  /** 親から imperative にスナップ位置を制御したい時の ref
   *  （マップドラッグで mini に下げる用） */
  sheetHandleRef?: Ref<SheetHandle>;
}

// mini スナップ時の可視高さ（ドラッグハンドル＋名前1行がギリ見える）
const MINI_HEIGHT = 72;

export default function MemberBottomSheet({ member, onClose, sheetHandleRef }: Props) {
  const router = useRouter();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);

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

  // 訪問ログあり → 260px（訪問ログ見出し＋リスト分の余白あり）
  // 訪問ログなし → 150px（訪問ログセクション丸ごと非表示でコンパクト）
  // ※記録するボタンをヘッダー右上に移したので底の余白が不要 → 更に詰めた
  const hasVisits = (displayMember?.totalVisits ?? 0) > 0;
  const peekHeight = hasVisits ? 240 : 150;

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
        streetViewUrl
          ? () => (
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
                  onClick={() => router.push(`/members/${m.id}`)}
                  className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                >
                  <div className="min-w-0">
                    {m.nameKana && (
                      <div className="text-[9px] font-normal text-[var(--color-subtext)] tracking-wide leading-none">{m.nameKana}</div>
                    )}
                    <h2 className="text-lg font-bold truncate">
                      {m.name}
                      {(() => {
                        if (!m.birthday) return null;
                        const parts = m.birthday.replace(/\//g, '-').split('-').map(Number);
                        if (parts.length !== 3 || parts.some(isNaN)) return null;
                        const [y, mo, d] = parts;
                        const today = new Date();
                        let age = today.getFullYear() - y;
                        if (today.getMonth() + 1 - mo < 0 || (today.getMonth() + 1 === mo && today.getDate() < d)) age--;
                        return age >= 0 ? <span className="text-[13px] font-normal text-[var(--color-subtext)] ml-1">({age})</span> : null;
                      })()}
                    </h2>
                  </div>
                  <ChevronRight size={24} className="text-[var(--color-icon-gray)] shrink-0" />
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

              {/* 住所（Googleマップ遷移リンク） */}
              {m.address && (
                <a
                  href={
                    m.lat != null && m.lng != null
                      ? `https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.address.replace(/\s.*$/, ''))}`
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
                    {visits.map(v => (
                      <button
                        key={v.id}
                        onClick={() => router.push(`/visits/${v.id}`)}
                        className="block w-full text-left"
                      >
                        <div className="px-3 py-2.5 rounded-lg bg-[#F5F5F5] active:bg-[#EBEBEB] transition-colors flex items-center gap-2">
                          <span className="text-sm font-medium shrink-0">
                            {formatDate(v.visitedAt, 'yyyy年M月d日')}
                          </span>
                          {v.summary && (
                            <span className="text-xs text-[var(--color-subtext)] truncate">
                              {v.summary}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                    {m.totalVisits > 5 && (
                      <button
                        onClick={() => router.push(`/members/${m.id}`)}
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
