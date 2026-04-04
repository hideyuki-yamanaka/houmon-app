'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import type { Member, Visit } from '../../../lib/types';
import { getMember, getVisits } from '../../../lib/storage';
import MemberInfo from '../../../components/MemberInfo';
import VisitCard from '../../../components/VisitCard';

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [member, setMember] = useState<Member | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMember(id), getVisits(id)])
      .then(([m, v]) => {
        setMember(m);
        setVisits(v);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--color-subtext)]">読み込み中...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--color-subtext)]">メンバーが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg)]">
      {/* ナビバー */}
      <nav className="ios-nav flex items-center px-4 py-3 gap-2">
        <button onClick={() => { if (window.history.length > 1) router.back(); else router.push('/members'); }} className="flex items-center gap-1 text-[var(--color-primary)] shrink-0">
          <ChevronLeft size={24} />
          <span className="text-sm">戻る</span>
        </button>
        <h1 className="text-lg font-bold truncate flex-1 text-center">{member.name}</h1>
        <div className="w-14" /> {/* バランス用スペーサー */}
      </nav>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[920px] mx-auto px-4 py-4 pb-24 space-y-4">
          <MemberInfo member={member} onUpdate={(updates) => setMember(prev => prev ? { ...prev, ...updates } : prev)} />

          {/* 訪問ログ */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-[var(--color-subtext)] mb-3">
              訪問ログ（{visits.length}件）
            </h3>
            {visits.length === 0 ? (
              <p className="text-sm text-[var(--color-subtext)]">まだ訪問ログがありません</p>
            ) : (
              <div className="space-y-2">
                {visits.map(v => (
                  <VisitCard key={v.id} visit={v} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FAB: 訪問を記録 */}
      <Link
        href={`/visits/new?memberId=${member.id}`}
        className="fixed right-5 bottom-[calc(80px+env(safe-area-inset-bottom))] z-30 w-14 h-14 rounded-full bg-[#111] text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      >
        <Plus size={24} />
      </Link>
    </div>
  );
}
