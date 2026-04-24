'use client';

/**
 * P1: 密リスト型の検索結果リスト。
 * search.ts の SearchHit[] を受け取って、1ヒット=1行で表示する。
 * マッチ箇所は黄色でハイライト。
 */

import { ChevronRight } from 'lucide-react';
import type { SearchHit } from '../lib/search';

interface Props {
  hits: SearchHit[];
  query: string;
  onSelect: (memberId: string) => void;
  /** 最大表示件数(デフォルト20) */
  limit?: number;
}

export default function SearchHits({ hits, query, onSelect, limit = 20 }: Props) {
  const shown = hits.slice(0, limit);

  if (shown.length === 0) {
    return (
      <div className="mt-1 bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] px-4 py-6 text-center text-[13px] text-[var(--color-subtext)]">
        該当なし
      </div>
    );
  }

  return (
    <div className="mt-1 bg-white rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.15)] overflow-hidden max-h-[60vh] overflow-y-auto">
      <ul className="divide-y divide-[#F0F0F0]">
        {shown.map((hit, i) => {
          const Icon = hit.match.fieldIcon;
          return (
            <li key={`${hit.member.id}-${hit.match.field}-${hit.match.visitedAt ?? i}`}>
              <button
                type="button"
                onClick={() => onSelect(hit.member.id)}
                className="w-full text-left flex items-center gap-3 px-4 py-3 active:bg-[#F0F0F0]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-bold text-[14px]">
                      <Highlight text={hit.member.name} query={query} />
                    </span>
                    <span className="text-[10px] text-[var(--color-subtext)] truncate">
                      {hit.member.honbu ? `${hit.member.honbu}/` : ''}{hit.member.district}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 min-w-0">
                    <Icon size={11} className="text-[var(--color-subtext)] shrink-0" />
                    <span className="text-[10px] text-[var(--color-subtext)] shrink-0">
                      {hit.match.fieldLabel}{hit.match.visitedAt ? ` ${hit.match.visitedAt.slice(5)}` : ''}:
                    </span>
                    <span className="text-[12px] text-[var(--color-text)] truncate ml-1">
                      <Highlight text={hit.match.text} query={query} />
                    </span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-[var(--color-icon-gray)] shrink-0" />
              </button>
            </li>
          );
        })}
      </ul>
      {hits.length > limit && (
        <div className="px-4 py-2 text-[11px] text-[var(--color-subtext)] text-center border-t border-[#F0F0F0]">
          +他に {hits.length - limit} 件のヒット(絞り込んでな)
        </div>
      )}
    </div>
  );
}

/**
 * テキストの中から query にマッチする部分を <mark> で包んでハイライト。
 * 大文字小文字は区別しない。
 */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${safe})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase()
          ? (
            <mark key={i} className="bg-yellow-200 text-black font-semibold rounded-sm px-0.5">
              {p}
            </mark>
          )
          : <span key={i}>{p}</span>
      )}
    </>
  );
}
