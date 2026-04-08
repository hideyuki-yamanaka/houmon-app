'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { MemberWithVisitInfo } from '../lib/types';
import MemberCard from './MemberCard';
import SwipeableBottomSheet from './SwipeableBottomSheet';

interface Props {
  districtShort: string | null; // 「香城」等。null→非表示
  members: MemberWithVisitInfo[];
  onSelectMember: (id: string) => void;
  onClose: () => void;
}

export default function DistrictMembersBottomSheet({ districtShort, members, onSelectMember, onClose }: Props) {
  // 閉じるアニメーション中も前の地区名を表示するため
  const lastDistrictRef = useRef<string | null>(null);
  const lastMembersRef = useRef<MemberWithVisitInfo[]>([]);
  if (districtShort) {
    lastDistrictRef.current = districtShort;
    lastMembersRef.current = members;
  }
  const displayDistrict = districtShort ?? lastDistrictRef.current;
  const displayMembers = districtShort ? members : lastMembersRef.current;

  // アイウエオ順ソート
  const sorted = [...displayMembers].sort((a, b) => {
    const aKana = a.nameKana ?? a.name;
    const bKana = b.nameKana ?? b.name;
    return aKana.localeCompare(bKana, 'ja');
  });

  return (
    <SwipeableBottomSheet
      open={!!districtShort}
      onClose={onClose}
      peekHeight={320}
      zIndex={30}
    >
      {(snap) => {
        if (!displayDistrict) return null;

        return (
          <div className="flex flex-col h-full">
            {/* ヘッダー */}
            <div className="px-4 pt-1 pb-2 flex items-center justify-between border-b border-[#F0F0F0] shrink-0">
              <div className="flex items-baseline gap-2">
                <h2 className="text-lg font-bold">{displayDistrict}地区</h2>
                <span className="text-sm text-[var(--color-subtext)]">{sorted.length}人</span>
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
                <p className="text-sm text-[var(--color-subtext)] text-center py-4">メンバーがいません</p>
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
