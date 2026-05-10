'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Visit } from '../lib/types';
import { formatDate, extractMemoText } from '../lib/utils';
import { ChevronRight } from 'lucide-react';
import Highlight from './Highlight';
import StatusChip from './StatusChip';
import { VisitAuthorChip } from './VisitAuthorChip';
import { useTeamProfiles } from '../lib/useTeamProfiles';
import { tapHaptic } from '../lib/haptics';

interface Props {
  visit: Visit;
  /** 検索ヒットから飛んで来た時にメモ内の該当文字列をハイライト */
  highlightQuery?: string;
  /** 訪問カードの下に同一カード内 として埋め込む追加セクション (例: 住所不明の対応メモ)。
   *  指定すると ios-card で外側を包み、上 = タップ遷移可な visit 部、下 = expansion を
   *  border-top で区切って表示する (1 つの カードに見える)。
   *  ヒデさん指示 (2026-05-10): 訪問ログの一覧で、住所不明セクションが独立カードに
   *  なっていると どの visit と関連しているか伝わらないので、特定の visit の下に
   *  くっつけて見せる。 */
  expansion?: ReactNode;
}

// ヒデさん指示 (2026-05-03):
//   - 1行目の「父・母」等の対応者タグは表示しない (段落ち防止、詳細で確認可)
//   - 1行目右端に作者バッジ (VisitAuthorChip) を表示
//   - カード全体タップで詳細遷移 + Haptics

export default function VisitCard({ visit, highlightQuery, expansion }: Props) {
  const { lookup } = useTeamProfiles();
  const author = lookup(visit.createdBy);
  const memo = extractMemoText(visit);

  // 訪問の上半分 (タップで詳細へ)。expansion アリの時は border-bottom で区切る。
  const visitInner = (
    <Link
      href={`/visits/${visit.id}`}
      onClick={() => tapHaptic()}
      className="block active:bg-[#F5F5F5] transition-colors"
    >
      <div className={`p-4 flex items-center gap-3 ${expansion ? 'border-b border-[#F0F0F0]' : ''}`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-bold">
              {formatDate(visit.visitedAt, 'yyyy年M月d日')}
              {visit.visitedHour !== undefined && (
                <span className="ml-1 text-[var(--color-subtext)] font-normal">{visit.visitedHour}時</span>
              )}
            </span>
            <StatusChip status={visit.status} />
            {author.userId && (
              <span className="ml-auto"><VisitAuthorChip author={author} /></span>
            )}
          </div>
          {memo && (
            <p className="text-sm text-[var(--color-subtext)] mt-1.5 line-clamp-2">
              <Highlight text={memo} query={highlightQuery} />
            </p>
          )}
        </div>
        <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0" />
      </div>
    </Link>
  );

  // expansion なしの場合: 旧来通り 1 つの ios-card だけ
  if (!expansion) {
    return <div className="ios-card">{visitInner}</div>;
  }

  // expansion あり: 外側 ios-card で包み、訪問 + expansion を 1 つのカードとして提示
  return (
    <div className="ios-card overflow-hidden">
      {visitInner}
      <div>{expansion}</div>
    </div>
  );
}
