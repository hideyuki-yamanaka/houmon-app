'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import type { MemberWithVisitInfo } from '../../../lib/types';
import { getMembersWithVisitInfo } from '../../../lib/storage';
import MemberCard from '../../../components/MemberCard';

export default function OverduePage() {
  const router = useRouter();
  const [members, setMembers] = useState<MemberWithVisitInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMembersWithVisitInfo()
      .then(m => setMembers(m.filter(x => x.isOverdue)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--color-subtext)]">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg)]">
      <nav className="ios-nav flex items-center px-4 py-3 gap-2">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-[var(--color-primary)] shrink-0">
          <ChevronLeft size={24} />
          <span className="text-sm">戻る</span>
        </button>
        <h1 className="text-base font-bold truncate flex-1 text-center">訪問期限超過</h1>
        <div className="w-14" />
      </nav>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[920px] mx-auto px-4 py-4">
          <p className="text-sm text-[var(--color-subtext)] mb-4">{members.length}人のメンバーが訪問期限を超過しています</p>
          <div className="space-y-2">
            {members.map(m => (
              <MemberCard key={m.id} member={m} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
