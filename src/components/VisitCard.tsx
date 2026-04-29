'use client';

import Link from 'next/link';
import type { Visit } from '../lib/types';
import { VISIT_STATUS_CONFIG, RESPONDENT_CONFIG } from '../lib/constants';
import { formatDate } from '../lib/utils';
import type { Respondent } from '../lib/types';
import { ChevronRight } from 'lucide-react';
import Highlight from './Highlight';

interface Props {
  visit: Visit;
  /** 検索ヒットから飛んで来た時に summary 内の該当文字列をハイライト */
  highlightQuery?: string;
}

/** 対応者配列を 「父・母」 みたいに連結。型外の値('other'等)は「その他」にフォールバック */
function joinRespondentLabels(rs?: Respondent[]): string {
  if (!rs || rs.length === 0) return '';
  return rs
    .map(r => RESPONDENT_CONFIG[r as Respondent]?.label ?? 'その他')
    .join('・');
}

export default function VisitCard({ visit, highlightQuery }: Props) {
  const statusConfig = VISIT_STATUS_CONFIG[visit.status];
  const respondentLabel = joinRespondentLabels(visit.respondents);

  return (
    <Link href={`/visits/${visit.id}`} className="block">
      <div className="ios-card p-4 flex items-center gap-3 active:bg-[#F5F5F5] transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold">{formatDate(visit.visitedAt, 'yyyy年M月d日')}</span>
            <span className={`text-sm px-2.5 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
            {respondentLabel && (
              <span className="text-sm px-2.5 py-0.5 rounded-full bg-gray-100 text-[var(--color-subtext)]">
                {respondentLabel}
              </span>
            )}
          </div>
          {visit.summary && (
            <p className="text-sm text-[var(--color-subtext)] mt-1.5 line-clamp-2">
              <Highlight text={visit.summary} query={highlightQuery} />
            </p>
          )}
        </div>
        <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0" />
      </div>
    </Link>
  );
}
