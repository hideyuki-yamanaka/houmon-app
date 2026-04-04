'use client';

import Link from 'next/link';
import type { Visit } from '../lib/types';
import { VISIT_STATUS_CONFIG, RESPONDENT_CONFIG } from '../lib/constants';
import { formatDate } from '../lib/utils';
import type { Respondent } from '../lib/types';
import { ChevronRight } from 'lucide-react';

interface Props {
  visit: Visit;
}

export default function VisitCard({ visit }: Props) {
  const statusConfig = VISIT_STATUS_CONFIG[visit.status];
  const respondentConfig = visit.respondent ? RESPONDENT_CONFIG[visit.respondent as Respondent] : null;

  return (
    <Link href={`/visits/${visit.id}`} className="block">
      <div className="ios-card p-4 flex items-center gap-3 active:bg-[#F5F5F5] transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold">{formatDate(visit.visitedAt, 'yyyy/M/d')}</span>
            <span className={`text-sm px-2.5 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
            {respondentConfig && (
              <span className="text-sm px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {respondentConfig.label}
              </span>
            )}
          </div>
          {visit.summary && (
            <p className="text-sm text-[var(--color-subtext)] mt-1.5 line-clamp-2">{visit.summary}</p>
          )}
        </div>
        <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0" />
      </div>
    </Link>
  );
}
