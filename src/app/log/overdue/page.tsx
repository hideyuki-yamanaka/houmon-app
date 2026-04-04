'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { MemberWithVisitInfo } from '../../../lib/types';
import { getMembersWithVisitInfo } from '../../../lib/storage';
import { formatDate } from '../../../lib/utils';

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
              <Link key={m.id} href={`/members/${m.id}`} className="block">
                <div className="ios-card px-4 py-3 flex items-center gap-3 active:bg-[#F5F5F5] transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{m.name}</span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F0F0F0] text-[var(--color-subtext)]">
                        {m.district.replace(/豊岡部|光陽部|豊岡中央支部/g, '')}
                      </span>
                    </div>
                    <span className="text-xs text-[var(--color-subtext)]">
                      {m.lastVisitDate
                        ? `最終訪問: ${formatDate(m.lastVisitDate, 'M/d')}（${m.daysSinceLastVisit}日前）`
                        : '未訪問'}
                    </span>
                  </div>
                  <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
