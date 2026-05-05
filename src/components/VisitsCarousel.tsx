'use client';

// ──────────────────────────────────────────────────────────────
// VisitsCarousel — 訪問ログ 横カルーセル
//
// 元は MemberCard 内部の関数だったが、MemberBottomSheet (ピンタップ時) でも
// 同じ見た目で使いたいため (ヒデさん指示 2026-05-03 v3) コンポーネントとして
// 切り出した。
//
// 仕様:
//   - 1 段目: 日付 → 名前タグ → ステータスタグ + 右端に N/M
//   - 2 段目: メモ 2 行省略
//   - スライドタップで /visits/[id] に遷移 + Haptics
//
// noScroll prop:
//   親が SwipeableBottomSheet 等の縦ドラッグ可能コンテナの場合、
//   横スクロール領域があると iOS Safari が縦ドラッグを「横スクロール」と
//   誤判定して 親のシートドラッグが効かなくなる。
//   そういう場面では noScroll=true で 1件目だけ表示する (横スクロール無効)。
// ──────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Visit } from '../lib/types';
import { extractMemoText, formatDate } from '../lib/utils';
import StatusChip from './StatusChip';
import { VisitAuthorChip } from './VisitAuthorChip';
import { useTeamProfiles } from '../lib/useTeamProfiles';
import { tapHaptic } from '../lib/haptics';

interface Props {
  visits: Visit[];
  /** true の時は 1件目だけ表示 + 横スクロール無効。
   *  ボトムシート等の 縦ドラッグコンテナ内で使う時に指定する。 */
  noScroll?: boolean;
}

export default function VisitsCarousel({ visits, noScroll = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const { lookup } = useTeamProfiles();

  // noScroll の時は 1件目だけ表示。横スクロール領域も無効。
  const visibleVisits = noScroll ? visits.slice(0, 1) : visits;
  const totalCount = visits.length;

  useEffect(() => {
    if (noScroll) return;
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const w = el.clientWidth;
      if (w === 0) return;
      const next = Math.round(el.scrollLeft / w);
      if (next !== idx) setIdx(Math.max(0, Math.min(totalCount - 1, next)));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [idx, totalCount, noScroll]);

  if (visibleVisits.length === 0) return null;

  return (
    <div className="bg-[#F2F2F4] rounded-lg">
      <div
        ref={ref}
        className={noScroll ? 'flex' : 'flex overflow-x-auto [&::-webkit-scrollbar]:hidden'}
        style={
          noScroll
            ? undefined
            : {
                scrollSnapType: 'x mandatory',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none' as 'none',
              }
        }
      >
        {visibleVisits.map((v, i) => {
          const memo = extractMemoText(v);
          const author = lookup(v.createdBy);
          return (
            <Link
              key={v.id}
              href={`/visits/${v.id}`}
              onClick={() => tapHaptic()}
              className="shrink-0 w-full block active:bg-[#E8E8EB] transition-colors"
              style={{
                ...(noScroll ? {} : { scrollSnapAlign: 'start' }),
                paddingTop: 12,
                paddingBottom: 12,
                paddingLeft: 16,
                paddingRight: 16,
              }}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[12px] font-bold tabular-nums shrink-0">
                    {formatDate(v.visitedAt, 'yyyy年M月d日')}
                    {v.visitedHour !== undefined && (
                      <span className="ml-1 text-[var(--color-subtext)] font-normal">{v.visitedHour}時</span>
                    )}
                  </span>
                  {author.userId && <VisitAuthorChip author={author} />}
                  <StatusChip status={v.status} />
                </div>
                {/* noScroll 時は 1/N の代わりに「他 +N 件」のヒントを薄く出す */}
                {noScroll
                  ? totalCount > 1 && (
                      <span className="text-[10px] text-[var(--color-subtext)] shrink-0 leading-none">
                        他 +{totalCount - 1} 件
                      </span>
                    )
                  : totalCount > 1 && (
                      <span
                        className="tabular-nums text-[var(--color-subtext)] shrink-0 leading-none"
                        style={{ fontSize: '12px', letterSpacing: '-0.1em' }}
                      >
                        {i + 1} / {totalCount}
                      </span>
                    )}
              </div>
              {memo && (
                <p className="text-[11px] text-[#374151] leading-snug line-clamp-2 whitespace-pre-line">
                  {memo}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
