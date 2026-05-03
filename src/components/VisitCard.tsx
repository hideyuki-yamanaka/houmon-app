'use client';

import Link from 'next/link';
import type { Visit } from '../lib/types';
import { formatDate } from '../lib/utils';
import { ChevronRight } from 'lucide-react';
import Highlight from './Highlight';
import StatusChip from './StatusChip';
import { VisitAuthorChip } from './VisitAuthorChip';
import { useTeamProfiles } from '../lib/useTeamProfiles';
import { tapHaptic } from '../lib/haptics';

interface Props {
  visit: Visit;
  /** 検索ヒットから飛んで来た時に summary 内の該当文字列をハイライト */
  highlightQuery?: string;
}

// ヒデさん指示 (2026-05-03):
//   - 1行目の「父・母」等の対応者タグは表示しない (段落ち防止、詳細で確認可)
//   - 1行目右端に作者バッジ (VisitAuthorChip) を表示
//   - カード全体タップで詳細遷移 + Haptics

export default function VisitCard({ visit, highlightQuery }: Props) {
  const { lookup } = useTeamProfiles();
  const author = lookup(visit.createdBy);

  return (
    <Link
      href={`/visits/${visit.id}`}
      onClick={() => tapHaptic()}
      className="block"
    >
      <div className="ios-card p-4 flex items-center gap-3 active:bg-[#F5F5F5] transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold">{formatDate(visit.visitedAt, 'yyyy年M月d日')}</span>
            <StatusChip status={visit.status} />
            {author.userId && (
              <span className="ml-auto"><VisitAuthorChip author={author} /></span>
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
