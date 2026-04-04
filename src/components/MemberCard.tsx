'use client';

import Link from 'next/link';
import { ChevronRight, MapPin } from 'lucide-react';
import type { MemberWithVisitInfo } from '../lib/types';
import { formatDate } from '../lib/utils';

interface Props {
  member: MemberWithVisitInfo;
}

export default function MemberCard({ member }: Props) {
  const hasVisits = member.totalVisits > 0;

  return (
    <Link href={`/members/${member.id}`} className="block">
      <div className="ios-card px-3 py-3.5 flex items-center gap-2">
        <MapPin
          size={18}
          strokeWidth={2}
          className={`shrink-0 ${hasVisits ? 'text-red-500' : 'text-gray-300'}`}
          fill={hasVisits ? '#EF4444' : 'none'}
        />
        <div className="flex-1 min-w-0">
          {member.nameKana && (
            <span className="text-[10px] text-[var(--color-subtext)] block leading-tight">{member.nameKana}</span>
          )}
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="font-bold text-[15px]">{member.name}</span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F0F0F0] text-[var(--color-subtext)]">
              {member.district.replace(/豊岡部|光陽部|豊岡中央支部/g, '')}
            </span>
<span className="text-[11px] text-[var(--color-subtext)]">
              {member.lastVisitDate
                ? `${formatDate(member.lastVisitDate, 'yyyy年M月d日')}（${member.totalVisits}回）`
                : `${member.totalVisits}回`}
            </span>
          </div>
        </div>
        <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0" />
      </div>
    </Link>
  );
}
