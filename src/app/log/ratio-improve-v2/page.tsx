'use client';

// 会えた率カード 改善案 v2 — 10案モック
// URL: /log/ratio-improve-v2
//
// ヒデさんの要件アップデート:
//   - 家庭訪問は土日のみ、1週あたり3〜4人が目安
//   - 「継続できてるか」の視点が欲しい → 週次継続率・連続週数が主役
//   - 会えた/不在/転居 の内訳も総合的に見えること
//
// 上から10案を並べて比較。各案は同じデータソースを使う。

import { useEffect, useState, useMemo } from 'react';
import { Flame, Target, TrendingUp, Calendar, Award, ArrowRight } from 'lucide-react';
import type { Visit, VisitStatus } from '../../../lib/types';
import { getAllVisits } from '../../../lib/storage';
import { VISIT_STATUS_CONFIG } from '../../../lib/constants';

const STATUS_HEX: Record<VisitStatus, string> = {
  met: '#10B981',
  absent: '#6B7280',
  refused: '#EF4444',
  unknown_address: '#F59E0B',
  moved: '#8B5CF6',
};

const ORDER: VisitStatus[] = ['met', 'absent', 'refused', 'unknown_address', 'moved'];

// 週の始まりを月曜に揃える（土日=週末として扱う）
function mondayOf(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function fmt(d: Date) {
  return d.toISOString().slice(0, 10);
}

type WeekBucket = {
  start: Date;
  startStr: string;
  visits: Visit[];
  members: Set<string>;
  counts: Record<VisitStatus, number>;
  total: number;
  metRate: number;
};

function emptyCounts(): Record<VisitStatus, number> {
  return { met: 0, absent: 0, refused: 0, unknown_address: 0, moved: 0 };
}

export default function RatioImproveV2Page() {
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllVisits().then(setAllVisits).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // 直近12週のバケット
  const weekly = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMon = mondayOf(today);
    const buckets: WeekBucket[] = [];
    for (let i = 11; i >= 0; i--) {
      const start = new Date(thisMon);
      start.setDate(thisMon.getDate() - i * 7);
      buckets.push({
        start,
        startStr: fmt(start),
        visits: [],
        members: new Set(),
        counts: emptyCounts(),
        total: 0,
        metRate: 0,
      });
    }
    for (const v of allVisits) {
      const vd = new Date(v.visitedAt);
      const vMon = mondayOf(vd);
      const vMonStr = fmt(vMon);
      const b = buckets.find(b => b.startStr === vMonStr);
      if (b) {
        b.visits.push(v);
        b.members.add(v.memberId);
        b.counts[v.status]++;
      }
    }
    for (const b of buckets) {
      b.total = b.visits.length;
      b.metRate = b.total > 0 ? Math.round((b.counts.met / b.total) * 100) : 0;
    }
    // データが薄いとモックとして寂しいのでダミー補完
    const allEmpty = buckets.every(b => b.total === 0);
    if (allEmpty) {
      const seed = [3, 4, 3, 0, 4, 3, 4, 2, 3, 4, 3, 3]; // 12週分
      const metSeed = [2, 3, 2, 0, 3, 2, 4, 2, 2, 3, 2, 2];
      buckets.forEach((b, i) => {
        b.total = seed[i];
        b.counts.met = metSeed[i];
        b.counts.absent = Math.max(0, seed[i] - metSeed[i] - (i % 4 === 0 ? 1 : 0));
        b.counts.refused = 0;
        b.counts.unknown_address = 0;
        b.counts.moved = i % 4 === 0 ? 1 : 0;
        b.metRate = b.total > 0 ? Math.round((b.counts.met / b.total) * 100) : 0;
        // visits/members はモック用なので空でOK
      });
    }
    return buckets;
  }, [allVisits]);

  // 全期間の総合統計
  const overall = useMemo(() => {
    const counts = emptyCounts();
    for (const w of weekly) {
      for (const s of ORDER) counts[s] += w.counts[s];
    }
    const total = ORDER.reduce((a, s) => a + counts[s], 0);
    const metRate = total > 0 ? Math.round((counts.met / total) * 100) : 0;
    return { counts, total, metRate };
  }, [weekly]);

  // 連続訪問週数（今週or先週から遡って何週連続で訪問があるか）
  const streakWeeks = useMemo(() => {
    let count = 0;
    // 今週が 0 でも、先週以前から遡って見る（土日まだ来てない場合を配慮）
    for (let i = weekly.length - 1; i >= 0; i--) {
      if (weekly[i].total > 0) count++;
      else if (i === weekly.length - 1) continue; // 今週だけは 0 許容
      else break;
    }
    return count;
  }, [weekly]);

  // 直近12週の週達成率（>=1人訪問があった週の割合）
  const weekAchievement = useMemo(() => {
    const done = weekly.filter(w => w.total > 0).length;
    return Math.round((done / weekly.length) * 100);
  }, [weekly]);

  // 週目標達成率（3人以上訪問した週の割合）
  const targetAchievement = useMemo(() => {
    const done = weekly.filter(w => w.total >= 3).length;
    return Math.round((done / weekly.length) * 100);
  }, [weekly]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--color-subtext)]">読み込み中...</p>
      </div>
    );
  }

  const ctx: CardCtx = { weekly, overall, streakWeeks, weekAchievement, targetAchievement };

  return (
    <div className="absolute inset-0 flex flex-col bg-[var(--color-bg)]">
      <div className="ios-nav px-4 py-3">
        <h1 className="text-xl font-bold text-center">継続率 × 会えた率 10案</h1>
        <p className="text-[11px] text-center text-[var(--color-subtext)] mt-0.5">
          土日3〜4人ペースの継続度合いを見える化
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div
          className="max-w-[720px] mx-auto px-4 flex flex-col gap-4"
          style={{ paddingTop: '0.75rem', paddingBottom: 'calc(60px + env(safe-area-inset-bottom) + 16px)' }}
        >
          <Frame n="①" t="週次ストリーク + 手応え" d="連続週数をHero、12週ドット、下に手応えスタック">
            <Card1 {...ctx} />
          </Frame>
          <Frame n="②" t="土日カレンダー" d="2ヶ月分カレンダー。土日だけ色分け、訪問済みは緑">
            <Card2 {...ctx} />
          </Frame>
          <Frame n="③" t="週達成率ゲージ + 会えた率" d="直近12週の達成率をゲージで、会えた率をサブで">
            <Card3 {...ctx} />
          </Frame>
          <Frame n="④" t="二段Hero（継続率→会えた率）" d="継続率と会えた率を上下二段で両方主役に">
            <Card4 {...ctx} />
          </Frame>
          <Frame n="⑤" t="週次スタックバー" d="直近12週の人数を色分け棒グラフで。目標3人ラインも表示">
            <Card5 {...ctx} />
          </Frame>
          <Frame n="⑥" t="目標プログレス三段" d="今週/今月/直近12週の目標達成度を三段重ねで">
            <Card6 {...ctx} />
          </Frame>
          <Frame n="⑦" t="月×週ヒートマップ" d="月ごと×週番号のマス目。色濃度で活動量">
            <Card7 {...ctx} />
          </Frame>
          <Frame n="⑧" t="週次リスト型" d="直近12週を縦リストで、各週に人数と手応えを表示">
            <Card8 {...ctx} />
          </Frame>
          <Frame n="⑨" t="タイムライン（訪問者ドット）" d="12週を横並びで、1人1ドット・色で手応えを表現">
            <Card9 {...ctx} />
          </Frame>
          <Frame n="⑩" t="スコアカード4象限" d="今週/月間/連続/会えた率を4分割で並列表示">
            <Card10 {...ctx} />
          </Frame>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// 型 & 共通部品
// ─────────────────────────────────────────
type CardCtx = {
  weekly: WeekBucket[];
  overall: { counts: Record<VisitStatus, number>; total: number; metRate: number };
  streakWeeks: number;
  weekAchievement: number;      // 直近12週で訪問ありの週の割合
  targetAchievement: number;    // 直近12週で3人以上の週の割合
};

function Frame({ n, t, d, children }: { n: string; t: string; d: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-1 flex items-baseline gap-2 px-1">
        <span className="text-base font-black tabular-nums">{n}</span>
        <h2 className="text-sm font-bold">{t}</h2>
      </div>
      <p className="text-[11px] text-[var(--color-subtext)] mb-2 px-1">{d}</p>
      {children}
    </section>
  );
}

function Legend({ counts }: { counts: Record<VisitStatus, number> }) {
  return (
    <div className="mt-auto pt-3 grid grid-cols-3 gap-x-4 gap-y-1">
      {ORDER.map(s => {
        const c = counts[s];
        return (
          <div key={s} className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_HEX[s] }} />
            <span className="text-[12px] truncate flex-1 text-[var(--color-subtext)]">{VISIT_STATUS_CONFIG[s].label}</span>
            <span className="text-[13px] font-black tabular-nums" style={{ color: c > 0 ? '#111' : '#D1D5DB' }}>{c}</span>
          </div>
        );
      })}
    </div>
  );
}

