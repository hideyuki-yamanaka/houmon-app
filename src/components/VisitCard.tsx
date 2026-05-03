'use client';

import Link from 'next/link';
import type { Visit } from '../lib/types';
import { formatDate } from '../lib/utils';
import { ChevronRight } from 'lucide-react';
import Highlight from './Highlight';
import StatusChip from './StatusChip';

interface Props {
  visit: Visit;
  /** 検索ヒットから飛んで来た時に summary 内の該当文字列をハイライト */
  highlightQuery?: string;
}

// ヒデさん指示 (2026-05-03): 1行目の「父・母」等の対応者タグは表示しない。
// 段落ちでデザインが破綻するため、対応者は詳細画面でのみ確認する形に統一。

export default function VisitCard({ visit, highlightQuery }: Props) {
  return (
    <Link href={`/visits/${visit.id}`} className="block">
      <div className="ios-card p-4 flex items-center gap-3 active:bg-[#F5F5F5] transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold">{formatDate(visit.visitedAt, 'yyyy年M月d日')}</span>
            <StatusChip status={visit.status} />
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
