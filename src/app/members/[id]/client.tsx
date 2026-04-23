'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import type { Member, Visit } from '../../../lib/types';
import { getMember, getVisits } from '../../../lib/storage';
import MemberInfo from '../../../components/MemberInfo';
import InfoSection from '../../../components/InfoSection';
import VisitCard from '../../../components/VisitCard';

export default function MemberDetailClient() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [member, setMember] = useState<Member | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    Promise.all([getMember(id), getVisits(id)])
      .then(([m, v]) => {
        setMember(m);
        setVisits(v);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ホームに戻ってきた時、マップがこのメンバーのピンを中央に表示するよう記録する。
  // page.tsx 側が sessionStorage から読み込んで selectedId に復元 → PanToSelected が発火。
  useEffect(() => {
    try { sessionStorage.setItem('houmon_lastViewedMemberId', id); } catch { /* ignore */ }
  }, [id]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchData();
    };
    const handlePopState = () => fetchData();
    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('focus', fetchData);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('focus', fetchData);
    };
  }, [fetchData]);

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
      <nav className="ios-nav flex items-center px-4 py-3 gap-2">
        <button onClick={() => { if (window.history.length > 1) router.back(); else router.push('/members'); }} className="flex items-center gap-1 text-[var(--color-primary)] shrink-0">
          <ChevronLeft size={24} />
          <span className="text-sm">戻る</span>
        </button>
        <h1 className="text-lg font-bold truncate flex-1 text-center">{member.name}</h1>
        <div className="w-14" />
      </nav>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1366px] mx-auto px-4 py-4 pb-24 space-y-4">
          <MemberInfo member={member} onUpdate={(updates) => setMember(prev => prev ? { ...prev, ...updates } : prev)} />

          <InfoSection member={member} onUpdate={(updates) => setMember(prev => prev ? { ...prev, ...updates } : prev)} />

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

      <Link
        href={`/visits/new?memberId=${member.id}`}
        className="fixed right-5 bottom-[calc(80px+env(safe-area-inset-bottom))] z-30 w-14 h-14 rounded-full bg-[#111] text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform"
      >
        <Plus size={24} />
      </Link>
    </div>
  );
}
