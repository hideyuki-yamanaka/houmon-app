'use client';

import Link from 'next/link';
import { ChevronRight, Clock } from 'lucide-react';
import type { MemberWithVisitInfo } from '../lib/types';
import { formatDate } from '../lib/utils';
import MemberPin from './MemberPin';

interface Props {
  member: MemberWithVisitInfo;
  onSelect?: (id: string) => void;
}

export default function MemberCard({ member, onSelect }: Props) {
  const hasVisits = member.totalVisits > 0;

  const inner = (
    <div className="ios-card px-3 py-2.5 flex items-center gap-3">
        <MemberPin member={member} visited={hasVisits} />
        <div className="flex-1 min-w-0">
          {member.nameKana && (
            <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">{member.nameKana}</span>
          )}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[15px]">{member.name}</span>
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
                ? `${formatDate(member.lastVisitDate, 'yyyy年M月d日')}（${member.totalVisits}回）`
                : '----年--月--日'}
            </span>
          </div>
        </div>
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
