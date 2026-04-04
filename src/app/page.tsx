'use client';

import { useEffect, useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { MemberWithVisitInfo } from '../lib/types';
import { getMembersWithVisitInfo } from '../lib/storage';
import MemberBottomSheet from '../components/MemberBottomSheet';

const MapView = dynamic(() => import('../components/MapView'), { ssr: false });

export default function HomePage() {
  const [members, setMembers] = useState<MemberWithVisitInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMembersWithVisitInfo()
      .then(setMembers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectedMember = useMemo(
    () => members.find(m => m.id === selectedId) ?? null,
    [members, selectedId]
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--color-subtext)]">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      {/* マップ全面表示 — absoluteで親コンテナ内に収める（fixedはタッチイベント干渉の原因） */}
      <div
        className="absolute inset-0 z-0"
        style={{ touchAction: 'none' }}
      >
        <MapView
          members={members}
          selectedMemberId={selectedId}
          onMemberSelect={(id) => setSelectedId(id)}
          onMapClick={() => setSelectedId(null)}
        />
      </div>

      {/* FAB: 訪問を記録 */}
      <Link
        href="/visits/new"
        className="fixed right-5 bottom-[calc(80px+env(safe-area-inset-bottom))] z-30 w-14 h-14 rounded-full bg-[#111] text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      >
        <Plus size={24} />
      </Link>

      {/* ボトムシート */}
      {selectedMember && (
        <MemberBottomSheet
          member={selectedMember}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
