'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Clock } from 'lucide-react';
import type { MemberWithVisitInfo, Visit } from '../lib/types';
import { extractMemoText, formatDate, resolveAge } from '../lib/utils';
import MemberPin from './MemberPin';
import StatusChip from './StatusChip';

interface Props {
  member: MemberWithVisitInfo;
  onSelect?: (id: string) => void;
  /** withLogs=true のとき、カード下にグレー背景の訪問ログ横カルーセルを表示。
   *  このメンバーの全 visits を新しい順で渡す(空配列ならログ無し)。 */
  visits?: Visit[];
  withLogs?: boolean;
}

// ── 訪問ログ横カルーセル(B 案: スクロールバー無し + 1/N 右端) ──
function VisitsCarousel({ visits }: { visits: Visit[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
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

  return (
    <div className="bg-[#F2F2F4] rounded-lg mx-3 mt-1 mb-1.5">
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
          return (
            <div
              key={v.id}
              className="shrink-0 w-full"
              style={{
                scrollSnapAlign: 'start',
                paddingTop: 12,
                paddingBottom: 12,
                paddingLeft: 16,
                paddingRight: 16,
              }}
            >
              {/* 上段: 日付 + チップ ─ 数字 (1/N) 両端揃え */}
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[12px] font-bold tabular-nums shrink-0">
                    {formatDate(v.visitedAt, 'yyyy年M月d日')}
                  </span>
                  <StatusChip status={v.status} size="sm" />
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
              {/* 下段: メモ 2 行省略 */}
              {memo && (
                <p className="text-[11px] text-[#374151] leading-snug line-clamp-2 whitespace-pre-line">
                  {memo}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MemberCard({ member, onSelect, visits, withLogs }: Props) {
  const hasVisits = member.totalVisits > 0;
  // 生年月日があれば毎年自動で加齢、無ければ保存済み age をフォールバック
  const age = resolveAge(member);
  const showLogs = !!withLogs && Array.isArray(visits) && visits.length > 0;

  const head = (
    <div className="px-3 py-2.5 flex items-center gap-3">
      <MemberPin member={member} visited={hasVisits} />
      <div className="flex-1 min-w-0">
        {member.nameKana && (
          <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">{member.nameKana}</span>
        )}
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[15px]">{member.name}</span>
          {age != null && (
            <span className="text-[11px] font-normal text-[var(--color-subtext)]">({age})</span>
          )}
          <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0" />
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F0F0F0] text-[var(--color-subtext)]">
            {member.district.replace(/豊岡部|光陽部|豊岡中央支部/g, '')}
          </span>
          {member.category === 'young' && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#0EA5E9] text-white leading-none">
              ヤング
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px] text-[var(--color-subtext)]">
            <Clock size={12} strokeWidth={1.8} />
            {member.lastVisitDate
              ? `${formatDate(member.lastVisitDate, 'yyyy年M月d日')}(${member.totalVisits}回)`
              : '----年--月--日'}
          </span>
        </div>
      </div>
    </div>
  );

  // ログ無し or withLogs=false → 従来の ios-card レイアウト(完全に互換維持)
  if (!showLogs) {
    const inner = <div className="ios-card">{head}</div>;
    if (onSelect) {
      return (
        <button type="button" onClick={() => onSelect(member.id)} className="block w-full text-left">
          {inner}
        </button>
      );
    }
    return (
      <Link href={`/members/${member.id}`} className="block">
        {inner}
      </Link>
    );
  }

  // ログあり → ヘッダー + グレーカルーセル の 2 段カード
  // ⚠ カルーセル内部は touch をシート側に伝えないよう、stopPropagation を使ってもいいが
  //   現状は shape-only で問題ない。スワイプ干渉が出たら検討。
  const card = (
    <div className="ios-card overflow-hidden">
      {/* メンバーヘッダー部だけクリック可能領域に */}
      {onSelect ? (
        <button
          type="button"
          onClick={() => onSelect(member.id)}
          className="block w-full text-left"
        >
          {head}
        </button>
      ) : (
        <Link href={`/members/${member.id}`} className="block">
          {head}
        </Link>
      )}
      {/* 訪問ログカルーセル(B 案、本実装) */}
      <VisitsCarousel visits={visits!} />
    </div>
  );
  return card;
}
