'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { MemberWithVisitInfo } from '../lib/types';
import MemberCard from './MemberCard';

interface Props {
  districtShort: string | null; // 「香城」等。null→非表示
  members: MemberWithVisitInfo[];
  onSelectMember: (id: string) => void;
  onClose: () => void;
}

export default function DistrictMembersBottomSheet({ districtShort, members, onSelectMember, onClose }: Props) {
  const [show, setShow] = useState(false);
  const [displayedDistrict, setDisplayedDistrict] = useState<string | null>(null);
  const [displayedMembers, setDisplayedMembers] = useState<MemberWithVisitInfo[]>([]);

  useEffect(() => {
    if (districtShort) {
      setDisplayedDistrict(districtShort);
      setDisplayedMembers(members);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setShow(true));
      });
    } else if (displayedDistrict) {
      setShow(false);
      const timer = setTimeout(() => setDisplayedDistrict(null), 300);
      return () => clearTimeout(timer);
    }
  }, [districtShort, members]);

  // 表示中は members の更新を反映
  useEffect(() => {
    if (districtShort) setDisplayedMembers(members);
  }, [members, districtShort]);

  if (!displayedDistrict) return null;

  // アイウエオ順ソート
  const sorted = [...displayedMembers].sort((a, b) => {
    const aKana = a.nameKana ?? a.name;
    const bKana = b.nameKana ?? b.name;
    return aKana.localeCompare(bKana, 'ja');
  });

  return (
    <div className="fixed inset-0 z-30 pointer-events-none">
      <div
        className={`absolute bottom-[calc(60px+env(safe-area-inset-bottom))] left-0 right-0 bg-white bottom-sheet max-w-[1366px] mx-auto pointer-events-auto transition-transform duration-300 ease-out ${
          show ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ maxHeight: '40vh' }}
      >
        <div className="bottom-sheet-handle" />

        {/* ヘッダー */}
        <div className="px-4 pt-2 pb-2 flex items-center justify-between border-b border-[#F0F0F0]">
          <div className="flex items-baseline gap-2">
            <h2 className="text-lg font-bold">{displayedDistrict}地区</h2>
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
        <div className="overflow-y-auto px-4 py-3 space-y-2" style={{ maxHeight: 'calc(40vh - 56px)' }}>
          {sorted.length === 0 ? (
            <p className="text-sm text-[var(--color-subtext)] text-center py-4">メンバーがいません</p>
          ) : (
            sorted.map(m => (
              <MemberCard key={m.id} member={m} onSelect={onSelectMember} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
