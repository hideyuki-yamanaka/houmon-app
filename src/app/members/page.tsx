'use client';

import { useEffect, useState, useMemo } from 'react';
import type { MemberWithVisitInfo } from '../../lib/types';
import { getMembersWithVisitInfo } from '../../lib/storage';
import MemberCard from '../../components/MemberCard';
import DistrictFilter from '../../components/DistrictFilter';

export default function MembersPage() {
  const [members, setMembers] = useState<MemberWithVisitInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [district, setDistrict] = useState<string | null>(null);

  useEffect(() => {
    getMembersWithVisitInfo()
      .then(setMembers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = members.filter(m => {
      if (district && m.district !== district) return false;
      return true;
    });
    // 直近訪問記録がある人から順（訪問済み→未訪問、訪問日降順）
    result.sort((a, b) => {
      if (a.lastVisitDate && !b.lastVisitDate) return -1;
      if (!a.lastVisitDate && b.lastVisitDate) return 1;
      if (a.lastVisitDate && b.lastVisitDate) {
        return b.lastVisitDate.localeCompare(a.lastVisitDate);
      }
      return a.name.localeCompare(b.name);
    });
    return result;
  }, [members, district]);

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg)]">
      {/* ヘッダー */}
      <div className="ios-nav px-4 py-3">
        <h1 className="text-xl font-bold text-center">メンバー</h1>
      </div>

      {/* 地区フィルター */}
      <div className="px-4 pt-2 pb-4">
        <DistrictFilter selected={district} onChange={setDistrict} members={members} />
      </div>

      {/* メンバーリスト */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <p className="text-center text-[var(--color-subtext)] mt-8">読み込み中...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-[var(--color-subtext)] mt-8">メンバーが見つかりません</p>
        ) : (
          <div className="space-y-1">
            <p className="text-2xl font-bold text-[var(--color-text)] mt-2 mb-3">{filtered.length}人</p>
            {filtered.map(m => (
              <MemberCard key={m.id} member={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
