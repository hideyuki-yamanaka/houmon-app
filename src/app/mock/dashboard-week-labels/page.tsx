'use client';

// ──────────────────────────────────────────────────────────────
// 「家庭訪問の回数」週バー ラベリング 5案 比較プレビュー
//
// ヒデさん指示 (2026-05-04):
//   現状「今週 / 先週 / 2週間前 〜4/21」みたいなラベルをもう少し
//   直感的に分かりやすくしたい。5 パターン提案。
//
// 共通: 直近 8 週分の同じデータで、ラベルだけ差し替え。
// 想定基準日: 2026年5月4日 (月)
// ──────────────────────────────────────────────────────────────

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

// ── サンプルデータ ───────────────────────────────────────────
// 直近 8 週、各週の月曜と件数
const TODAY = new Date(2026, 4, 4); // 2026-05-04 (月)

type Week = {
  monday: Date;
  count: number;
  agoIdx: number; // 0=今週, 1=先週, 2=2週間前, ...
};

function addDays(d: Date, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function fmt(d: Date): string { return `${d.getMonth() + 1}/${d.getDate()}`; }
function fmtMD(d: Date): string { return `${d.getMonth() + 1}月${d.getDate()}日`; }

const WEEKS: Week[] = Array.from({ length: 8 }, (_, i) => ({
  monday: addDays(TODAY, -i * 7),
  agoIdx: i,
  count: [18, 12, 20, 6, 14, 9, 0, 11][i],
}));
const MAX = Math.max(1, ...WEEKS.map(w => w.count));

// ──────────────────────────────────────────────────────────────
export default function WeekLabelsPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-12">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-black/5">
        <div className="max-w-[640px] mx-auto flex items-center px-2 py-2">
          <Link href="/" className="flex items-center gap-1 text-[15px] text-[var(--color-primary)] active:opacity-60 px-2 py-1">
            <ChevronLeft size={20} />戻る
          </Link>
          <h1 className="flex-1 text-center text-[16px] font-semibold pr-12">
            週バー ラベリング 5案
          </h1>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-3 py-4 space-y-6">
        <p className="text-[12px] text-[var(--color-subtext)] leading-relaxed">
          全部 同じデータ・同じグラフ。ラベル表記だけ違う。
          基準日: 2026年5月4日 (月)
        </p>

        <V letter="A" title="現状: 今週 / 先週 / 2週間前 (〜日付)" desc="関係表現 + 起点日。今のスタイル。">
          <Card>{WEEKS.map(w => <Bar key={w.agoIdx} label={labelA(w)} count={w.count} />)}</Card>
        </V>

        <V letter="B" title="日付範囲メイン (5/4〜10)" desc="どの週か一目で分かる。月またぎも自然に表現。">
          <Card>{WEEKS.map(w => <Bar key={w.agoIdx} label={labelB(w)} count={w.count} />)}</Card>
        </V>

        <V letter="C" title="月見出し + 週日付グルーピング" desc="月の境界が明示される、長期で見るときに分かりやすい。">
          <Card><GroupedByMonth /></Card>
        </V>

        <V letter="D" title="2段組み (関係 大 + 日付 小)" desc="今週/先週がぱっと分かりつつ、日付も併記で安心。">
          <Card>{WEEKS.map(w => <Bar key={w.agoIdx} label={labelD(w)} labelMode="two-line" count={w.count} />)}</Card>
        </V>

        <V letter="E" title="週始まり日 + 「の週」 (5/4の週)" desc="シンプル、短くて読みやすい。">
          <Card>{WEEKS.map(w => <Bar key={w.agoIdx} label={labelE(w)} count={w.count} />)}</Card>
        </V>
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
function V({ letter, title, desc, children }: {
  letter: string; title: string; desc: string; children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-black/5">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold w-6 h-6 rounded-full bg-[#111] text-white inline-flex items-center justify-center">{letter}</span>
          <h2 className="text-[13px] font-semibold flex-1">{title}</h2>
        </div>
        <p className="text-[11px] text-[var(--color-subtext)] mt-1 ml-8">{desc}</p>
      </div>
      <div className="bg-[var(--color-bg)] p-3">{children}</div>
    </section>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-[14px] font-bold leading-tight">家庭訪問の回数</h3>
          <p className="text-[10px] text-[var(--color-subtext)] mt-0.5">直近8週分</p>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[28px] font-extrabold tabular-nums leading-none text-[#111] tracking-tight">
            {WEEKS.reduce((s, w) => s + w.count, 0)}
          </span>
          <span className="text-[12px] font-bold">回</span>
        </div>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

// ── バー1行 ────────────────────────────────────────────────
function Bar({ label, count, labelMode }: {
  label: React.ReactNode; count: number; labelMode?: 'two-line';
}) {
  const widthPct = count > 0 ? Math.max(10, (count / MAX) * 100) : 4;
  return (
    <div>
      <div className={`mb-1 ${labelMode === 'two-line' ? '' : ''}`}>
        <div className="text-[11px] font-bold text-[#111] leading-tight">{label}</div>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3 rounded-full bg-[#111]" style={{ width: `${widthPct}%`, minWidth: 4 }} />
        {count > 0 && <span className="text-[11px] font-bold tabular-nums text-[#374151]">{count}</span>}
      </div>
    </div>
  );
}

// ── A: 現状スタイル (関係 + 〜日付) ──────────────────────────
function labelA(w: Week): React.ReactNode {
  if (w.agoIdx === 0) return '今週';
  if (w.agoIdx === 1) return '先週';
  return `${w.agoIdx}週間前 〜${fmt(w.monday)}`;
}

// ── B: 日付範囲メイン (5/4〜10) ──────────────────────────────
function labelB(w: Week): React.ReactNode {
  const sun = addDays(w.monday, 6);
  const sameMonth = w.monday.getMonth() === sun.getMonth();
  const range = sameMonth
    ? `${fmt(w.monday)}〜${sun.getDate()}`
    : `${fmt(w.monday)}〜${fmt(sun)}`;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{range}</span>
      {w.agoIdx === 0 && <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">今週</span>}
      {w.agoIdx === 1 && <span className="text-[9px] text-[#6B7280] bg-[#F3F4F6] px-1 py-0.5 rounded">先週</span>}
    </span>
  );
}

// ── C: 月見出し + 週グルーピング ─────────────────────────────
function GroupedByMonth() {
  // 各週を 月の頭(月曜の月)で グルーピング
  const groups = new Map<string, Week[]>();
  for (const w of WEEKS) {
    const key = `${w.monday.getFullYear()}-${w.monday.getMonth() + 1}`;
    const arr = groups.get(key); if (arr) arr.push(w); else groups.set(key, [w]);
  }
  return (
    <div className="space-y-3">
      {[...groups.entries()].map(([key, weeks]) => {
        const [y, m] = key.split('-');
        return (
          <div key={key}>
            <div className="text-[11px] font-bold text-[var(--color-subtext)] mb-1.5 pb-1 border-b border-[#E5E7EB]">
              {y === String(TODAY.getFullYear()) ? `${m}月` : `${y}年${m}月`}
            </div>
            <div className="space-y-2">
              {weeks.map(w => {
                const sun = addDays(w.monday, 6);
                const sameMonth = w.monday.getMonth() === sun.getMonth();
                const label = sameMonth
                  ? `${w.monday.getDate()}〜${sun.getDate()}日`
                  : `${fmt(w.monday)}〜${fmt(sun)}`;
                return <Bar key={w.agoIdx} label={label} count={w.count} />;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── D: 2段組み (関係 大 + 日付 小) ───────────────────────────
function labelD(w: Week): React.ReactNode {
  const sun = addDays(w.monday, 6);
  const sameMonth = w.monday.getMonth() === sun.getMonth();
  const range = sameMonth
    ? `${fmt(w.monday)}〜${sun.getDate()}`
    : `${fmt(w.monday)}〜${fmt(sun)}`;
  const main =
    w.agoIdx === 0 ? '今週' :
    w.agoIdx === 1 ? '先週' :
    `${w.agoIdx}週間前`;
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[12px] font-bold text-[#111]">{main}</span>
      <span className="text-[10px] text-[var(--color-subtext)] font-medium">{range}</span>
    </div>
  );
}

// ── E: 週始まり日 + 「の週」 ─────────────────────────────────
function labelE(w: Week): React.ReactNode {
  if (w.agoIdx === 0) return `今週 (${fmt(w.monday)}〜)`;
  if (w.agoIdx === 1) return `先週 (${fmt(w.monday)}〜)`;
  return `${fmtMD(w.monday)}の週`;
}
