'use client';

/**
 * P1: 密リスト型の検索結果リスト。
 * search.ts の SearchHit[] を受け取って、1ヒット=1行で表示する。
 * マッチ箇所は黄色でハイライト。
 *
 * クリックするとメンバー詳細ページへ Next Link で遷移。
 *   /members/[id]?hl=<section>&q=<query>&vid=<visitId?>
 * という URL スキームで、詳細ページ側がその値を読んで該当セクションに
 * スクロール + 一瞬フラッシュさせる。
 */

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { SearchHit } from '../lib/search';
import Highlight from './Highlight';

interface Props {
  hits: SearchHit[];
  query: string;
  /** 結果をタップした瞬間に呼ぶ。ホーム画面で検索バーを閉じる等に使用。 */
  onNavigate?: () => void;
  /** 最大表示件数(デフォルト20) */
  limit?: number;
}

/**
 * ヒットのフィールド種別から、詳細ページ側のどのセクションを
 * 強調すべきかを決める。
 *   - 訪問ログ系 → visit (+ vid)
 *   - 情報(info) → info
 *   - それ以外(name/address/workplace/family/notes 等) → basic
 */
function buildHref(hit: SearchHit, query: string): string {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  const field = hit.match.field;
  if (field === 'info') {
    params.set('hl', 'info');
  } else if (field === 'visit') {
    params.set('hl', 'visit');
    if (hit.match.visitId) params.set('vid', hit.match.visitId);
  } else {
    // name / nameKana / district / address / workplace / family / notes
    params.set('hl', 'basic');
    // どのサブフィールドかも渡しておく(MemberInfo 側で必要ならアコーディオン自動展開)
    params.set('field', field);
  }
  const qs = params.toString();
  return `/members/${hit.member.id}${qs ? `?${qs}` : ''}`;
}

export default function SearchHits({ hits, query, onNavigate, limit = 20 }: Props) {
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
          const href = buildHref(hit, query);
          return (
            <li key={`${hit.member.id}-${hit.match.field}-${hit.match.visitId ?? hit.match.visitedAt ?? i}`}>
              <Link
                href={href}
                onClick={() => onNavigate?.()}
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
              </Link>
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
