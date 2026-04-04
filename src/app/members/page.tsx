'use client';

import { useEffect, useState, useMemo } from 'react';
import { Filter } from 'lucide-react';
import type { MemberWithVisitInfo } from '../../lib/types';
import { getMembersWithVisitInfo } from '../../lib/storage';
import MemberCard from '../../components/MemberCard';
import DistrictFilter from '../../components/DistrictFilter';

// ひらがな/カタカナの先頭文字から行を判定
function getKanaGroup(kana: string | undefined): string {
  if (!kana) return 'その他';
  const c = kana.charAt(0);
  if (/[あいうえおアイウエオ]/.test(c)) return 'あ';
  if (/[かきくけこがぎぐげごカキクケコガギグゲゴ]/.test(c)) return 'か';
  if (/[さしすせそざじずぜぞサシスセソザジズゼゾ]/.test(c)) return 'さ';
  if (/[たちつてとだぢづでどタチツテトダヂヅデド]/.test(c)) return 'た';
  if (/[なにぬねのナニヌネノ]/.test(c)) return 'な';
  if (/[はひふへほばびぶべぼぱぴぷぺぽハヒフヘホバビブベボパピプペポ]/.test(c)) return 'は';
  if (/[まみむめもマミムメモ]/.test(c)) return 'ま';
  if (/[やゆよヤユヨ]/.test(c)) return 'や';
  if (/[らりるれろラリルレロ]/.test(c)) return 'ら';
  if (/[わをんワヲン]/.test(c)) return 'わ';
  return 'その他';
}

const ACTIVITY_FILTERS = ['すべて', '会合参加', '対話実践', '会える', '会えない'] as const;

export default function MembersPage() {
  const [members, setMembers] = useState<MemberWithVisitInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [district, setDistrict] = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState<string>('すべて');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  useEffect(() => {
    getMembersWithVisitInfo()
      .then(setMembers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 直近訪問した上位3人
  const recentVisited = useMemo(() => {
    return [...members]
      .filter(m => m.lastVisitDate)
      .sort((a, b) => (b.lastVisitDate ?? '').localeCompare(a.lastVisitDate ?? ''))
      .slice(0, 3);
  }, [members]);

  // フィルタリング＆アイウエオ順ソート
  const filtered = useMemo(() => {
    let result = members.filter(m => {
      if (district && m.district !== district) return false;
      if (activityFilter !== 'すべて') {
        if ((m.activityStatus ?? '') !== activityFilter) return false;
      }
      return true;
    });
    // アイウエオ順（nameKanaでソート）
    result.sort((a, b) => {
      const aKana = a.nameKana ?? a.name;
      const bKana = b.nameKana ?? b.name;
      return aKana.localeCompare(bKana, 'ja');
    });
    return result;
  }, [members, district, activityFilter]);

  // あ行ごとにグループ化
  const grouped = useMemo(() => {
    const groups: { label: string; members: MemberWithVisitInfo[] }[] = [];
    let currentGroup = '';
    for (const m of filtered) {
      const g = getKanaGroup(m.nameKana);
      if (g !== currentGroup) {
        currentGroup = g;
        groups.push({ label: g, members: [m] });
      } else {
        groups[groups.length - 1].members.push(m);
      }
    }
    return groups;
  }, [filtered]);

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg)]">
      {/* ヘッダー */}
      <div className="ios-nav px-4 py-3">
        <h1 className="text-xl font-bold text-center">メンバー</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pb-4">

          {/* 直近訪問したメンバー */}
          {!loading && recentVisited.length > 0 && (
            <div className="mb-4">
              <h2 className="text-xs font-semibold text-[var(--color-subtext)] mb-2 mt-2">直近訪問したメンバー</h2>
              <div className="space-y-1">
                {recentVisited.map(m => (
                  <MemberCard key={m.id} member={m} />
                ))}
              </div>
            </div>
          )}

          {/* 地区フィルター */}
          <div className="pt-2 pb-4">
            <DistrictFilter selected={district} onChange={setDistrict} members={members} />
          </div>

          {/* メンバーリスト */}
          {loading ? (
            <p className="text-center text-[var(--color-subtext)] mt-8">読み込み中...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-[var(--color-subtext)] mt-8">メンバーが見つかりません</p>
          ) : (
            <div>
              {/* 人数 + フィルターボタン */}
              <div className="flex items-center justify-between mt-2 mb-3">
                <p className="text-2xl font-bold text-[var(--color-text)]">{filtered.length}人</p>
                <div className="relative">
                  <button
                    onClick={() => setShowFilterMenu(!showFilterMenu)}
                    className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg transition-colors ${
                      activityFilter !== 'すべて' ? 'bg-[var(--color-primary)] text-white' : 'bg-[#F0F0F0] text-[var(--color-subtext)]'
                    }`}
                  >
                    <Filter size={14} />
                    {activityFilter !== 'すべて' ? activityFilter : 'フィルター'}
                  </button>
                  {showFilterMenu && (
                    <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-lg z-20 overflow-hidden min-w-[140px]">
                      {ACTIVITY_FILTERS.map(f => (
                        <button
                          key={f}
                          onClick={() => { setActivityFilter(f); setShowFilterMenu(false); }}
                          className={`w-full text-left px-4 py-2.5 text-sm ${
                            activityFilter === f ? 'bg-[#F0F0F0] font-bold' : ''
                          } active:bg-[#E8E8E8] border-b border-[#F0F0F0] last:border-b-0`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* あ行グループ付きリスト */}
              <div className="space-y-1">
                {grouped.map(group => (
                  <div key={group.label}>
                    <div className="text-xs font-bold text-[var(--color-subtext)] bg-[var(--color-bg)] sticky top-0 py-1.5 px-1 z-10">
                      {group.label}行
                    </div>
                    {group.members.map(m => (
                      <MemberCard key={m.id} member={m} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
