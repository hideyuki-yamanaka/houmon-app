'use client';

// 会えた率カード 改善案 v3 — ①案のブラッシュアップ 6 バリエーション
// URL: /log/ratio-improve-v3
//
// ヒデさんフィードバック:
//   - 案①（週次ストリーク + 手応え）が良さそう
//   - ただ「何週前 / どの週に訪問したか」が分かりづらい
//   - テキストで小さくてもいいので補足が欲しい。6パターン見たい。
//
// 各案ともレイアウトの骨格は共通（Hero=連続週数 / 12週ドット / 手応えスタック / レジェンド）。
// 違うのは「ドット横の日付/週ラベルの出し方」のみ。

import { useEffect, useState, useMemo } from 'react';
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

function mondayOf(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}
function fmt(d: Date) { return d.toISOString().slice(0, 10); }

type WeekBucket = {
  start: Date;
  startStr: string;
  counts: Record<VisitStatus, number>;
  total: number;
};
function emptyCounts(): Record<VisitStatus, number> {
  return { met: 0, absent: 0, refused: 0, unknown_address: 0, moved: 0 };
}

export default function RatioImproveV3Page() {
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllVisits().then(setAllVisits).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const weekly = useMemo<WeekBucket[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMon = mondayOf(today);
    const buckets: WeekBucket[] = [];
    for (let i = 11; i >= 0; i--) {
      const start = new Date(thisMon);
      start.setDate(thisMon.getDate() - i * 7);
      buckets.push({ start, startStr: fmt(start), counts: emptyCounts(), total: 0 });
    }
    for (const v of allVisits) {
      const vd = new Date(v.visitedAt);
      const vMon = fmt(mondayOf(vd));
      const b = buckets.find(b => b.startStr === vMon);
      if (b) { b.counts[v.status]++; b.total++; }
    }
    // ダミー補完（データ薄い時用）
    const allEmpty = buckets.every(b => b.total === 0);
    if (allEmpty) {
      const seed = [3, 4, 3, 0, 4, 3, 4, 2, 3, 4, 3, 3];
      const metSeed = [2, 3, 2, 0, 3, 2, 4, 2, 2, 3, 2, 2];
      buckets.forEach((b, i) => {
        b.total = seed[i];
        b.counts.met = metSeed[i];
        b.counts.absent = Math.max(0, seed[i] - metSeed[i] - (i % 4 === 0 ? 1 : 0));
        b.counts.moved = i % 4 === 0 ? 1 : 0;
      });
    }
    return buckets;
  }, [allVisits]);

  const overall = useMemo(() => {
    const counts = emptyCounts();
    for (const w of weekly) for (const s of ORDER) counts[s] += w.counts[s];
    const total = ORDER.reduce((a, s) => a + counts[s], 0);
    return { counts, total, metRate: total > 0 ? Math.round((counts.met / total) * 100) : 0 };
  }, [weekly]);

  const streakWeeks = useMemo(() => {
    let count = 0;
    for (let i = weekly.length - 1; i >= 0; i--) {
      if (weekly[i].total > 0) count++;
      else if (i === weekly.length - 1) continue;
      else break;
    }
    return count;
  }, [weekly]);

  const weekAchievement = useMemo(() => {
    const done = weekly.filter(w => w.total > 0).length;
    return Math.round((done / weekly.length) * 100);
  }, [weekly]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--color-subtext)]">読み込み中...</p>
      </div>
    );
  }

  const ctx: Ctx = { weekly, overall, streakWeeks, weekAchievement };

  return (
    <div className="absolute inset-0 flex flex-col bg-[var(--color-bg)]">
      <div className="ios-nav px-4 py-3">
        <h1 className="text-xl font-bold text-center">案①ブラッシュアップ 6 案</h1>
        <p className="text-[11px] text-center text-[var(--color-subtext)] mt-0.5">
          12週ドットに「いつ/何週前か」の補足を追加
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div
          className="max-w-[720px] mx-auto px-4 flex flex-col gap-4"
          style={{ paddingTop: '0.75rem', paddingBottom: 'calc(60px + env(safe-area-inset-bottom) + 16px)' }}
        >
          <Frame n="A" t="月ラベル区切り型" d="月が変わる週だけ下に年月を表示。シンプルで見やすい">
            <CardA {...ctx} />
          </Frame>
          <Frame n="B" t="全週日付型" d="全12週に短縮日付を下付け。情報密度最大でスキャンしやすい">
            <CardB {...ctx} />
          </Frame>
          <Frame n="C" t="4週刻みアンカー型" d="12週前/8週前/4週前/今週の4アンカーだけ表示。最小構成">
            <CardC {...ctx} />
          </Frame>
          <Frame n="D" t="人数+日付 二段ラベル" d="ドット上に人数、ドット下に日付。見た瞬間に情報が揃う">
            <CardD {...ctx} />
          </Frame>
          <Frame n="E" t="今週/先週を強調型" d="今週・先週だけ大きくラベル、他は週番号で補足">
            <CardE {...ctx} />
          </Frame>
          <Frame n="F" t="タイムライン+月帯型" d="下に月境界を帯で表示。時間の流れが視覚化される">
            <CardF {...ctx} />
          </Frame>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
type Ctx = {
  weekly: WeekBucket[];
  overall: { counts: Record<VisitStatus, number>; total: number; metRate: number };
  streakWeeks: number;
  weekAchievement: number;
};

function Frame({ n, t, d, children }: { n: string; t: string; d: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-1 flex items-baseline gap-2 px-1">
        <span className="text-base font-black">{n}</span>
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

function StackBar({ counts, total }: { counts: Record<VisitStatus, number>; total: number }) {
  return (
    <div className="flex rounded-full overflow-hidden bg-[#F3F4F6]" style={{ height: '0.75rem' }}>
      {ORDER.map(s => {
        const c = counts[s];
        if (c === 0 || total === 0) return null;
        return <div key={s} style={{ width: `${(c / total) * 100}%`, backgroundColor: STATUS_HEX[s] }} />;
      })}
    </div>
  );
}

// カード共通ヘッダー（ストリーク主役）
function Header({ streakWeeks }: { streakWeeks: number }) {
  return (
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
  );
}

// フッター：手応え内訳
function Footer({ overall }: { overall: Ctx['overall'] }) {
  return (
    <>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-[var(--color-subtext)]">全{overall.total}件の手応え</span>
        <span className="text-[12px] font-bold">会えた率 {overall.metRate}%</span>
      </div>
      <StackBar counts={overall.counts} total={overall.total} />
      <Legend counts={overall.counts} />
    </>
  );
}

const CARD_PAD = '1.75rem';

// ─────────────────────────────────────────
// 共通ドット描画用ヘルパー
// ─────────────────────────────────────────
function Dot({ hit, isCur }: { hit: boolean; isCur: boolean }) {
  return (
    <div
      className="w-full rounded"
      style={{
        aspectRatio: '1',
        backgroundColor: hit ? '#10B981' : '#F3F4F6',
        border: isCur ? '2px solid #111' : 'none',
      }}
    />
  );
}

function shortDate(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ─────────────────────────────────────────
// A: 月ラベル区切り型
// ─────────────────────────────────────────
function CardA({ weekly, overall, streakWeeks, weekAchievement }: Ctx) {
  // 月が変わる最初の週 or index 0 の週にだけ月ラベルを出す
  const monthLabels = weekly.map((w, i) => {
    if (i === 0) return `${w.start.getMonth() + 1}月`;
    const prev = weekly[i - 1].start.getMonth();
    const cur = w.start.getMonth();
    return prev !== cur ? `${cur + 1}月` : '';
  });

  return (
    <div className="ios-card flex flex-col" style={{ padding: CARD_PAD }}>
      <Header streakWeeks={streakWeeks} />

      <div className="mb-3">
        <div className="flex items-center gap-1 mb-1">
          {weekly.map((w, i) => (
            <div key={i} className="flex-1">
              <Dot hit={w.total > 0} isCur={i === weekly.length - 1} />
            </div>
          ))}
        </div>
        <div className="flex items-start gap-1 mb-1 h-[14px]">
          {weekly.map((_, i) => (
            <div key={i} className="flex-1 text-center">
              <span className="text-[10px] font-bold text-[#111]">{monthLabels[i]}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-[10px] text-[var(--color-subtext)]">
          <span>12週前</span>
          <span className="font-bold">達成 {weekAchievement}%</span>
          <span className="font-bold text-[#111]">今週</span>
        </div>
      </div>

      <Footer overall={overall} />
    </div>
  );
}

// ─────────────────────────────────────────
// B: 全週日付型
// ─────────────────────────────────────────
function CardB({ weekly, overall, streakWeeks, weekAchievement }: Ctx) {
  return (
    <div className="ios-card flex flex-col" style={{ padding: CARD_PAD }}>
      <Header streakWeeks={streakWeeks} />

      <div className="mb-3">
        <div className="flex items-center gap-1 mb-1">
          {weekly.map((w, i) => (
            <div key={i} className="flex-1">
              <Dot hit={w.total > 0} isCur={i === weekly.length - 1} />
            </div>
          ))}
        </div>
        <div className="flex items-start gap-1 mb-1">
          {weekly.map((w, i) => {
            const isCur = i === weekly.length - 1;
            return (
              <div key={i} className="flex-1 text-center">
                <span
                  className={`text-[9px] tabular-nums leading-none ${isCur ? 'font-black text-[#111]' : 'font-bold text-[var(--color-subtext)]'}`}
                >
                  {shortDate(w.start)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[10px] text-[var(--color-subtext)]">
          <span>12週前</span>
          <span className="font-bold">達成 {weekAchievement}%</span>
          <span className="font-bold text-[#111]">今週</span>
        </div>
      </div>

      <Footer overall={overall} />
    </div>
  );
}

// ─────────────────────────────────────────
// C: 4週刻みアンカー型
// ─────────────────────────────────────────
function CardC({ weekly, overall, streakWeeks, weekAchievement }: Ctx) {
  // 0, 4, 8, 11 (今週) にラベル
  const anchors: Record<number, string> = {
    0: '12週前',
    4: '8週前',
    8: '4週前',
    11: '今週',
  };

  return (
    <div className="ios-card flex flex-col" style={{ padding: CARD_PAD }}>
      <Header streakWeeks={streakWeeks} />

      <div className="mb-3">
        <div className="flex items-center gap-1 mb-1.5">
          {weekly.map((w, i) => (
            <div key={i} className="flex-1">
              <Dot hit={w.total > 0} isCur={i === weekly.length - 1} />
            </div>
          ))}
        </div>
        <div className="flex items-start gap-1">
          {weekly.map((w, i) => {
            const label = anchors[i];
            const isCur = i === weekly.length - 1;
            return (
              <div key={i} className="flex-1 text-center">
                {label && (
                  <div className="flex flex-col items-center">
                    <span className={`text-[10px] leading-none ${isCur ? 'font-black text-[#111]' : 'font-bold text-[var(--color-subtext)]'}`}>
                      {label}
                    </span>
                    <span className="text-[9px] tabular-nums text-[var(--color-subtext)] leading-none mt-0.5">
                      {shortDate(w.start)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-end mt-1">
          <span className="text-[10px] font-bold text-[var(--color-subtext)]">達成 {weekAchievement}%</span>
        </div>
      </div>

      <Footer overall={overall} />
    </div>
  );
}

// ─────────────────────────────────────────
// D: 人数+日付 二段ラベル型
// ─────────────────────────────────────────
function CardD({ weekly, overall, streakWeeks, weekAchievement }: Ctx) {
  return (
    <div className="ios-card flex flex-col" style={{ padding: CARD_PAD }}>
      <Header streakWeeks={streakWeeks} />

      <div className="mb-3">
        {/* 上ラベル：人数 */}
        <div className="flex items-end gap-1 mb-0.5">
          {weekly.map((w, i) => (
            <div key={i} className="flex-1 text-center">
              <span
                className="text-[10px] font-black tabular-nums leading-none"
                style={{ color: w.total === 0 ? '#D1D5DB' : '#111' }}
              >
                {w.total > 0 ? `${w.total}人` : '—'}
              </span>
            </div>
          ))}
        </div>
        {/* ドット */}
        <div className="flex items-center gap-1 mb-0.5">
          {weekly.map((w, i) => (
            <div key={i} className="flex-1">
              <Dot hit={w.total > 0} isCur={i === weekly.length - 1} />
            </div>
          ))}
        </div>
        {/* 下ラベル：日付 */}
        <div className="flex items-start gap-1 mb-1">
          {weekly.map((w, i) => (
            <div key={i} className="flex-1 text-center">
              <span className="text-[9px] text-[var(--color-subtext)] tabular-nums leading-none">
                {shortDate(w.start)}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-[10px] text-[var(--color-subtext)] mt-1">
          <span>12週前</span>
          <span className="font-bold">達成 {weekAchievement}%</span>
          <span className="font-bold text-[#111]">今週</span>
        </div>
      </div>

      <Footer overall={overall} />
    </div>
  );
}

// ─────────────────────────────────────────
// E: 今週/先週を強調型
// ─────────────────────────────────────────
function CardE({ weekly, overall, streakWeeks, weekAchievement }: Ctx) {
  return (
    <div className="ios-card flex flex-col" style={{ padding: CARD_PAD }}>
      <Header streakWeeks={streakWeeks} />

      <div className="mb-3">
        <div className="flex items-center gap-1 mb-1.5">
          {weekly.map((w, i) => (
            <div key={i} className="flex-1">
              <Dot hit={w.total > 0} isCur={i === weekly.length - 1} />
            </div>
          ))}
        </div>
        <div className="flex items-start gap-1">
          {weekly.map((w, i) => {
            const isCur = i === weekly.length - 1;
            const isPrev = i === weekly.length - 2;
            const isAnchor = i === 0;
            const fromEnd = weekly.length - 1 - i;

            // 今週/先週/12週前は強調、他は薄く週番号（4週刻みだけ）
            let label: string | null = null;
            let strong = false;
            if (isCur) { label = '今週'; strong = true; }
            else if (isPrev) { label = '先週'; strong = true; }
            else if (isAnchor) { label = '12週前'; }
            else if (fromEnd % 4 === 0) { label = `${fromEnd}週前`; }

            if (!label) return <div key={i} className="flex-1" />;

            return (
              <div key={i} className="flex-1 text-center">
                <span
                  className={`text-[10px] leading-none ${strong ? 'font-black text-[#111]' : 'font-bold text-[var(--color-subtext)]'}`}
                >
                  {label}
                </span>
                <div className="text-[9px] tabular-nums text-[var(--color-subtext)] leading-none mt-0.5">
                  {shortDate(w.start)}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end mt-1">
          <span className="text-[10px] font-bold text-[var(--color-subtext)]">達成 {weekAchievement}%</span>
        </div>
      </div>

      <Footer overall={overall} />
    </div>
  );
}

// ─────────────────────────────────────────
// F: タイムライン+月帯型
// ─────────────────────────────────────────
function CardF({ weekly, overall, streakWeeks, weekAchievement }: Ctx) {
  // 月ごとに連続セルをまとめて、月帯を描画する
  const monthGroups: { month: number; startIdx: number; endIdx: number }[] = [];
  weekly.forEach((w, i) => {
    const m = w.start.getMonth();
    const last = monthGroups[monthGroups.length - 1];
    if (!last || last.month !== m) {
      monthGroups.push({ month: m, startIdx: i, endIdx: i });
    } else {
      last.endIdx = i;
    }
  });

  return (
    <div className="ios-card flex flex-col" style={{ padding: CARD_PAD }}>
      <Header streakWeeks={streakWeeks} />

      <div className="mb-3">
        <div className="flex items-center gap-1 mb-1">
          {weekly.map((w, i) => (
            <div key={i} className="flex-1">
              <Dot hit={w.total > 0} isCur={i === weekly.length - 1} />
            </div>
          ))}
        </div>

        {/* 月帯 */}
        <div className="flex gap-1 mb-1">
          {monthGroups.map((g, gi) => {
            const span = g.endIdx - g.startIdx + 1;
            const isEven = gi % 2 === 0;
            return (
              <div
                key={gi}
                className="flex items-center justify-center rounded-full py-0.5"
                style={{
                  flex: span,
                  backgroundColor: isEven ? '#F3F4F6' : '#FAFAFA',
                  border: '1px solid #EBEBEB',
                }}
              >
                <span className="text-[10px] font-bold text-[#111]">{g.month + 1}月</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[10px] text-[var(--color-subtext)] mt-1">
          <span>12週前</span>
          <span className="font-bold">達成 {weekAchievement}%</span>
          <span className="font-bold text-[#111]">今週</span>
        </div>
      </div>

      <Footer overall={overall} />
    </div>
  );
}
