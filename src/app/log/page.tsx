'use client';

import { useEffect, useLayoutEffect, useState, useMemo, useRef } from 'react';
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

// 週の始まりを月曜に揃える（土日=週末として扱う）
// ヒデさんの運用：訪問は土日のみ、1週あたり3〜4人が目安 → 週単位で活動ペースを見る
function mondayOf(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}
function fmtDate(d: Date) { return d.toISOString().slice(0, 10); }
function emptyStatusCounts(): Record<VisitStatus, number> {
  return { met: 0, absent: 0, refused: 0, unknown_address: 0, moved: 0 };
}

type WeekBucket = {
  start: Date;
  startStr: string;
  counts: Record<VisitStatus, number>;
  total: number;
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
  // 1ヶ月あたりの横幅（デザインチューナーの --tune-trend-step で live 調整できる）
  const [trendStepPx, setTrendStepPx] = useState(120);

  useEffect(() => {
    Promise.all([getMembersWithVisitInfo(), getAllVisits()])
      .then(([m, v]) => { setMembers(m); setAllVisits(v); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 推移グラフの縦フィル：ラッパー高さを ResizeObserver で拾って chartH に反映。
  // これで右隣「割合」カードに高さが揃い、縦方向の余白が消える。
  // ついでにデザインチューナーの --tune-trend-step（ピクセル数）も読みに行く。
  useEffect(() => {
    const el = trendWrapRef.current;
    if (!el) return;
    const update = () => {
      const h = el.clientHeight;
      // X軸ラベル（h-10 + mt-1 = 約44px）を差し引いて、純粋なチャート高さとして使う
      const chartOnly = Math.max(150, h - 48);
      setTrendChartH(chartOnly);
      // CSS 変数から step 幅を取得（デザインチューナー反映用）
      const stepRaw = getComputedStyle(document.documentElement).getPropertyValue('--tune-trend-step').trim();
      const stepNum = stepRaw ? parseFloat(stepRaw) : NaN;
      if (!Number.isNaN(stepNum) && stepNum > 0) setTrendStepPx(stepNum);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // :root の style 属性（= CSS 変数変更）を監視して step 幅を追従
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
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

  // 直近12週の週別バケット — 「家庭訪問の継続率」カード用。
  // 週=月曜始まり。allVisits から 12 週分を集計し、各週のステータス別カウントを作る。
  // period タブ（1週/1ヶ月/...）とは独立で、常に直近12週を見せる。
  const weekly12 = useMemo<WeekBucket[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMon = mondayOf(today);
    const buckets: WeekBucket[] = [];
    for (let i = 11; i >= 0; i--) {
      const start = new Date(thisMon);
      start.setDate(thisMon.getDate() - i * 7);
      buckets.push({ start, startStr: fmtDate(start), counts: emptyStatusCounts(), total: 0 });
    }
    for (const v of allVisits) {
      const vMonStr = fmtDate(mondayOf(new Date(v.visitedAt)));
      const b = buckets.find(b => b.startStr === vMonStr);
      if (b) { b.counts[v.status]++; b.total++; }
    }
    return buckets;
  }, [allVisits]);

  // (旧: 連続週数 streakWeeks は「家庭訪問の回数」カードへの仕様変更で参照されなく
  //  なったため削除した。再度連続週数を見せたくなったら、単純に
  //  weekly12 を末尾から走査するだけで再現できる)

  // 直近12週の手応え内訳（ステータス別カウント合計）— スタックバーとレジェンドで使う
  const continuityStats = useMemo(() => {
    const counts = emptyStatusCounts();
    for (const w of weekly12) {
      for (const s of Object.keys(counts) as VisitStatus[]) counts[s] += w.counts[s];
    }
    const total = (Object.values(counts) as number[]).reduce((a, b) => a + b, 0);
    const metRate = total > 0 ? Math.round((counts.met / total) * 100) : 0;
    return { counts, total, metRate };
  }, [weekly12]);

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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--color-subtext)]">読み込み中...</p>
      </div>
    );
  }

  const maxBucketCount = Math.max(1, ...timeSeries.buckets.map(b => b.count));

  return (
    <div className="absolute inset-0 flex flex-col bg-[var(--color-bg)]">
      <div className="ios-nav px-4 py-3">
        <h1 className="text-xl font-bold text-center">ダッシュボード</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div
          className="max-w-[1366px] mx-auto px-4"
          style={{
            paddingTop: 'var(--tune-section-pad-top, 0.75rem)',
            paddingBottom: 'calc(60px + env(safe-area-inset-bottom) + 16px)',
          }}
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
              各カードに md: / lg: の col-span を付けてサイズを可変にする。
              gap はチューナーで可変にする（--tune-card-gap） */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
            style={{ gap: 'var(--tune-card-gap, 1rem)' }}
          >

            {/* 家庭訪問の回数カード
                - Hero：これまでの累計訪問回数（全期間 / softDelete 除く）
                - 補助：うち今週の回数
                - 12週バー：1週間ごとの訪問回数を縦棒で見せる(数字付き)
                - 最下段：12週合計のステータス内訳と「会えた率」
                - period タブとは独立で、常に直近12週 + 累計を見せる */}
            <div
              className="ios-card hover:!opacity-100 md:col-span-2 lg:col-span-2 flex flex-col"
              style={{ padding: 'var(--tune-card-pad, 2.125rem)' }}
            >
              {(() => {
                const order: VisitStatus[] = ['met', 'absent', 'refused', 'unknown_address', 'moved'];
                // 4アンカー：index → ラベル
                const anchors: Record<number, string> = { 0: '12週前', 4: '8週前', 8: '4週前', 11: '今週' };
                const { counts, total, metRate } = continuityStats;

                // 累計訪問週数 = 訪問が 1 件以上あった「週」の数(月曜始まり、ユニーク)。
                // 仕様: 同じ週に何人回っても 1 とカウント。1 週 = 1 回。
                const visitWeekSet = new Set<string>();
                for (const v of allVisits) visitWeekSet.add(fmtDate(mondayOf(new Date(v.visitedAt))));
                const totalVisitWeekCount = visitWeekSet.size;
                // バーの最大値(最低 1 で割り算事故防止)
                const maxWeekCount = Math.max(1, ...weekly12.map(w => w.total));
                // 今週も訪問あったか(サブタイトル横の補助表示用)
                const thisWeekVisited = (weekly12[weekly12.length - 1]?.total ?? 0) > 0;

                return (
                  <>
                    {/* ヘッダー：左=タイトル、右=累計回数 Hero
                        ※ ここで「回数」= 訪問のあった週の数(1 週 = 1 回)
                          → 同じ週に何人回っても 1 として数える */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold leading-tight">家庭訪問の回数</h3>
                        {/* サブタイトル本文(「1 週間を 1 回としてカウント」)はヒデさん要望で削除。
                            今週訪問あった時だけ、緑の補助表記として「今週も訪問済み」を出す。 */}
                        {thisWeekVisited && (
                          <p className="text-xs mt-0.5 text-[#10B981] font-bold">今週も訪問済み</p>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1">
                        {/* font-extrabold(800) + letter-spacing は CSS 変数で
                            DesignTuner から目視で詰められるようにしてある。
                            (tracking-tight クラスは外して var を優先) */}
                        <span
                          className="font-extrabold tabular-nums leading-none text-[#111]"
                          style={{
                            fontSize: 'var(--tune-hero-size, 4rem)',
                            // ヒデさん目視で -0.06em に確定(2026-04-25)
                            letterSpacing: 'var(--tune-hero-tracking, -0.06em)',
                          }}
                        >
                          {totalVisitWeekCount}
                        </span>
                        <span className="text-sm font-bold text-[#111]">回</span>
                      </div>
                    </div>

                    {/* 12週バー：各週の訪問回数を縦棒で表示。
                        高さは「今期間内の最大週」を満タンとして相対表示。
                        (旧: 今週バーに黒枠付けてたが、ヒデさん要望でやめた) */}
                    <div className="mb-3">
                      <div className="flex items-end gap-1 mb-1.5" style={{ height: '64px' }}>
                        {weekly12.map((w, i) => {
                          const hit = w.total > 0;
                          // 0 件は最小高さで「枠だけ」見せる、1 件以上は比率
                          const heightPct = hit ? Math.max(20, (w.total / maxWeekCount) * 100) : 8;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                              {/* 数字 — 訪問あった週のみ */}
                              {hit && (
                                <span className="text-[10px] tabular-nums font-bold text-[#111] leading-none mb-0.5">
                                  {w.total}
                                </span>
                              )}
                              <div
                                className="w-full rounded-t"
                                style={{
                                  height: `${heightPct}%`,
                                  backgroundColor: hit ? '#10B981' : '#F3F4F6',
                                }}
                                title={`${w.startStr}〜 ${w.total}回`}
                              />
                            </div>
                          );
                        })}
                      </div>
                      {/* アンカーラベル：12週前 / 8週前 / 4週前 / 今週 + 日付
                          フォントは 1 段階下げ済み(black→extrabold / bold→semibold) */}
                      <div className="flex items-start gap-1">
                        {weekly12.map((w, i) => {
                          const label = anchors[i];
                          const isCur = i === weekly12.length - 1;
                          if (!label) return <div key={i} className="flex-1" />;
                          return (
                            <div key={i} className="flex-1 text-center">
                              <div className="flex flex-col items-center">
                                <span
                                  className={`text-[10px] leading-none ${isCur ? 'font-extrabold text-[#111]' : 'font-semibold text-[var(--color-subtext)]'}`}
                                >
                                  {label}
                                </span>
                                <span className="text-[9px] tabular-nums text-[var(--color-subtext)] leading-none mt-0.5">
                                  {w.start.getMonth() + 1}/{w.start.getDate()}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 手応え内訳（12週合計）— mt-auto で下付け */}
                    <div className="mt-auto">
                      {total === 0 ? (
                        <p className="text-sm text-[var(--color-subtext)] py-4 text-center">直近12週の訪問はまだないで</p>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] text-[var(--color-subtext)]">カテゴリ別割合</span>
                            <span className="text-[12px] font-bold">会えた率 {metRate}%</span>
                          </div>
                          {/* スタックバー */}
                          <div
                            className="flex rounded-full overflow-hidden bg-[#F3F4F6]"
                            style={{ height: 'var(--tune-bar-h, 3rem)' }}
                          >
                            {order.map(status => {
                              const c = counts[status];
                              if (c === 0) return null;
                              const pct = (c / total) * 100;
                              return (
                                <div
                                  key={status}
                                  className="h-full transition-[width] duration-500"
                                  style={{ width: `${pct}%`, backgroundColor: STATUS_HEX[status] }}
                                  title={`${VISIT_STATUS_CONFIG[status].label}: ${c}件`}
                                />
                              );
                            })}
                          </div>
                          {/* レジェンド */}
                          <div
                            className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-4"
                            style={{ rowGap: 'var(--tune-legend-gap-y, 0rem)' }}
                          >
                            {order.map(status => {
                              const c = counts[status];
                              const hex = STATUS_HEX[status];
                              return (
                                <div key={status} className="flex items-center gap-2 min-w-0">
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: hex }} />
                                  <span className="text-[13px] truncate flex-1 text-[var(--color-subtext)]">
                                    {VISIT_STATUS_CONFIG[status].label}
                                  </span>
                                  <span
                                    className="text-base font-black tabular-nums"
                                    style={{ color: c > 0 ? '#111' : '#D1D5DB' }}
                                  >
                                    {c}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* 月別訪問人数の年間推移 (md: 2 col 全幅 / lg: 2 col = 半分)
                PCではステータスドーナツと横並び → グラフ幅が詰まるので横スクロール対応。
                デフォルトは右端(最新月)にスクロールしておく。
                縦はグリッドで割合カードと同じ高さに stretch、中身は flex-1 でフィル。 */}
            <div
              className="ios-card hover:!opacity-100 md:col-span-2 lg:col-span-2 flex flex-col"
              style={{ padding: 'var(--tune-card-pad, 2.125rem)' }}
            >
              <div className="mb-2.5">
                <h3 className="text-lg font-bold leading-tight">訪問人数の推移</h3>
                <p className="text-xs text-[var(--color-subtext)] mt-0.5">
                  直近{timeSeries.monthCount}ヶ月（月ごとのユニーク人数）
                </p>
              </div>
              <div
                ref={trendWrapRef}
                className="flex-1"
                style={{ minHeight: 'var(--tune-trend-min-h, 280px)' }}
              >
              {(() => {
                // ─── 案C (3ヶ月ズーム) ───
                // - 初期表示は3ヶ月が画面内に収まる幅（現在月を右端・前2ヶ月を同時表示）
                // - 横スクロールで12ヶ月まで見返せる
                // - Y軸は左に固定、グラフ本体のみスクロール
                // - 各ポイントに「人数」と「前月比(+2/-1)」を大きく表示
                const buckets = timeSeries.buckets;
                const yMax = Math.max(6, maxBucketCount);
                const chartH = trendChartH;   // 親カードの高さにフィットさせる可変値
                const stepPx = trendStepPx;   // 1ヶ月あたりの横幅（デザインチューナーで調整可）
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
                <div
                  className="ios-card hover:!opacity-100 md:col-span-1 lg:col-span-2"
                  style={{ padding: 'var(--tune-card-pad, 2.125rem)' }}
                >
                  <div className="flex items-baseline gap-2 mb-2.5">
                    <div>
                      <h3 className="text-lg font-bold leading-tight">地区別</h3>
                      <p className="text-xs text-[var(--color-subtext)] mt-0.5">訪問済み人数 ／ 地区の総人数</p>
                    </div>
                    <span className="text-xs text-[var(--color-subtext)] ml-auto">全{allDistricts.length}地区</span>
                  </div>
                  {/* タイルの aspect・gap・数字サイズは全部チューナーで可変 */}
                  <div
                    className="grid grid-cols-3"
                    style={{ gap: 'var(--tune-district-gap, 0.5rem)' }}
                  >
                    {visibleDistricts.map(([district, data]) => {
                      const hex = DISTRICT_COLORS[district]?.hex ?? '#6B7280';
                      const short = district.replace(/豊岡部|光陽部|豊岡中央支部/g, '');
                      return (
                        <div
                          key={district}
                          className="rounded-xl px-3 py-2.5 flex flex-col justify-between bg-[#F7F7F8] border border-[#EBEBEB]"
                          style={{ aspectRatio: 'var(--tune-district-aspect, 2.3)' }}
                        >
                          {/* 地区名 + カラードット（色はここだけ） */}
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: hex }} />
                            <span className="text-[13px] font-semibold text-[#111] truncate">{short}</span>
                          </div>
                          {/* 訪問人数 — サイズはチューナーで調整 */}
                          <div className="flex items-baseline gap-1">
                            <span
                              className="font-black tabular-nums leading-none text-[#111]"
                              style={{ fontSize: 'var(--tune-district-num, 1.875rem)' }}
                            >
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
                <div
                  className="ios-card hover:!opacity-100 md:col-span-1 lg:col-span-2"
                  style={{ padding: 'var(--tune-card-pad, 2.125rem)' }}
                >
                  <div className="flex items-baseline gap-2 mb-2">
                    <div>
                      <h3 className="text-lg font-bold leading-tight">ランキング</h3>
                      <p className="text-xs text-[var(--color-subtext)] mt-0.5">訪問回数 TOP5（全期間）</p>
                    </div>
                  </div>
                  {/* 行の縦 padding はチューナーで可変（地区別カードとの縦幅バランス調整用） */}
                  <div>
                    {ranked.map((m, i) => {
                      // TOP3 は金・銀・銅カラー、4〜5位はサブトーン。フォントサイズは1〜5位で統一。
                      const medalColor = i === 0 ? '#D97706' : i === 1 ? '#9CA3AF' : i === 2 ? '#B45309' : '#9CA3AF';
                      return (
                        <Link
                          key={m.id}
                          href={`/members/${m.id}`}
                          className="flex items-center gap-3 transition-opacity hover:opacity-70 border-b border-[#F0F0F0] last:border-b-0"
                          style={{
                            paddingTop: 'var(--tune-ranking-row-pad, 0.725rem)',
                            paddingBottom: 'var(--tune-ranking-row-pad, 0.725rem)',
                          }}
                        >
                          <span
                            className="tabular-nums w-7 text-center shrink-0 leading-none font-black"
                            style={{
                              color: medalColor,
                              fontSize: 'var(--tune-ranking-num, 1.5rem)',
                            }}
                          >
                            {i + 1}
                          </span>
                          <span
                            className="flex-1 truncate"
                            style={{ fontSize: 'var(--tune-ranking-name, 0.875rem)' }}
                          >
                            {m.name}
                          </span>
                          <span className="flex items-baseline gap-0.5">
                            <span
                              className="tabular-nums leading-none font-black"
                              style={{ fontSize: 'var(--tune-ranking-num, 1.5rem)' }}
                            >
                              {m.totalVisits}
                            </span>
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

          </div>
        </div>
      </div>
    </div>
  );
}
