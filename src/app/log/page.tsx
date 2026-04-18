'use client';

import { useEffect, useLayoutEffect, useState, useMemo, useRef } from 'react';
import { MapPin, TrendingUp, TrendingDown, AlertCircle, Users, Home, Flame } from 'lucide-react';
import Link from 'next/link';
import type { MemberWithVisitInfo, Visit, VisitStatus } from '../../lib/types';
import { getMembersWithVisitInfo, getAllVisits } from '../../lib/storage';
import { VISIT_STATUS_CONFIG, DISTRICT_COLORS } from '../../lib/constants';

// 期間タブの定義。'all' は全期間。
type PeriodKey = '1w' | '1m' | '3m' | '6m' | 'all';
const PERIODS: { key: PeriodKey; label: string; days: number | null }[] = [
  { key: 'all', label: '全期間', days: null },
  { key: '1w', label: '1週間', days: 7 },
  { key: '1m', label: '1ヶ月', days: 30 },
  { key: '3m', label: '3ヶ月', days: 90 },
  { key: '6m', label: '半年', days: 180 },
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
  const [period, setPeriod] = useState<PeriodKey>('all');
  // 地区セクションのアコーディオン展開状態 — 9件を超えたら畳む
  const [expandDistrict, setExpandDistrict] = useState(false);
  // 月別推移グラフの横スクロール — デフォルトは右端（最新月）に合わせる
  const trendScrollRef = useRef<HTMLDivElement>(null);
  // グラフ描画エリア（ラッパー）のサイズ。縦幅を「割合」カードにフィットさせるため可変にする。
  const trendWrapRef = useRef<HTMLDivElement>(null);
  const [trendChartH, setTrendChartH] = useState(200);

  useEffect(() => {
    Promise.all([getMembersWithVisitInfo(), getAllVisits()])
      .then(([m, v]) => { setMembers(m); setAllVisits(v); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 推移グラフの縦フィル：ラッパー高さを ResizeObserver で拾って chartH に反映。
  // これで右隣「割合」カードに高さが揃い、縦方向の余白が消える。
  useEffect(() => {
    const el = trendWrapRef.current;
    if (!el) return;
    const update = () => {
      const h = el.clientHeight;
      // X軸ラベル（h-10 + mt-1 = 約44px）を差し引いて、純粋なチャート高さとして使う
      const chartOnly = Math.max(180, h - 48);
      setTrendChartH(chartOnly);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading]);

  // 年間推移グラフ：データ読み込み完了後、右端（最新月＝現在地点）にスクロール。
  // useLayoutEffect で paint 前に scrollLeft を確定させることで、左端から一瞬見えて右に飛ぶチラつきを防ぐ。
  useLayoutEffect(() => {
    if (loading) return;
    const el = trendScrollRef.current;
    if (!el) return;
    // scrollWidth はこの時点で確定しているのでそのまま代入でOK
    el.scrollLeft = el.scrollWidth;
    // 念のため、フォント読み込みなどで幅が後から変わるケースに対して 1 フレーム後にも合わせ直す
    requestAnimationFrame(() => {
      if (trendScrollRef.current) trendScrollRef.current.scrollLeft = trendScrollRef.current.scrollWidth;
    });
  }, [loading, allVisits]);

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

  // 時系列グラフ用データ — 月別×直近12ヶ月の「訪問人数（ユニーク）」推移。
  // ヒデさんの要望で "1月は6人、2月は1人" みたいな月ごとの水位を見れるよう固定。
  // 期間タブ(1週/1ヶ月…)は上段の統計だけに効いて、このグラフは常に年間トレンド。
  const timeSeries = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthCount = 12;

    const buckets: { label: string; year: number; month: number; count: number; members: Set<string> }[] = [];
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      buckets.push({
        label: `${d.getMonth() + 1}月`,
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        count: 0,
        members: new Set(),
      });
    }

    // 各月に「その月に訪問したユニークメンバー」を集計
    for (const v of allVisits) {
      const vd = new Date(v.visitedAt);
      const y = vd.getFullYear();
      const m = vd.getMonth() + 1;
      const bucket = buckets.find(b => b.year === y && b.month === m);
      if (bucket) bucket.members.add(v.memberId);
    }
    for (const b of buckets) b.count = b.members.size;

    return { buckets, monthCount };
  }, [allVisits]);

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

  const maxBucketCount = Math.max(1, ...timeSeries.buckets.map(b => b.count));
  const totalStatusCount = Array.from(stats.statusCounts.values()).reduce((a, b) => a + b, 0);

  return (
    <div className="absolute inset-0 flex flex-col bg-[var(--color-bg)]">
      <div className="ios-nav px-4 py-3">
        <h1 className="text-xl font-bold text-center">ダッシュボード</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div
          className="max-w-[1366px] mx-auto px-4 pt-3"
          style={{ paddingBottom: 'calc(60px + env(safe-area-inset-bottom) + 16px)' }}
        >
          {/* 期間タブ — 横スクロール可、アクティブは黒塗り */}
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 mb-3">
            {PERIODS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`shrink-0 px-4 py-2 rounded-full text-[15px] font-semibold transition-colors ${
                  period === p.key
                    ? 'bg-[#111] text-white'
                    : 'bg-white text-[var(--color-subtext)] border border-[#EBEBEB]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* 弁当グリッド：スマホ=1列 / タブレット=2列 / PC=4列
              各カードに md: / lg: の col-span を付けてサイズを可変にする */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">

            {/* ステータス別 横棒グラフ — PCでは訪問人数推移と横並び
                (md: 2 col 全幅 / lg: 2 col = 半分)
                ドーナツだと余白が目立っていたので、横棒＋大きめのフォントで情報密度を上げる */}
            <div className="ios-card p-5 hover:!opacity-100 md:col-span-2 lg:col-span-2">
              <div className="flex items-baseline justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold leading-tight">割合</h3>
                  <p className="text-xs text-[var(--color-subtext)] mt-0.5">訪問の手応え内訳</p>
                </div>
                {totalStatusCount > 0 && (
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black tabular-nums leading-none">{totalStatusCount}</span>
                    <span className="text-sm text-[var(--color-subtext)]">件</span>
                  </div>
                )}
              </div>
              {totalStatusCount === 0 ? (
                <p className="text-sm text-[var(--color-subtext)] py-4 text-center">この期間の訪問はまだないで</p>
              ) : (
                <div className="space-y-4">
                  {(Object.keys(VISIT_STATUS_CONFIG) as VisitStatus[]).map(status => {
                    const count = stats.statusCounts.get(status) ?? 0;
                    const pct = totalStatusCount > 0 ? Math.round((count / totalStatusCount) * 100) : 0;
                    const hex = STATUS_HEX[status];
                    return (
                      <div key={status}>
                        <div className="flex items-baseline justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: hex }} />
                            <span className="text-[15px] font-medium truncate">{VISIT_STATUS_CONFIG[status].label}</span>
                          </div>
                          <div className="flex items-baseline gap-2 shrink-0 ml-2">
                            <span className="text-xs text-[var(--color-subtext)] tabular-nums">{count}件</span>
                            <span className="text-xl font-black tabular-nums w-12 text-right" style={{ color: count > 0 ? hex : '#D1D5DB' }}>{pct}%</span>
                          </div>
                        </div>
                        <div className="h-2.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-[width] duration-500"
                            style={{ width: `${pct}%`, backgroundColor: hex }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 月別訪問人数の年間推移 (md: 2 col 全幅 / lg: 2 col = 半分)
                PCではステータスドーナツと横並び → グラフ幅が詰まるので横スクロール対応。
                デフォルトは右端(最新月)にスクロールしておく。
                縦はグリッドで割合カードと同じ高さに stretch、中身は flex-1 でフィル。 */}
            <div className="ios-card p-5 hover:!opacity-100 md:col-span-2 lg:col-span-2 flex flex-col">
              <div className="mb-3">
                <h3 className="text-lg font-bold leading-tight">訪問人数の推移</h3>
                <p className="text-xs text-[var(--color-subtext)] mt-0.5">
                  直近{timeSeries.monthCount}ヶ月（月ごとのユニーク人数）
                </p>
              </div>
              <div ref={trendWrapRef} className="flex-1 min-h-[200px]">
              {(() => {
                // ─── 案C (3ヶ月ズーム) ───
                // - 初期表示は3ヶ月が画面内に収まる幅（現在月を右端・前2ヶ月を同時表示）
                // - 横スクロールで12ヶ月まで見返せる
                // - Y軸は左に固定、グラフ本体のみスクロール
                // - 各ポイントに「人数」と「前月比(+2/-1)」を大きく表示
                const buckets = timeSeries.buckets;
                const yMax = Math.max(6, maxBucketCount);
                const chartH = trendChartH;   // 親カードの高さにフィットさせる可変値
                const stepPx = 120;        // 1ヶ月あたりの横幅 → 3ヶ月で約360px見える
                const innerW = buckets.length * stepPx;
                const xAt = (i: number) => i * stepPx + stepPx / 2;
                const yAt = (c: number) => chartH - 40 - (c / yMax) * (chartH - 80);

                const pts = buckets.map((b, i) => ({
                  x: xAt(i),
                  y: yAt(b.count),
                  diff: i > 0 ? b.count - buckets[i - 1].count : null,
                  count: b.count,
                  label: b.label,
                  year: b.year,
                  month: b.month,
                }));
                const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
                const areaD = `${pathD} L${pts[pts.length - 1].x} ${chartH - 40} L${pts[0].x} ${chartH - 40} Z`;

                return (
                  <div className="flex gap-3">
                    {/* Y軸ラベル — スクロール対象外、左に固定 */}
                    <div className="relative shrink-0 w-7" style={{ height: chartH }}>
                      {[yMax, Math.round(yMax / 2), 0].map(v => (
                        <span
                          key={v}
                          className="absolute right-0 text-sm text-[var(--color-subtext)] tabular-nums -translate-y-1/2"
                          style={{ top: yAt(v) }}
                        >
                          {v}
                        </span>
                      ))}
                    </div>

                    {/* チャート本体 — 横スクロール領域 */}
                    <div ref={trendScrollRef} className="flex-1 min-w-0 overflow-x-auto">
                      <div style={{ width: innerW }}>
                        <div className="relative" style={{ width: innerW, height: chartH }}>
                          <svg width={innerW} height={chartH} className="block overflow-visible">
                            {/* グリッドライン */}
                            {[0, 0.5, 1].map(f => (
                              <line key={f} x1={0} x2={innerW} y1={yAt(yMax * f)} y2={yAt(yMax * f)} stroke="#EBEBEB" strokeWidth="1" />
                            ))}
                            {/* 太めの線＋エリア塗り */}
                            <path d={areaD} fill="#111" fillOpacity="0.1" />
                            <path d={pathD} fill="none" stroke="#111" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
                            {/* ドット（訪問ありはリング付き、ゼロは小さい） */}
                            {pts.map((p, i) => (
                              p.count > 0 ? (
                                <g key={i}>
                                  <circle cx={p.x} cy={p.y} r="8" fill="#fff" />
                                  <circle cx={p.x} cy={p.y} r="5" fill="#111" />
                                </g>
                              ) : (
                                <circle key={i} cx={p.x} cy={p.y} r="3" fill="#D1D5DB" />
                              )
                            ))}
                          </svg>
                          {/* 値ラベル + 前月比 */}
                          <div className="absolute inset-0 pointer-events-none">
                            {pts.map((p, i) => {
                              if (p.count === 0) return null;
                              return (
                                <div
                                  key={i}
                                  className="absolute -translate-x-1/2 flex flex-col items-center whitespace-nowrap"
                                  style={{ left: p.x, top: Math.max(2, p.y - 48) }}
                                >
                                  <span className="text-xl font-black tabular-nums text-[#111] leading-none">
                                    {p.count}
                                  </span>
                                  {p.diff !== null && p.diff !== 0 && (
                                    <span className={`text-xs font-bold tabular-nums leading-none mt-0.5 ${
                                      p.diff > 0 ? 'text-emerald-600' : 'text-rose-600'
                                    }`}>
                                      {p.diff > 0 ? '+' : ''}{p.diff}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* X軸: 月ラベル — 訪問あり月は濃く、ゼロ月は薄く。1月は年も表示。 */}
                        <div className="relative h-10 mt-1" style={{ width: innerW }}>
                          {pts.map((p, i) => (
                            <div
                              key={i}
                              className="absolute -translate-x-1/2 flex flex-col items-center"
                              style={{ left: p.x }}
                            >
                              {p.month === 1 && (
                                <span className="text-[11px] text-[var(--color-subtext)] tabular-nums leading-none mb-1">
                                  {p.year}
                                </span>
                              )}
                              <span className={`tabular-nums whitespace-nowrap leading-none ${
                                p.count > 0 ? 'text-sm font-bold text-[#111]' : 'text-sm text-[#9CA3AF]'
                              }`}>
                                {p.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
              </div>
            </div>

            {/* 地区別タイル (md: 1 col / lg: 2 col)
                3列グリッドの単色タイル + カラードット。
                - 背景は共通の薄グレー、文字は黒 — 色情報は「地区名左のドット」だけに集約（うるさくならない）
                - 数字は「期間内に訪問したユニーク人数」を特大で表示（ジャンプ率を稼ぐ）
                - 9件を超えたら「続きを見る」で展開 */}
            {(() => {
              const allDistricts = Array.from(stats.districtStats.entries());
              // 訪問人数が多い順 → タイル位置も情報量と連動
              allDistricts.sort(([, a], [, b]) => b.visited - a.visited);
              const visibleDistricts = expandDistrict ? allDistricts : allDistricts.slice(0, 9);
              return (
                <div className="ios-card p-4 hover:!opacity-100 md:col-span-1 lg:col-span-2">
                  <div className="flex items-baseline gap-2 mb-2.5">
                    <div>
                      <h3 className="text-lg font-bold leading-tight">地区別</h3>
                      <p className="text-xs text-[var(--color-subtext)] mt-0.5">訪問済み人数 ／ 地区の総人数</p>
                    </div>
                    <span className="text-xs text-[var(--color-subtext)] ml-auto">全{allDistricts.length}地区</span>
                  </div>
                  {/* タイルは aspect-[2/1] の横長にして高さを削る。
                      名前と数字を横並びにすることで更にコンパクト化（ヒデさん要望: 縦幅30%ダウン） */}
                  <div className="grid grid-cols-3 gap-2">
                    {visibleDistricts.map(([district, data]) => {
                      const hex = DISTRICT_COLORS[district]?.hex ?? '#6B7280';
                      const short = district.replace(/豊岡部|光陽部|豊岡中央支部/g, '');
                      return (
                        <div
                          key={district}
                          className="rounded-xl px-3 py-2.5 flex flex-col justify-between aspect-[5/2] bg-[#F7F7F8] border border-[#EBEBEB]"
                        >
                          {/* 地区名 + カラードット（色はここだけ） */}
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: hex }} />
                            <span className="text-[13px] font-semibold text-[#111] truncate">{short}</span>
                          </div>
                          {/* 訪問人数 — でっかく、モノクロ */}
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black tabular-nums leading-none text-[#111]">
                              {data.visited}
                            </span>
                            <span className="text-[11px] font-medium tabular-nums text-[var(--color-subtext)]">
                              / {data.total}人
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {allDistricts.length > 9 && (
                    <div className="flex justify-center mt-3">
                      <button
                        onClick={() => setExpandDistrict(v => !v)}
                        aria-expanded={expandDistrict}
                        className="px-4 py-1.5 rounded-full border border-[#D1D5DB] text-[11px] text-[#6B7280] bg-white active:opacity-60 transition-opacity"
                      >
                        {expandDistrict ? '閉じる' : '続きを見る'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* メンバー訪問回数ランキング (md: 1 col / lg: 2 col) — 5件を超えたら「もっと見る」 */}
            {(() => {
              const ranked = members
                .filter(m => m.totalVisits > 0)
                .sort((a, b) => b.totalVisits - a.totalVisits)
                .slice(0, 5); // TOP5
              return (
                <div className="ios-card p-4 hover:!opacity-100 md:col-span-1 lg:col-span-2">
                  <div className="flex items-baseline gap-2 mb-2">
                    <div>
                      <h3 className="text-lg font-bold leading-tight">ランキング</h3>
                      <p className="text-xs text-[var(--color-subtext)] mt-0.5">訪問回数 TOP5（全期間）</p>
                    </div>
                  </div>
                  {/* 行の縦 padding を py-2 → py-1 に絞ることで、地区別カードと揃えて縦幅を30%ほどダウン */}
                  <div>
                    {ranked.map((m, i) => {
                      // TOP3 は金・銀・銅カラー、4〜5位はサブトーン
                      const isTop3 = i < 3;
                      const medalColor = i === 0 ? '#D97706' : i === 1 ? '#9CA3AF' : i === 2 ? '#B45309' : '#9CA3AF';
                      return (
                        <Link
                          key={m.id}
                          href={`/members/${m.id}`}
                          className="flex items-center gap-3 py-1.5 transition-opacity hover:opacity-70 border-b border-[#F0F0F0] last:border-b-0"
                        >
                          <span
                            className={`tabular-nums w-7 text-center shrink-0 leading-none ${isTop3 ? 'text-lg font-black' : 'text-sm font-bold'}`}
                            style={{ color: medalColor }}
                          >
                            {i + 1}
                          </span>
                          <span className="text-sm flex-1 truncate">{m.name}</span>
                          <span className="flex items-baseline gap-0.5">
                            <span className={`tabular-nums leading-none ${isTop3 ? 'text-lg font-black' : 'text-base font-bold'}`}>{m.totalVisits}</span>
                            <span className="text-[11px] text-[var(--color-subtext)]">回</span>
                          </span>
                        </Link>
                      );
                    })}
                    {ranked.length === 0 && (
                      <p className="text-sm text-[var(--color-subtext)] py-2">訪問実績のあるメンバーはまだおらん</p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 自動インサイト — 一番下、全幅 */}
            {insights.length > 0 && (
              <div className="md:col-span-2 lg:col-span-4 pt-2">
                <div className="px-1 mb-2">
                  <h3 className="text-lg font-bold leading-tight">ちょっと気になる動き</h3>
                  <p className="text-xs text-[var(--color-subtext)] mt-0.5">データから自動で見つけた気づき</p>
                </div>
                {/* スマホ・PCともに1列でフル幅 — 個々のインサイトにしっかり目が行くように */}
                <div className="flex flex-col gap-2">
                  {insights.map(i => {
                    const Icon = i.icon;
                    const toneClass =
                      i.tone === 'warn' ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : i.tone === 'good' ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-blue-50 border-blue-200 text-blue-800';
                    return (
                      <div key={i.key} className={`ios-card p-5 border flex items-start gap-3 hover:!opacity-100 ${toneClass}`}>
                        <Icon size={22} className="shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-bold">{i.title}</div>
                          <div className="text-sm mt-0.5 opacity-80">{i.body}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
