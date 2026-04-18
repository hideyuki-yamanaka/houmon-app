'use client';

import { useEffect, useState, useMemo } from 'react';
import { MapPin, TrendingUp, TrendingDown, AlertCircle, Users, Home, Flame } from 'lucide-react';
import Link from 'next/link';
import type { MemberWithVisitInfo, Visit, VisitStatus } from '../../lib/types';
import { getMembersWithVisitInfo, getAllVisits } from '../../lib/storage';
import { VISIT_STATUS_CONFIG } from '../../lib/constants';

// 期間タブの定義。'all' は全期間。
type PeriodKey = '1w' | '1m' | '3m' | '6m' | 'all';
const PERIODS: { key: PeriodKey; label: string; days: number | null }[] = [
  { key: '1w', label: '1週間', days: 7 },
  { key: '1m', label: '1ヶ月', days: 30 },
  { key: '3m', label: '3ヶ月', days: 90 },
  { key: '6m', label: '半年', days: 180 },
  { key: 'all', label: '全期間', days: null },
];

// ステータスごとのドーナツ色（constants の bg クラスだと SVG に塗れないので hex を定義）
const STATUS_HEX: Record<VisitStatus, string> = {
  met: '#10B981',
  absent: '#6B7280',
  refused: '#EF4444',
  unknown_address: '#F59E0B',
  moved: '#8B5CF6',
};

