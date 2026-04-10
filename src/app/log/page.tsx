'use client';

import { useEffect, useState, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import Link from 'next/link';
import type { MemberWithVisitInfo, Visit } from '../../lib/types';
import { getMembersWithVisitInfo, getVisitsByMonth } from '../../lib/storage';
import { formatDate } from '../../lib/utils';

export default function LogPage() {
  const now = new Date();
  const [members, setMembers] = useState<MemberWithVisitInfo[]>([]);
  const [monthVisits, setMonthVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getMembersWithVisitInfo(),
      getVisitsByMonth(now.getFullYear(), now.getMonth() + 1),
    ])
      .then(([m, v]) => { setMembers(m); setMonthVisits(v); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 今月の統計
  const stats = useMemo(() => {
    const uniqueMembersVisited = new Set(monthVisits.map(v => v.memberId)).size;
    const totalMembers = members.length;
    const coverRate = totalMembers > 0 ? Math.round((uniqueMembersVisited / totalMembers) * 100) : 0;

    // 地区別カバー率
    const districtStats = new Map<string, { total: number; visited: number }>();
    for (const m of members) {
      const d = districtStats.get(m.district) ?? { total: 0, visited: 0 };
      d.total++;
      if (monthVisits.some(v => v.memberId === m.id)) d.visited++;
      districtStats.set(m.district, d);
    }

    return { uniqueMembersVisited, totalMembers, coverRate, monthVisitCount: monthVisits.length, districtStats };
  }, [members, monthVisits]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--color-subtext)]">読み込み中...</p>
      </div>
    );
  }

  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;

  return (
    // absolute inset-0 で親の padding box 全体をカバー → tab bar の裏まで伸びる
    <div className="absolute inset-0 flex flex-col bg-[var(--color-bg)]">
      <div className="ios-nav px-4 py-3">
        <h1 className="text-xl font-bold text-center">ダッシュボード</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div
          className="max-w-[1366px] mx-auto px-4 pt-3 space-y-3"
          // tab bar(60px) + safe area + 余白(16px) 分 padding-bottom を入れて
          // 最後のブロックが tab bar の裏に隠れた後もスクロールで全部見えるように。
          style={{ paddingBottom: 'calc(60px + env(safe-area-inset-bottom) + 16px)' }}
        >

          {/* サマリー — リングチャート + 訪問回数 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="ios-card p-4 flex flex-col items-center hover:!opacity-100">
              <div className="relative w-20 h-20">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#EBEBEB" strokeWidth="3.5" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#111" strokeWidth="3.5"
                    strokeDasharray={`${stats.coverRate * 0.88} 88`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold">{stats.coverRate}%</span>
                </div>
              </div>
              <div className="text-xs text-[var(--color-subtext)] mt-2 text-center">
                訪問カバー率
                <div className="text-sm font-medium text-[var(--color-text)]">{stats.uniqueMembersVisited}/{stats.totalMembers}人</div>
              </div>
            </div>
            <div className="ios-card p-4 flex flex-col items-center justify-center hover:!opacity-100">
              <div className="text-3xl font-bold">{stats.monthVisitCount}</div>
              <div className="text-xs text-[var(--color-subtext)] mt-1">{monthLabel}の訪問回数</div>
            </div>
          </div>

          {/* 地区別統計 & ランキング — PC: 2カラム / スマホ: 縦積み */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* 地区別統計 */}
            <div className="ios-card p-4 hover:!opacity-100">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={16} className="text-[#111]" />
                <h3 className="text-sm font-semibold">地区別訪問カバー率</h3>
              </div>
              <div className="space-y-2">
                {Array.from(stats.districtStats.entries()).map(([district, data]) => {
                  const rate = data.total > 0 ? Math.round((data.visited / data.total) * 100) : 0;
                  return (
                    <div key={district} className="flex items-center gap-3">
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F0F0F0] text-[var(--color-subtext)] shrink-0 w-16 text-center">
                        {district.replace(/豊岡部|光陽部|豊岡中央支部/g, '')}
                      </span>
                      <div className="flex-1 h-2 bg-[#EBEBEB] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all bg-[#111]"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                      <span className="text-sm text-[var(--color-subtext)] w-20 text-right">
                        {data.visited}/{data.total} ({rate}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* メンバー訪問回数ランキング */}
            <div className="ios-card p-4 hover:!opacity-100">
              <h3 className="text-sm font-semibold text-[var(--color-subtext)] mb-3">訪問回数ランキング</h3>
              <div className="space-y-2">
                {members
                  .filter(m => m.totalVisits > 0)
                  .sort((a, b) => b.totalVisits - a.totalVisits)
                  .slice(0, 5)
                  .map((m, i) => {
                    return (
                      <Link key={m.id} href={`/members/${m.id}`} className="flex items-center gap-3 py-1 transition-opacity hover:opacity-70">
                        <span className="text-[15px] font-bold text-[var(--color-subtext)] w-5">{i + 1}</span>
                        <span className="text-[15px] flex-1">{m.name}</span>
                        <span className="text-[15px] font-bold">{m.totalVisits}回</span>
                      </Link>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
