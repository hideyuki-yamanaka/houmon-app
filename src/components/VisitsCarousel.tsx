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
//   - 横スクロール中は ブラウザが click を抑制するので 干渉なし
// ──────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Visit } from '../lib/types';
import { extractMemoText, formatDate } from '../lib/utils';
import StatusChip from './StatusChip';
import { VisitAuthorChip } from './VisitAuthorChip';
import { useTeamProfiles } from '../lib/useTeamProfiles';
import { tapHaptic } from '../lib/haptics';

export default function VisitsCarousel({ visits }: { visits: Visit[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const { lookup } = useTeamProfiles();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const w = el.clientWidth;
      if (w === 0) return;
      const next = Math.round(el.scrollLeft / w);
      if (next !== idx) setIdx(Math.max(0, Math.min(visits.length - 1, next)));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [idx, visits.length]);

  if (visits.length === 0) return null;

  return (
    <div className="bg-[#F2F2F4] rounded-lg">
      <div
        ref={ref}
        className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden"
        style={{
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none' as 'none',
        }}
      >
        {visits.map((v, i) => {
          const memo = extractMemoText(v);
          const author = lookup(v.createdBy);
          return (
            <Link
              key={v.id}
              href={`/visits/${v.id}`}
              onClick={() => tapHaptic()}
              className="shrink-0 w-full block active:bg-[#E8E8EB] transition-colors"
              style={{
                scrollSnapAlign: 'start',
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
                  </span>
                  {author.userId && <VisitAuthorChip author={author} />}
                  <StatusChip status={v.status} />
                </div>
                {visits.length > 1 && (
                  <span
                    className="tabular-nums text-[var(--color-subtext)] shrink-0 leading-none"
                    style={{ fontSize: '12px', letterSpacing: '-0.1em' }}
                  >
                    {i + 1} / {visits.length}
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
