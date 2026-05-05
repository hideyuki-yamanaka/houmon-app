'use client';

import Link from 'next/link';
import { ChevronRight, Clock, MapPin } from 'lucide-react';
import type { MemberWithVisitInfo, Visit } from '../lib/types';
import { formatDate, resolveAge, formatOrgLabelShort } from '../lib/utils';
import { getMemberOrgColor } from '../lib/constants';
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
//
// 2026-05-05: ピンを廃止して左 3px の組織色帯にリニューアル (ヒデさん指示・案 1)。
//   サイズ・パディング・帯太さ・chevron 表示は DesignTuner の CSS 変数で
//   実機で微調整できるようにしてある (--tune-mc-* 系)。

export default function MemberCard({ member, onSelect, visits, withLogs }: Props) {
  const hasVisits = member.totalVisits > 0;
  // 生年月日があれば毎年自動で加齢、無ければ保存済み age をフォールバック
  const age = resolveAge(member);
  const showLogs = !!withLogs && Array.isArray(visits) && visits.length > 0;
  const orgColor = getMemberOrgColor(member);

  const head = (
    <div
      className="flex items-start"
      style={{
        padding: 'var(--tune-mc-pad-y, 0.625rem) var(--tune-mc-pad-x, 0.75rem)',
      }}
    >
      <div className="flex-1 min-w-0">
        {member.nameKana && (
          <span
            className="text-[var(--color-subtext)] block leading-tight"
            style={{ fontSize: 'var(--tune-mc-kana, 0.625rem)' }}
          >
            {member.nameKana}
          </span>
        )}
        <div className="flex items-center gap-1.5">
          <span className="font-bold" style={{ fontSize: 'var(--tune-mc-name, 0.9375rem)' }}>
            {member.name}
          </span>
          {age != null && (
            <span className="text-[11px] font-normal text-[var(--color-subtext)]">({age})</span>
          )}
          {member.category === 'young' && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#0EA5E9] text-white leading-none whitespace-nowrap">
              ヤング
            </span>
          )}
          <ChevronRight
            size={20}
            className="text-[var(--color-icon-gray)] shrink-0 ml-auto"
            style={{ display: 'var(--tune-mc-chevron, inline-block)' }}
          />
        </div>
        <div className="mt-0.5">
          <span
            className="font-medium px-1.5 py-0.5 rounded bg-[#F0F0F0] text-[var(--color-subtext)] inline-block max-w-full truncate"
            style={{ fontSize: 'var(--tune-mc-meta, 0.6875rem)' }}
          >
            {formatOrgLabelShort(member)}
          </span>
        </div>
        {member.address && (
          <div
            className="mt-0.5 flex items-center gap-1 text-[var(--color-subtext)] truncate"
            style={{ fontSize: 'var(--tune-mc-meta, 0.6875rem)' }}
          >
            <MapPin size={12} strokeWidth={1.8} className="shrink-0" />
            <span className="truncate">{member.address}</span>
          </div>
        )}
        <div
          className="mt-0.5 flex items-center gap-1 text-[var(--color-subtext)]"
          style={{ fontSize: 'var(--tune-mc-meta, 0.6875rem)' }}
        >
          <Clock size={12} strokeWidth={1.8} />
          {member.lastVisitDate
            ? `${formatDate(member.lastVisitDate, 'yyyy年M月d日')}${member.lastVisitHour !== undefined ? ` ${member.lastVisitHour}時` : ''}(${member.totalVisits}回)`
            : '----年--月--日'}
        </div>
      </div>
    </div>
  );

  // 左の組織色帯 (案 1)。訪問済みは塗り、未訪問はうっすら塗り。
  // 太さは --tune-mc-stripe で動的に変える (0px で帯を消すこともできる)。
  const stripe = (
    <span
      className="shrink-0 self-stretch"
      style={{
        width: 'var(--tune-mc-stripe, 3px)',
        background: hasVisits ? orgColor : `${orgColor}55`,
      }}
    />
  );

  // ログ無し or withLogs=false → 帯付き 1 段カード
  if (!showLogs) {
    const inner = (
      <div className="ios-card overflow-hidden flex" style={{ boxShadow: 'var(--tune-mc-shadow, 0 4px 12px rgba(0,0,0,0.12))' }}>
        {stripe}
        <div className="flex-1 min-w-0">{head}</div>
      </div>
    );
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

  // ログあり → 帯 + (ヘッダー + グレーカルーセル) の 2 段カード
  const card = (
    <div className="ios-card overflow-hidden flex" style={{ boxShadow: 'var(--tune-mc-shadow, 0 4px 12px rgba(0,0,0,0.12))' }}>
      {stripe}
      <div className="flex-1 min-w-0">
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
    </div>
  );
  return card;
}
