'use client';

// ──────────────────────────────────────────────────────────────
// 汎用「メンバー一覧ボトムシート」
//
// ダッシュボードからの ドリルダウン用:
//   - 「今週の訪問メンバー」
//   - 「不在のメンバー」
//   - 「豊岡香城地区のメンバー」
//   など、何かの軸で抽出したメンバー一覧をふわっと表示する。
//
// メンバーをタップしたらその場でメンバー詳細ページに飛ばす。
// (DistrictMembersBottomSheet と機能はほぼ同じだが、用途を切り出してシンプル化)
// ──────────────────────────────────────────────────────────────

import { useRef } from 'react';
import { X } from 'lucide-react';
import type { MemberWithVisitInfo } from '../lib/types';
import MemberCard from './MemberCard';
import SwipeableBottomSheet from './SwipeableBottomSheet';

interface Props {
  /** 開閉トリガ。null なら閉じる */
  title: string | null;
  /** 件数を「N 人」と添えたい時用。省略可 */
  countLabel?: string;
  members: MemberWithVisitInfo[];
  onSelectMember: (id: string) => void;
  onClose: () => void;
}

export default function MembersListBottomSheet({
  title, countLabel, members, onSelectMember, onClose,
}: Props) {
  // 閉じるアニメ中も前回の中身を表示するためにキャッシュ
  const lastTitleRef = useRef<string | null>(null);
  const lastMembersRef = useRef<MemberWithVisitInfo[]>([]);
  if (title) {
    lastTitleRef.current = title;
    lastMembersRef.current = members;
  }
  const displayTitle = title ?? lastTitleRef.current;
  const displayMembers = title ? members : lastMembersRef.current;

  // アイウエオ順
  const sorted = [...displayMembers].sort((a, b) => {
    const aKana = a.nameKana ?? a.name;
    const bKana = b.nameKana ?? b.name;
    return aKana.localeCompare(bKana, 'ja');
  });

  return (
    <SwipeableBottomSheet
      open={!!title}
      onClose={onClose}
      peekHeight={420}
      zIndex={50}
    >
      {() => {
        if (!displayTitle) return null;
        return (
          <div className="flex flex-col h-full">
            {/* ヘッダー */}
            <div className="px-4 pt-1 pb-2 flex items-center justify-between border-b border-[#F0F0F0] shrink-0">
              <div className="flex items-baseline gap-2 min-w-0">
                <h2 className="text-lg font-bold truncate">{displayTitle}</h2>
                <span className="text-sm text-[var(--color-subtext)] shrink-0">
                  {countLabel ?? `${sorted.length}人`}
                </span>
              </div>
              <button
                onClick={onClose}
                aria-label="閉じる"
                className="w-8 h-8 rounded-full flex items-center justify-center active:bg-[#F0F0F0]"
              >
                <X size={18} className="text-[var(--color-subtext)]" />
              </button>
            </div>

            {/* メンバーリスト */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {sorted.length === 0 ? (
                <p className="text-sm text-[var(--color-subtext)] text-center py-4">
                  該当メンバーがいません
                </p>
              ) : (
                sorted.map(m => (
                  <MemberCard key={m.id} member={m} onSelect={onSelectMember} />
                ))
              )}
            </div>
          </div>
        );
      }}
    </SwipeableBottomSheet>
  );
}
