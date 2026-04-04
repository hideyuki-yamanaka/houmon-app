'use client';

import Link from 'next/link';
import { ChevronRight, Clock } from 'lucide-react';
import type { MemberWithVisitInfo } from '../lib/types';
import { formatDate } from '../lib/utils';

interface Props {
  member: MemberWithVisitInfo;
}

// マップと同じスタイルのピンアイコン（ベタ塗り + 白丸）
function PinIcon({ visited }: { visited: boolean }) {
  const fill = visited ? '#EA4335' : '#BBBBC0';
  return (
    <svg width="22" height="30" viewBox="0 0 28 40" fill="none" className="shrink-0">
      <path
        d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 40 14 40S28 24.5 28 14C28 6.268 21.732 0 14 0Z"
        fill={fill}
      />
      <circle cx="14" cy="13.5" r="5" fill="#FFFFFF" />
    </svg>
  );
}

export default function MemberCard({ member }: Props) {
  const hasVisits = member.totalVisits > 0;

  return (
    <Link href={`/members/${member.id}`} className="block">
      <div className="ios-card px-3 py-3.5 flex items-center gap-2">
        <PinIcon visited={hasVisits} />
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
            <span className="flex items-center gap-1 text-[11px] text-[var(--color-subtext)]">
              <Clock size={12} strokeWidth={1.8} />
              {member.lastVisitDate
                ? `${formatDate(member.lastVisitDate, 'yyyy年M月d日')}（${member.totalVisits}回）`
                : `${member.totalVisits}回`}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
