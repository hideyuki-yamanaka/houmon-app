'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Member, Visit } from '../../../lib/types';
import { getMember, getVisits, getMembers } from '../../../lib/storage';
import VisitForm from '../../../components/VisitForm';
import MemberSelector from '../../../components/MemberSelector';

function NewVisitContent() {
  const searchParams = useSearchParams();
  const memberId = searchParams.get('memberId');
  const visitId = searchParams.get('visitId');
  const [member, setMember] = useState<Member | null>(null);
  const [allMembers, setAllMembers] = useState<Member[]>([]);
  const [existingVisit, setExistingVisit] = useState<Visit | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [needsMemberSelect, setNeedsMemberSelect] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        if (memberId) {
          const m = await getMember(memberId);
          setMember(m);
          if (visitId && m) {
            const visits = await getVisits(memberId);
            const found = visits.find(v => v.id === visitId);
            if (found) setExistingVisit(found);
          }
        } else {
          // メンバーIDなし → メンバー選択が必要
          const members = await getMembers();
          setAllMembers(members);
          setNeedsMemberSelect(true);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, [memberId, visitId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--color-subtext)]">読み込み中...</p>
      </div>
    );
  }

  // メンバー選択が必要な場合
  if (needsMemberSelect && !member) {
    return (
      <MemberSelector
        members={allMembers}
        onSelect={(m) => {
          setMember(m);
          setNeedsMemberSelect(false);
        }}
      />
    );
  }

  if (!member) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--color-subtext)]">メンバーが見つかりません</p>
      </div>
    );
  }

  return <VisitForm member={member} existingVisit={existingVisit} />;
}

export default function NewVisitPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--color-subtext)]">読み込み中...</p>
      </div>
    }>
      <NewVisitContent />
    </Suspense>
  );
}