function StackBar({ counts, total, height = '0.75rem' }: { counts: Record<VisitStatus, number>; total: number; height?: string }) {
  return (
    <div className="flex rounded-full overflow-hidden bg-[#F3F4F6]" style={{ height }}>
      {ORDER.map(s => {
        const c = counts[s];
        if (c === 0 || total === 0) return null;
        return <div key={s} style={{ width: `${(c / total) * 100}%`, backgroundColor: STATUS_HEX[s] }} />;
      })}
    </div>
  );
}

const CARD_PAD = '1.75rem';

// ─────────────────────────────────────────
// ① 週次ストリーク + 手応え
// ─────────────────────────────────────────
function Card1({ weekly, overall, streakWeeks, weekAchievement }: CardCtx) {
  return (
    <div className="ios-card flex flex-col" style={{ padding: CARD_PAD }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold leading-tight">家庭訪問の継続率</h3>
          <p className="text-xs text-[var(--color-subtext)] mt-0.5">直近12週の活動ペース</p>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-black tabular-nums leading-none text-orange-600" style={{ fontSize: '3rem' }}>{streakWeeks}</span>
          <span className="text-sm font-bold text-orange-600">週連続</span>
        </div>
      </div>

      {/* 12週ドット */}
      <div className="mb-3">
        <div className="flex items-center gap-1 mb-1">
          {weekly.map((w, i) => {
            const hit = w.total > 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className="w-full rounded"
                  style={{
                    aspectRatio: '1',
                    backgroundColor: hit ? '#10B981' : '#F3F4F6',
                    border: i === weekly.length - 1 ? '2px solid #111' : 'none',
                  }}
                  title={`${w.startStr}〜 ${w.total}人`}
                />
                {i === weekly.length - 1 && (
                  <span className="text-[9px] font-bold text-[#111]">今週</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[10px] text-[var(--color-subtext)]">
          <span>12週前</span>
          <span className="font-bold text-[#111]">達成 {weekAchievement}%</span>
        </div>
      </div>

      {/* 手応え内訳 */}
      <div className="mb-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-[var(--color-subtext)]">全{overall.total}件の手応え</span>
          <span className="text-[12px] font-bold">会えた率 {overall.metRate}%</span>
        </div>
        <StackBar counts={overall.counts} total={overall.total} />
      </div>

      <Legend counts={overall.counts} />
    </div>
  );
}

// ─────────────────────────────────────────
// ② 土日カレンダー（2ヶ月分）
// ─────────────────────────────────────────
function Card2({ weekly, overall }: CardCtx) {
  // 現在月と先月のカレンダーを組み立て
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 週開始 → 訪問人数のマップ（土日にその週の総数を割り振る想定で使う）
  const weekMap = new Map(weekly.map(w => [w.startStr, w]));

  function buildMonth(offset: number) {
    const base = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const year = base.getFullYear(), month = base.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    // 月曜始まりカレンダーの先頭空白
    const startPad = (firstDay.getDay() + 6) % 7; // 月=0..日=6
    const cells: ({ day: number; date: string; isWeekend: boolean; hasVisit: boolean } | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dow = date.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const dateStr = fmt(date);
      const weekStart = fmt(mondayOf(date));
      const hasVisit = isWeekend && (weekMap.get(weekStart)?.total ?? 0) > 0;
      cells.push({ day: d, date: dateStr, isWeekend, hasVisit });
    }
    return { year, month: month + 1, cells };
  }

  const months = [buildMonth(-1), buildMonth(0)];

  return (
    <div className="ios-card flex flex-col" style={{ padding: CARD_PAD }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold leading-tight">土日の活動カレンダー</h3>
          <p className="text-xs text-[var(--color-subtext)] mt-0.5">訪問した土日が緑、未実施は赤枠</p>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-black tabular-nums leading-none text-[#111]" style={{ fontSize: '2.25rem' }}>{overall.metRate}</span>
          <span className="text-base font-bold text-[#111]">%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {months.map(m => (
          <div key={`${m.year}-${m.month}`}>
            <div className="text-[12px] font-bold text-center mb-1">{m.year}年 {m.month}月</div>
            <div className="grid grid-cols-7 gap-[3px] text-[9px] text-[var(--color-subtext)] text-center font-bold mb-0.5">
              {['月', '火', '水', '木', '金', '土', '日'].map(d => <span key={d}>{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-[3px]">
              {m.cells.map((c, i) => {
                if (!c) return <span key={i} />;
                const bg = !c.isWeekend ? '#FAFAFA'
                  : c.hasVisit ? '#10B981'
                  : '#FEE2E2';
                const color = !c.isWeekend ? '#D1D5DB'
                  : c.hasVisit ? '#fff'
                  : '#EF4444';
                const border = c.isWeekend && !c.hasVisit ? '1px solid #FCA5A5' : 'none';
                return (
                  <div
                    key={i}
                    className="flex items-center justify-center text-[10px] font-bold rounded"
                    style={{ aspectRatio: '1', backgroundColor: bg, color, border }}
                  >
                    {c.day}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <StackBar counts={overall.counts} total={overall.total} />
      <Legend counts={overall.counts} />
    </div>
  );
}

// ─────────────────────────────────────────
// ③ 週達成率ゲージ + 会えた率
// ─────────────────────────────────────────
function Card3({ weekly, overall, weekAchievement, targetAchievement }: CardCtx) {
  // 半円ゲージ
  const size = 180, stroke = 18;
  const cx = size / 2, cy = size - 10;
  const r = cx - stroke / 2 - 4;
  const arcLen = Math.PI * r;
  const progress = (weekAchievement / 100) * arcLen;
  // 半円をpathで描く
  const startX = cx - r, startY = cy;
  const endX = cx + r, endY = cy;
  const dBg = `M ${startX} ${startY} A ${r} ${r} 0 0 1 ${endX} ${endY}`;

  return (
    <div className="ios-card flex flex-col" style={{ padding: CARD_PAD }}>
      <div className="mb-3">
        <h3 className="text-lg font-bold leading-tight">週次継続率</h3>
        <p className="text-xs text-[var(--color-subtext)] mt-0.5">直近12週のうち訪問できた週の割合</p>
      </div>

      {/* ゲージ */}
      <div className="flex items-center justify-center relative" style={{ height: cy + 10 }}>
        <svg width={size} height={cy + 10} className="block">
          <path d={dBg} fill="none" stroke="#F3F4F6" strokeWidth={stroke} strokeLinecap="round" />
          <path
            d={dBg} fill="none" stroke="#10B981" strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${progress} ${arcLen - progress}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <div className="flex items-baseline gap-0.5">
            <span className="font-black tabular-nums leading-none text-[#111]" style={{ fontSize: '3.25rem' }}>{weekAchievement}</span>
            <span className="text-xl font-bold text-[#111]">%</span>
          </div>
          <span className="text-[11px] text-[var(--color-subtext)]">12週中 {weekly.filter(w => w.total > 0).length}週達成</span>
        </div>
      </div>

      {/* サブ指標：目標達成率 + 会えた率 */}
      <div className="grid grid-cols-2 gap-3 mt-2 mb-3">
        <div className="rounded-xl bg-[#F7F7F8] px-3 py-2">
          <div className="text-[11px] text-[var(--color-subtext)]">3人以上の週</div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl font-black tabular-nums text-[#111]">{targetAchievement}</span>
            <span className="text-sm font-bold">%</span>
          </div>
        </div>
        <div className="rounded-xl bg-[#F7F7F8] px-3 py-2">
          <div className="text-[11px] text-[var(--color-subtext)]">会えた率</div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl font-black tabular-nums text-[#111]">{overall.metRate}</span>
            <span className="text-sm font-bold">%</span>
          </div>
        </div>
      </div>

      <StackBar counts={overall.counts} total={overall.total} />
      <Legend counts={overall.counts} />
    </div>
  );
}

// ─────────────────────────────────────────
// ④ 二段Hero（継続率 + 会えた率）
// ─────────────────────────────────────────
function Card4({ weekly, overall, weekAchievement, streakWeeks }: CardCtx) {
  return (
    <div className="ios-card flex flex-col" style={{ padding: CARD_PAD }}>
      <h3 className="text-lg font-bold leading-tight mb-2">家庭訪問サマリー</h3>

      {/* 上段: 継続率 Hero */}
      <div className="rounded-2xl border border-[#EBEBEB] bg-white px-4 py-3 mb-2">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-[var(--color-subtext)]">継続率</div>
            <div className="flex items-baseline gap-1">
              <span className="font-black tabular-nums leading-none text-[#111]" style={{ fontSize: '2.5rem' }}>{weekAchievement}</span>
              <span className="text-lg font-bold">%</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-orange-600 font-bold">
              <Flame size={11} />
              {streakWeeks}週連続
            </div>
          </div>
          {/* 12週ミニドット */}
          <div className="grid grid-cols-6 gap-0.5 w-32">
            {weekly.map((w, i) => (
              <div
                key={i}
                className="rounded-sm"
                style={{ aspectRatio: '1', backgroundColor: w.total > 0 ? '#10B981' : '#F3F4F6' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 下段: 会えた率 Hero */}
      <div className="rounded-2xl border border-[#EBEBEB] bg-white px-4 py-3 mb-3">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-xs text-[var(--color-subtext)]">会えた率（全{overall.total}件）</div>
            <div className="flex items-baseline gap-1">
              <span className="font-black tabular-nums leading-none text-[#111]" style={{ fontSize: '2.5rem' }}>{overall.metRate}</span>
              <span className="text-lg font-bold">%</span>
            </div>
          </div>
        </div>
        <StackBar counts={overall.counts} total={overall.total} />
      </div>

      <Legend counts={overall.counts} />
    </div>
  );
}

// ─────────────────────────────────────────
// ⑤ 週次スタックバー（12週）
// ─────────────────────────────────────────
function Card5({ weekly, overall, weekAchievement }: CardCtx) {
  const maxTotal = Math.max(4, ...weekly.map(w => w.total));
  const chartH = 100;

  return (
    <div className="ios-card flex flex-col" style={{ padding: CARD_PAD }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold leading-tight">週次活動ペース</h3>
          <p className="text-xs text-[var(--color-subtext)] mt-0.5">直近12週 / 目標3人以上（青点線）</p>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-[var(--color-subtext)]">継続率</div>
          <div className="flex items-baseline gap-0.5 justify-end">
            <span className="text-2xl font-black tabular-nums text-[#111]">{weekAchievement}</span>
            <span className="text-sm font-bold">%</span>
          </div>
        </div>
      </div>

      {/* バーチャート */}
      <div className="relative mb-3" style={{ height: chartH + 20 }}>
        {/* 目標ライン (3人) */}
        <div
          className="absolute left-0 right-0 border-t-2 border-dashed border-blue-400 z-10"
          style={{ top: chartH - (3 / maxTotal) * chartH }}
        >
          <span className="absolute -top-4 right-0 text-[9px] font-bold text-blue-500">目標3人</span>
        </div>

        <div className="flex items-end gap-1 h-[100px]">
          {weekly.map((w, i) => {
            const barH = (w.total / maxTotal) * chartH;
            const isCur = i === weekly.length - 1;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
                <div className="text-[9px] font-bold tabular-nums text-[#111]">{w.total > 0 ? w.total : ''}</div>
                <div
                  className="w-full rounded-t flex flex-col-reverse overflow-hidden"
                  style={{ height: Math.max(2, barH), minHeight: w.total > 0 ? 3 : 2, backgroundColor: w.total === 0 ? '#F3F4F6' : 'transparent', border: isCur ? '1.5px solid #111' : 'none' }}
                >
                  {ORDER.map(s => {
                    const c = w.counts[s];
                    if (c === 0) return null;
                    const hPct = (c / (w.total || 1)) * 100;
                    return <div key={s} style={{ height: `${hPct}%`, backgroundColor: STATUS_HEX[s] }} />;
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* X軸：数週前 / 今週 */}
        <div className="flex items-start gap-1 mt-1">
          {weekly.map((_, i) => (
            <div key={i} className="flex-1 text-center">
              {i === 0 && <span className="text-[9px] text-[var(--color-subtext)]">12週前</span>}
              {i === weekly.length - 1 && <span className="text-[9px] font-bold">今週</span>}
            </div>
          ))}
        </div>
      </div>

      <Legend counts={overall.counts} />
    </div>
  );
}

// ─────────────────────────────────────────
// ⑥ 目標プログレス三段
// ─────────────────────────────────────────
function Card6({ weekly, overall, weekAchievement }: CardCtx) {
  const thisWeek = weekly[weekly.length - 1];
  const weekGoal = 4;
  const weekProgress = Math.min(1, thisWeek.total / weekGoal);

  // 今月 (当月の weekly.total 合計)
  const today = new Date();
  const thisMonthNum = today.getMonth();
  const thisYear = today.getFullYear();
  const monthTotal = weekly
    .filter(w => w.start.getFullYear() === thisYear && w.start.getMonth() === thisMonthNum)
    .reduce((a, b) => a + b.total, 0);
  const monthGoal = 16;
  const monthProgress = Math.min(1, monthTotal / monthGoal);

  // 12週合計
  const quarterTotal = weekly.reduce((a, b) => a + b.total, 0);
  const quarterGoal = 48;
  const quarterProgress = Math.min(1, quarterTotal / quarterGoal);

  type Row = { label: string; cur: number; goal: number; prog: number; emoji: string };
  const rows: Row[] = [
    { label: '今週', cur: thisWeek.total, goal: weekGoal, prog: weekProgress, emoji: '📍' },
    { label: '今月', cur: monthTotal, goal: monthGoal, prog: monthProgress, emoji: '📅' },
    { label: '直近12週', cur: quarterTotal, goal: quarterGoal, prog: quarterProgress, emoji: '🎯' },
  ];

  return (
    <div className="ios-card flex flex-col" style={{ padding: CARD_PAD }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold leading-tight">目標達成プログレス</h3>
          <p className="text-xs text-[var(--color-subtext)] mt-0.5">週4人ペースでの達成度</p>
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className="font-black tabular-nums leading-none text-[#111]" style={{ fontSize: '2.25rem' }}>{weekAchievement}</span>
          <span className="text-base font-bold">%</span>
        </div>
      </div>

      <div className="space-y-2.5 mb-3">
        {rows.map(r => (
          <div key={r.label}>
            <div className="flex items-baseline justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span>{r.emoji}</span>
                <span className="text-[13px] font-bold">{r.label}</span>
              </div>
              <div className="text-[12px] tabular-nums">
                <span className="font-black text-[#111]">{r.cur}</span>
                <span className="text-[var(--color-subtext)]"> / {r.goal}人</span>
                <span className={`ml-2 text-[11px] font-bold ${r.prog >= 1 ? 'text-emerald-600' : r.prog >= 0.5 ? 'text-amber-600' : 'text-[var(--color-subtext)]'}`}>
                  {Math.round(r.prog * 100)}%
                </span>
              </div>
            </div>
            <div className="h-2 rounded-full bg-[#F3F4F6] overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${r.prog * 100}%`,
                  backgroundColor: r.prog >= 1 ? '#10B981' : r.prog >= 0.5 ? '#F59E0B' : '#6B7280',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <StackBar counts={overall.counts} total={overall.total} />
      <Legend counts={overall.counts} />
    </div>
  );
}

// ─────────────────────────────────────────
// ⑦ 月×週ヒートマップ
// ─────────────────────────────────────────
function Card7({ weekly, overall, weekAchievement }: CardCtx) {
  // 週を「月の第何週」で振り分ける
  const today = new Date();
  const months: { label: string; year: number; month: number; cells: (WeekBucket | null)[] }[] = [];
  for (let i = 2; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push({
      label: `${d.getMonth() + 1}月`,
      year: d.getFullYear(),
      month: d.getMonth(),
      cells: [null, null, null, null, null],
    });
  }
  for (const w of weekly) {
    const y = w.start.getFullYear();
    const m = w.start.getMonth();
    const target = months.find(x => x.year === y && x.month === m);
    if (!target) continue;
    // 月内の週index
    const dayOfMonth = w.start.getDate();
    const idx = Math.min(4, Math.floor((dayOfMonth - 1) / 7));
    target.cells[idx] = w;
  }
  const maxTotal = Math.max(4, ...weekly.map(w => w.total));
  const colorFor = (t: number) => {
    if (t === 0) return '#F3F4F6';
    const r = t / maxTotal;
    if (r < 0.34) return '#BBF7D0';
    if (r < 0.67) return '#4ADE80';
    return '#10B981';
  };

  return (
    <div className="ios-card flex flex-col" style={{ padding: CARD_PAD }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold leading-tight">月×週ヒートマップ</h3>
          <p className="text-xs text-[var(--color-subtext)] mt-0.5">色の濃さ=訪問人数、空白=未実施</p>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-[var(--color-subtext)]">継続率</div>
          <span className="text-2xl font-black tabular-nums">{weekAchievement}%</span>
        </div>
      </div>

      <div className="mb-3">
        <div className="grid" style={{ gridTemplateColumns: '2.5rem repeat(5, 1fr)', gap: '6px' }}>
          <span />
          {[1, 2, 3, 4, 5].map(n => (
            <span key={n} className="text-[10px] font-bold text-center text-[var(--color-subtext)]">第{n}週</span>
          ))}
          {months.map(m => (
            <div key={`${m.year}-${m.month}`} className="contents">
              <span className="text-[12px] font-bold self-center">{m.label}</span>
              {m.cells.map((cell, i) => (
                <div
                  key={i}
                  className="rounded-lg flex flex-col items-center justify-center text-[11px] font-black"
                  style={{
                    aspectRatio: '1.4',
                    backgroundColor: cell ? colorFor(cell.total) : '#FAFAFA',
                    color: cell && cell.total >= (maxTotal * 0.67) ? '#fff' : '#111',
                  }}
                  title={cell ? `${cell.startStr}〜 ${cell.total}人` : '-'}
                >
                  {cell ? (cell.total || '·') : ''}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <StackBar counts={overall.counts} total={overall.total} />
      <Legend counts={overall.counts} />
    </div>
  );
}

// ─────────────────────────────────────────
// ⑧ 週次リスト型
// ─────────────────────────────────────────
function Card8({ weekly, overall, weekAchievement }: CardCtx) {
  // 直近8週に絞る（縦長すぎ回避）
  const recent = weekly.slice(-8).reverse();

  return (
    <div className="ios-card flex flex-col" style={{ padding: CARD_PAD }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold leading-tight">週ごとの活動</h3>
          <p className="text-xs text-[var(--color-subtext)] mt-0.5">直近8週の人数と手応え</p>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-[var(--color-subtext)]">継続率</div>
          <span className="text-2xl font-black tabular-nums">{weekAchievement}%</span>
        </div>
      </div>

      <div className="space-y-1.5 mb-3">
        {recent.map((w, i) => {
          const isCur = i === 0;
          const label = isCur ? '今週' : `${i}週前`;
          const shortDate = `${w.start.getMonth() + 1}/${w.start.getDate()}〜`;
          return (
            <div key={i} className="flex items-center gap-3 py-1">
              <div className="w-14 shrink-0">
                <div className={`text-[11px] font-bold ${isCur ? 'text-[#111]' : 'text-[var(--color-subtext)]'}`}>{label}</div>
                <div className="text-[10px] text-[var(--color-subtext)] tabular-nums">{shortDate}</div>
              </div>
              <div className="w-10 text-right shrink-0">
                <span className="text-base font-black tabular-nums" style={{ color: w.total === 0 ? '#D1D5DB' : '#111' }}>
                  {w.total}
                </span>
                <span className="text-[10px] text-[var(--color-subtext)]">人</span>
              </div>
              <div className="flex-1 min-w-0">
                {w.total > 0 ? (
                  <StackBar counts={w.counts} total={w.total} height="0.6rem" />
                ) : (
                  <div className="h-[0.6rem] rounded-full bg-[#FEE2E2] border border-[#FCA5A5]" title="未訪問" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Legend counts={overall.counts} />
    </div>
  );
}

// ─────────────────────────────────────────
// ⑨ タイムライン（訪問者ドット）
// ─────────────────────────────────────────
function Card9({ weekly, overall, weekAchievement }: CardCtx) {
  // 各週の訪問を status 順で色ドット化。週ごとに縦に積む
  return (
    <div className="ios-card flex flex-col" style={{ padding: CARD_PAD }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold leading-tight">訪問タイムライン</h3>
          <p className="text-xs text-[var(--color-subtext)] mt-0.5">1人=1ドット、色で手応え</p>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-[var(--color-subtext)]">継続率</div>
          <span className="text-2xl font-black tabular-nums">{weekAchievement}%</span>
        </div>
      </div>

      <div className="flex items-end gap-1 mb-1 h-[90px]">
        {weekly.map((w, i) => {
          const dots: { color: string }[] = [];
          ORDER.forEach(s => {
            for (let k = 0; k < w.counts[s]; k++) dots.push({ color: STATUS_HEX[s] });
          });
          return (
            <div key={i} className="flex-1 flex flex-col-reverse items-center gap-[2px] h-full">
              {dots.map((d, j) => (
                <span key={j} className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
              ))}
              {dots.length === 0 && (
                <span className="w-3 h-3 rounded-full border border-dashed border-[#D1D5DB]" />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-1 mb-3">
        {weekly.map((_, i) => (
          <div key={i} className="flex-1 text-center">
            {i === 0 && <span className="text-[9px] text-[var(--color-subtext)]">12週前</span>}
            {i === weekly.length - 1 && <span className="text-[9px] font-bold">今週</span>}
          </div>
        ))}
      </div>

      <StackBar counts={overall.counts} total={overall.total} />
      <Legend counts={overall.counts} />
    </div>
  );
}

// ─────────────────────────────────────────
// ⑩ スコアカード4象限
// ─────────────────────────────────────────
function Card10({ weekly, overall, weekAchievement, streakWeeks }: CardCtx) {
  const thisWeek = weekly[weekly.length - 1];
  const weekGoal = 4;
  // 今月合計
  const today = new Date();
  const monthTotal = weekly
    .filter(w => w.start.getFullYear() === today.getFullYear() && w.start.getMonth() === today.getMonth())
    .reduce((a, b) => a + b.total, 0);
  const monthGoal = 16;

  const quads = [
    {
      icon: <Calendar size={14} />,
      title: '今週',
      value: thisWeek.total,
      unit: `/ ${weekGoal}人`,
      accent: thisWeek.total >= weekGoal ? '#10B981' : thisWeek.total >= weekGoal / 2 ? '#F59E0B' : '#6B7280',
    },
    {
      icon: <Target size={14} />,
      title: '今月',
      value: monthTotal,
      unit: `/ ${monthGoal}人`,
      accent: monthTotal >= monthGoal ? '#10B981' : monthTotal >= monthGoal / 2 ? '#F59E0B' : '#6B7280',
    },
    {
      icon: <Flame size={14} />,
      title: '継続',
      value: streakWeeks,
      unit: '週連続',
      accent: '#EA580C',
    },
    {
      icon: <Award size={14} />,
      title: '会えた率',
      value: overall.metRate,
      unit: '%',
      accent: '#10B981',
    },
  ];

  return (
    <div className="ios-card flex flex-col" style={{ padding: CARD_PAD }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold leading-tight">活動スコアカード</h3>
          <p className="text-xs text-[var(--color-subtext)] mt-0.5">継続率 {weekAchievement}% / 直近12週</p>
        </div>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#111] text-white">
          <TrendingUp size={11} />
          順調
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {quads.map(q => (
          <div key={q.title} className="rounded-2xl border border-[#EBEBEB] bg-[#FAFAFA] px-3 py-2.5">
            <div className="flex items-center gap-1 mb-1" style={{ color: q.accent }}>
              {q.icon}
              <span className="text-[11px] font-bold">{q.title}</span>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="font-black tabular-nums leading-none" style={{ fontSize: '1.75rem', color: q.accent }}>{q.value}</span>
              <span className="text-[11px] font-bold text-[var(--color-subtext)]">{q.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <StackBar counts={overall.counts} total={overall.total} />
      <Legend counts={overall.counts} />

      {/* 次の一手ヒント */}
      {thisWeek.total < weekGoal && (
        <div className="mt-3 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-800">
          <ArrowRight size={12} />
          <span>
            今週あと <span className="font-bold">{weekGoal - thisWeek.total}人</span> で目標達成
          </span>
        </div>
      )}
    </div>
  );
}