export default function LogPage() {
  const [members, setMembers] = useState<MemberWithVisitInfo[]>([]);
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>('1m');

  useEffect(() => {
    Promise.all([getMembersWithVisitInfo(), getAllVisits()])
      .then(([m, v]) => { setMembers(m); setAllVisits(v); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 選択された期間のフィルタ済み訪問リスト
  const periodVisits = useMemo(() => {
    const def = PERIODS.find(p => p.key === period)!;
    if (def.days === null) return allVisits;
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - def.days + 1);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return allVisits.filter(v => v.visitedAt >= cutoffStr);
  }, [allVisits, period]);

  // 比較用：直前の同じ長さの期間（「会えた率改善」のインサイト判定に使う）
  const prevPeriodVisits = useMemo(() => {
    const def = PERIODS.find(p => p.key === period)!;
    if (def.days === null) return [];
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() - def.days + 1);
    const start = new Date(end);
    start.setDate(start.getDate() - def.days);
    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);
    return allVisits.filter(v => v.visitedAt >= startStr && v.visitedAt < endStr);
  }, [allVisits, period]);

  // サマリー統計
  const stats = useMemo(() => {
    const uniqueVisited = new Set(periodVisits.map(v => v.memberId)).size;
    const totalMembers = members.length;
    const coverRate = totalMembers > 0 ? Math.round((uniqueVisited / totalMembers) * 100) : 0;

    // ステータス別カウント
    const statusCounts = new Map<VisitStatus, number>();
    for (const v of periodVisits) {
      statusCounts.set(v.status, (statusCounts.get(v.status) ?? 0) + 1);
    }

    // 地区別カバー率
    const districtStats = new Map<string, { total: number; visited: number }>();
    for (const m of members) {
      const d = districtStats.get(m.district) ?? { total: 0, visited: 0 };
      d.total++;
      if (periodVisits.some(v => v.memberId === m.id)) d.visited++;
      districtStats.set(m.district, d);
    }

    return {
      uniqueVisited,
      totalMembers,
      coverRate,
      visitCount: periodVisits.length,
      statusCounts,
      districtStats,
    };
  }, [members, periodVisits]);

  // 時系列バーチャート用データ
  // 1週 → 日別7本 / 1ヶ月 → 週別4本 / 3ヶ月 → 月別3本 / 半年 → 月別6本 / 全期間 → 月別12本
  const timeSeries = useMemo(() => {
    const def = PERIODS.find(p => p.key === period)!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let granularity: 'day' | 'week' | 'month';
    let bucketCount: number;
    if (def.key === '1w') { granularity = 'day'; bucketCount = 7; }
    else if (def.key === '1m') { granularity = 'week'; bucketCount = 4; }
    else if (def.key === '3m') { granularity = 'month'; bucketCount = 3; }
    else if (def.key === '6m') { granularity = 'month'; bucketCount = 6; }
    else { granularity = 'month'; bucketCount = 12; }

    const buckets: { label: string; count: number; start: Date; end: Date }[] = [];
    for (let i = bucketCount - 1; i >= 0; i--) {
      const end = new Date(today);
      const start = new Date(today);
      let label = '';
      if (granularity === 'day') {
        end.setDate(today.getDate() - i);
        start.setDate(today.getDate() - i);
        label = `${start.getMonth() + 1}/${start.getDate()}`;
      } else if (granularity === 'week') {
        end.setDate(today.getDate() - i * 7);
        start.setDate(today.getDate() - (i + 1) * 7 + 1);
        label = `${start.getMonth() + 1}/${start.getDate()}`;
      } else {
        const target = new Date(today.getFullYear(), today.getMonth() - i, 1);
        start.setFullYear(target.getFullYear(), target.getMonth(), 1);
        end.setFullYear(target.getFullYear(), target.getMonth() + 1, 0);
        label = `${target.getMonth() + 1}月`;
      }
      end.setHours(23, 59, 59, 999);
      buckets.push({ label, count: 0, start, end });
    }

    const source = def.key === 'all' ? allVisits : periodVisits;
    for (const v of source) {
      const d = new Date(v.visitedAt);
      for (const b of buckets) {
        if (d >= b.start && d <= b.end) { b.count++; break; }
      }
    }

    return { buckets, granularity };
  }, [periodVisits, allVisits, period]);

  // 自動インサイト：データから気付きを自動抽出
  const insights = useMemo(() => {
    const items: { key: string; icon: typeof TrendingUp; tone: 'warn' | 'good' | 'info'; title: string; body: string }[] = [];

    // 直近10訪問で不在が6以上
    const recent10 = [...allVisits].sort((a, b) => b.visitedAt.localeCompare(a.visitedAt)).slice(0, 10);
    const recentAbsent = recent10.filter(v => v.status === 'absent').length;
    if (recent10.length >= 10 && recentAbsent >= 6) {
      items.push({
        key: 'absent-surge', icon: AlertCircle, tone: 'warn',
        title: '不在が続いてるで',
        body: `直近10回のうち${recentAbsent}回が不在。訪問タイミング変えてみる？`,
      });
    }

    // 会えた率改善（前期間比 +10pt 以上）
    if (periodVisits.length >= 5 && prevPeriodVisits.length >= 5) {
      const curMet = periodVisits.filter(v => v.status === 'met').length / periodVisits.length * 100;
      const prevMet = prevPeriodVisits.filter(v => v.status === 'met').length / prevPeriodVisits.length * 100;
      const diff = curMet - prevMet;
      if (diff >= 10) {
        items.push({
          key: 'met-up', icon: TrendingUp, tone: 'good',
          title: '会えた率上がってる！',
          body: `前の期間より +${Math.round(diff)}pt。ええ感じや。`,
        });
      } else if (diff <= -10) {
        items.push({
          key: 'met-down', icon: TrendingDown, tone: 'warn',
          title: '会えた率が下がってる',
          body: `前の期間より ${Math.round(diff)}pt。`,
        });
      }
    }

    // 未訪問多数（全期間で一度も訪問してないメンバーが30人以上）
    const neverVisited = members.filter(m => m.totalVisits === 0).length;
    if (neverVisited >= 30) {
      items.push({
        key: 'never-visited', icon: Users, tone: 'info',
        title: '未訪問メンバーが多いで',
        body: `${neverVisited}人がまだ一度も訪問されてへん。`,
      });
    }

    // 地区別カバー率の偏り（最大と最小の差が 40pt 以上）
    const districtRates = Array.from(stats.districtStats.entries())
      .filter(([, d]) => d.total > 0)
      .map(([k, d]) => ({ k, rate: (d.visited / d.total) * 100 }));
    if (districtRates.length >= 2) {
      const max = Math.max(...districtRates.map(d => d.rate));
      const min = Math.min(...districtRates.map(d => d.rate));
      if (max - min >= 40) {
        const minDistrict = districtRates.find(d => d.rate === min)!;
        items.push({
          key: 'district-gap', icon: MapPin, tone: 'info',
          title: '地区のカバー率にムラあり',
          body: `${minDistrict.k.replace(/豊岡部|光陽部|豊岡中央支部/g, '')}地区が手薄（${Math.round(min)}%）。`,
        });
      }
    }

    // 転居増加（この期間で3件以上）
    const movedCount = periodVisits.filter(v => v.status === 'moved').length;
    if (movedCount >= 3) {
      items.push({
        key: 'moved-up', icon: Home, tone: 'info',
        title: '転居が増えてきてる',
        body: `この期間で${movedCount}件。名簿更新のタイミングかも。`,
      });
    }

    // 連続訪問（直近7日すべてで訪問あり）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const last7 = new Set<string>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      last7.add(d.toISOString().slice(0, 10));
    }
    const visitedDates = new Set(allVisits.map(v => v.visitedAt.slice(0, 10)));
    const allCovered = Array.from(last7).every(d => visitedDates.has(d));
    if (allCovered) {
      items.push({
        key: 'streak', icon: Flame, tone: 'good',
        title: '7日連続で訪問中！',
        body: '習慣化できてる。ほんま素晴らしい。',
      });
    }

    return items;
  }, [allVisits, periodVisits, prevPeriodVisits, members, stats.districtStats]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--color-subtext)]">読み込み中...</p>
      </div>
    );
  }

  const periodLabel = PERIODS.find(p => p.key === period)!.label;
  const maxBucketCount = Math.max(1, ...timeSeries.buckets.map(b => b.count));
  const totalStatusCount = Array.from(stats.statusCounts.values()).reduce((a, b) => a + b, 0);

  return (
    <div className="absolute inset-0 flex flex-col bg-[var(--color-bg)]">
      <div className="ios-nav px-4 py-3">
        <h1 className="text-xl font-bold text-center">ダッシュボード</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div
          className="max-w-[1366px] mx-auto px-4 pt-3 space-y-3"
          style={{ paddingBottom: 'calc(60px + env(safe-area-inset-bottom) + 16px)' }}
        >
          {/* 期間タブ — 横スクロール可、アクティブは黒塗り */}
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  period === p.key
                    ? 'bg-[#111] text-white'
                    : 'bg-white text-[var(--color-subtext)] border border-[#EBEBEB]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

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
                {periodLabel}の訪問カバー率
                <div className="text-sm font-medium text-[var(--color-text)]">{stats.uniqueVisited}/{stats.totalMembers}人</div>
              </div>
            </div>
            <div className="ios-card p-4 flex flex-col items-center justify-center hover:!opacity-100">
              <div className="text-3xl font-bold">{stats.visitCount}</div>
              <div className="text-xs text-[var(--color-subtext)] mt-1">{periodLabel}の訪問回数</div>
            </div>
          </div>

          {/* ステータス別ドーナツグラフ */}
          <div className="ios-card p-4 hover:!opacity-100">
            <h3 className="text-sm font-semibold mb-3">ステータス別の割合</h3>
            {totalStatusCount === 0 ? (
              <p className="text-sm text-[var(--color-subtext)] py-4 text-center">この期間の訪問はまだないで</p>
            ) : (
              <div className="flex items-center gap-4">
                {/* ドーナツ SVG */}
                <div className="relative w-28 h-28 shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    {(() => {
                      let offset = 0;
                      const circumference = 2 * Math.PI * 14;
                      return (Object.keys(VISIT_STATUS_CONFIG) as VisitStatus[]).map(status => {
                        const count = stats.statusCounts.get(status) ?? 0;
                        if (count === 0) return null;
                        const portion = count / totalStatusCount;
                        const dash = portion * circumference;
                        const el = (
                          <circle
                            key={status}
                            cx="18" cy="18" r="14"
                            fill="none"
                            stroke={STATUS_HEX[status]}
                            strokeWidth="6"
                            strokeDasharray={`${dash} ${circumference}`}
                            strokeDashoffset={-offset}
                          />
                        );
                        offset += dash;
                        return el;
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold leading-none">{totalStatusCount}</span>
                    <span className="text-[10px] text-[var(--color-subtext)] mt-0.5">訪問</span>
                  </div>
                </div>
                {/* 凡例 */}
                <div className="flex-1 space-y-1.5 min-w-0">
                  {(Object.keys(VISIT_STATUS_CONFIG) as VisitStatus[]).map(status => {
                    const count = stats.statusCounts.get(status) ?? 0;
                    const pct = totalStatusCount > 0 ? Math.round((count / totalStatusCount) * 100) : 0;
                    return (
                      <div key={status} className="flex items-center gap-2 text-xs">
                        <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: STATUS_HEX[status] }} />
                        <span className="flex-1 truncate">{VISIT_STATUS_CONFIG[status].label}</span>
                        <span className="text-[var(--color-subtext)] tabular-nums">{count}件</span>
                        <span className="font-medium tabular-nums w-10 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 時系列バーチャート */}
          <div className="ios-card p-4 hover:!opacity-100">
            <h3 className="text-sm font-semibold mb-3">
              訪問回数の推移
              <span className="text-[10px] font-normal text-[var(--color-subtext)] ml-2">
                （{timeSeries.granularity === 'day' ? '日別' : timeSeries.granularity === 'week' ? '週別' : '月別'}）
              </span>
            </h3>
            <div className="flex items-end gap-1.5 h-32">
              {timeSeries.buckets.map((b, i) => {
                const heightPct = (b.count / maxBucketCount) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <div className="w-full flex-1 flex items-end">
                      <div
                        className="w-full bg-[#111] rounded-t transition-all relative group"
                        style={{ height: `${heightPct}%`, minHeight: b.count > 0 ? '2px' : '0' }}
                      >
                        {b.count > 0 && (
                          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] text-[var(--color-subtext)] tabular-nums">
                            {b.count}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[9px] text-[var(--color-subtext)] truncate w-full text-center">{b.label}</span>
                  </div>
                );
              })}
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
              <h3 className="text-sm font-semibold text-[var(--color-subtext)] mb-3">訪問回数ランキング（全期間）</h3>
              <div className="space-y-2">
                {members
                  .filter(m => m.totalVisits > 0)
                  .sort((a, b) => b.totalVisits - a.totalVisits)
                  .slice(0, 5)
                  .map((m, i) => (
                    <Link key={m.id} href={`/members/${m.id}`} className="flex items-center gap-3 py-1 transition-opacity hover:opacity-70">
                      <span className="text-[15px] font-bold text-[var(--color-subtext)] w-5">{i + 1}</span>
                      <span className="text-[15px] flex-1">{m.name}</span>
                      <span className="text-[15px] font-bold">{m.totalVisits}回</span>
                    </Link>
                  ))}
              </div>
            </div>
          </div>

          {/* 自動インサイト — ヒデさんの指示で一番下に配置 */}
          {insights.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-semibold text-[var(--color-subtext)] px-1">気づきポイント</h3>
              {insights.map(i => {
                const Icon = i.icon;
                const toneClass =
                  i.tone === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : i.tone === 'good' ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800';
                return (
                  <div key={i.key} className={`ios-card p-3 border flex items-start gap-3 hover:!opacity-100 ${toneClass}`}>
                    <Icon size={18} className="shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">{i.title}</div>
                      <div className="text-xs mt-0.5 opacity-80">{i.body}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
