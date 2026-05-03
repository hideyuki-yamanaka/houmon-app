'use client';

import Link from 'next/link';
import { ChevronRight, Clock } from 'lucide-react';
import type { MemberWithVisitInfo, Visit } from '../lib/types';
import { formatDate, resolveAge } from '../lib/utils';
import MemberPin from './MemberPin';
import VisitsCarousel from './VisitsCarousel';

interface Props {
  member: MemberWithVisitInfo;
  onSelect?: (id: string) => void;
  /** withLogs=true のとき、カード下にグレー背景の訪問ログ横カルーセルを表示。
   *  このメンバーの全 visits を新しい順で渡す(空配列ならログ無し)。 */
  visits?: Visit[];
  withLogs?: boolean;
}

// VisitsCarousel は components/VisitsCarousel.tsx に切り出し済み
// (MemberBottomSheet でも同じ見た目で使うため。2026-05-03 v3 ヒデさん指示)

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
      {/* 訪問ログカルーセル(B 案、本実装)。
          mx-3 で カードの左右パディングと整合、mt-1/mb-1.5 で head との縦余白 */}
      <div className="mx-3 mt-1 mb-1.5">
        <VisitsCarousel visits={visits!} />
      </div>
    </div>
  );
  return card;
}
