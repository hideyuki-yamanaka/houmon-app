'use client';

// 会えた率カード 改善案モック
// URL: /log/ratio-improve
// ヒデさん要望: 会えた率カードの空白を埋めつつ機能も足したい
//   → 5 案（前期間比較+スパーク / ドーナツ+目標 / 曜日×時間ヒート / カレンダー草 / ストリーク+次の一手）
//   を実データ or ダミーで一画面に並べる

import { useEffect, useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Flame, Target, ArrowRight } from 'lucide-react';
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

type Stats = {
  total: number;
  met: number;
  metRate: number;
  counts: Record<VisitStatus, number>;
};

function compute(visits: Visit[]): Stats {
  const counts: Record<VisitStatus, number> = { met: 0, absent: 0, refused: 0, unknown_address: 0, moved: 0 };
  for (const v of visits) counts[v.status]++;
  const total = visits.length;
  return { total, met: counts.met, metRate: total > 0 ? Math.round((counts.met / total) * 100) : 0, counts };
}

export default function RatioImprovePage() {
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllVisits().then(setAllVisits).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // 全期間（ダッシュボードと揃える）
  const stats = useMemo(() => compute(allVisits), [allVisits]);

  // 先月比用：直近30日 vs その前30日
  const monthCompare = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d30 = new Date(today); d30.setDate(today.getDate() - 30);
    const d60 = new Date(today); d60.setDate(today.getDate() - 60);
    const s30 = d30.toISOString().slice(0, 10);
    const s60 = d60.toISOString().slice(0, 10);
    const cur = compute(allVisits.filter(v => v.visitedAt >= s30));
    const prev = compute(allVisits.filter(v => v.visitedAt >= s60 && v.visitedAt < s30));
    return { cur, prev, diff: cur.metRate - prev.metRate };
  }, [allVisits]);

  // 案①用：直近6ヶ月の月次会えた率スパーク
  const monthlySpark = useMemo(() => {
    const today = new Date();
    const months: { label: string; rate: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const y = d.getFullYear(), m = d.getMonth() + 1;
      const monthVisits = allVisits.filter(v => {
        const vd = new Date(v.visitedAt);
        return vd.getFullYear() === y && vd.getMonth() + 1 === m;
      });
      const s = compute(monthVisits);
      months.push({ label: `${m}月`, rate: s.total > 0 ? s.metRate : 0 });
    }
    // データ薄かったらダミー補完（モックなので見栄え優先）
    if (months.every(m => m.rate === 0)) {
      const dummy = [62, 58, 68, 72, 75, 80];
      dummy.forEach((r, i) => (months[i].rate = r));
    }
    return months;
  }, [allVisits]);

  // 案③用：曜日×時間帯の会えた率（ダミーデータで表現）
  const heatmap = useMemo(() => {
    // 実データでは集計式だが、モックなのでそれっぽい分布を手書き
    // rows: 午前/午後/夜、cols: 月火水木金土日
    return [
      { label: '午前', values: [0.2, 0.3, 0.5, 0.4, 0.3, 0.7, 0.6] },
      { label: '午後', values: [0.4, 0.5, 0.3, 0.6, 0.4, 0.8, 0.9] },
      { label: '夜',   values: [0.6, 0.7, 0.6, 0.8, 0.7, 0.95, 1.0] },
    ];
  }, []);

  // 案④用：直近90日カレンダー（日ごとの訪問数）
  const calendar = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: { date: string; count: number }[] = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const count = allVisits.filter(v => v.visitedAt.slice(0, 10) === ds).length;
      days.push({ date: ds, count });
    }
    // 全0ならダミーを散らす
    const allZero = days.every(d => d.count === 0);
    if (allZero) {
      const seed = [1, 0, 2, 0, 0, 1, 3, 0, 0, 2, 1, 0, 0, 0, 1, 2, 0, 3, 1, 0];
      days.forEach((d, i) => (d.count = seed[i % seed.length]));
    }
    return days;
  }, [allVisits]);

  // 案⑤用：直近7日連続訪問判定 + 目標達成度
  const streakInfo = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dates = new Set(allVisits.map(v => v.visitedAt.slice(0, 10)));
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      if (dates.has(d.toISOString().slice(0, 10))) streak++;
      else break;
    }
    // モック用：ストリークが 0 でも見栄えのため 7 を入れる
    const displayStreak = streak === 0 ? 7 : streak;

    // 今月訪問人数 vs 目標 (仮 11人)
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const thisMonth = new Set(allVisits.filter(v => v.visitedAt >= monthStart).map(v => v.memberId)).size;
    const target = 11;
    const current = thisMonth === 0 ? 8 : thisMonth; // ダミー補完
    return { streak: displayStreak, target, current };
  }, [allVisits]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--color-subtext)]">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-[var(--color-bg)]">
      <div className="ios-nav px-4 py-3">
        <h1 className="text-xl font-bold text-center">会えた率 改善5案</h1>
        <p className="text-[11px] text-center text-[var(--color-subtext)] mt-0.5">
          空白を埋めつつ機能も足す。上から案①〜⑤
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div
          className="max-w-[720px] mx-auto px-4 flex flex-col gap-4"
          style={{ paddingTop: '0.75rem', paddingBottom: 'calc(60px + env(safe-area-inset-bottom) + 16px)' }}
        >

          {/* ─────────────────────────────────────────────
              案①：前期間比較 + ミニスパークライン
              ───────────────────────────────────────────── */}
          <MockFrame num="①" title="前期間比較 + スパーク" desc="「自分の活動ペース確認」にドンピシャ。数字に裏付けが出る">
            <CardA stats={stats} diff={monthCompare.diff} spark={monthlySpark} />
          </MockFrame>

          {/* ─────────────────────────────────────────────
              案②：ドーナツ + 目標リング
              ───────────────────────────────────────────── */}
          <MockFrame num="②" title="ドーナツ + 目標リング" desc="大きな図形で画面を埋める。目標値との距離も見える">
            <CardB stats={stats} goal={70} />
          </MockFrame>

          {/* ─────────────────────────────────────────────
              案③：曜日×時間帯ヒートマップ
              ───────────────────────────────────────────── */}
          <MockFrame num="③" title="曜日×時間帯ヒートマップ" desc="超実用的。いつ訪問すれば会いやすいかが一目">
            <CardC stats={stats} heatmap={heatmap} />
          </MockFrame>

          {/* ─────────────────────────────────────────────
              案④：カレンダーヒートマップ（GitHub草風）
              ───────────────────────────────────────────── */}
          <MockFrame num="④" title="カレンダーヒートマップ" desc="直近90日の活動を一望。空白日もパッと分かる">
            <CardD stats={stats} calendar={calendar} />
          </MockFrame>

          {/* ─────────────────────────────────────────────
              案⑤：ストリーク + 次の一手サジェスト
              ───────────────────────────────────────────── */}
          <MockFrame num="⑤" title="ストリーク + 次の一手" desc="モチベーション維持＋行動誘導。感情に訴える">
            <CardE stats={stats} streak={streakInfo} />
          </MockFrame>

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 共通フレーム：各案の上にラベルを付けて区切る
// ─────────────────────────────────────────────
function MockFrame({ num, title, desc, children }: { num: string; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-1.5 flex items-baseline gap-2 px-1">
        <span className="text-base font-black tabular-nums">{num}</span>
        <h2 className="text-sm font-bold">{title}</h2>
      </div>
      <p className="text-[11px] text-[var(--color-subtext)] mb-2 px-1">{desc}</p>
      {children}
    </section>
  );
}

// ─────────────────────────────────────────────
// 共通：レジェンド（5ステータス）
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// 案①：前期間比較 + スパークライン
// ─────────────────────────────────────────────
function CardA({ stats, diff, spark }: { stats: Stats; diff: number; spark: { label: string; rate: number }[] }) {
  const isUp = diff > 0;
  const isDown = diff < 0;
  const diffIcon = isUp ? <TrendingUp size={12} /> : isDown ? <TrendingDown size={12} /> : null;
  const diffColor = isUp ? 'text-emerald-600 bg-emerald-50' : isDown ? 'text-rose-600 bg-rose-50' : 'text-[#6B7280] bg-[#F3F4F6]';

  // スパークライン用 SVG
  const w = 280, h = 60, pad = 4;
  const values = spark.map(s => s.rate);
  const minV = Math.min(...values), maxV = Math.max(...values);
  const range = maxV - minV || 1;
  const pts = values.map((v, i) => ({
    x: pad + (i * (w - pad * 2)) / (values.length - 1),
    y: h - pad - ((v - minV) / range) * (h - pad * 2),
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L${pts[pts.length - 1].x} ${h - pad} L${pts[0].x} ${h - pad} Z`;

  return (
    <div className="ios-card flex flex-col" style={{ padding: '2.125rem' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold leading-tight">会えた率</h3>
          <p className="text-xs text-[var(--color-subtext)] mt-0.5">全{stats.total}件の手応え内訳</p>
          {stats.total > 0 && (
            <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${diffColor}`}>
              {diffIcon}
              先月比 {diff > 0 ? '+' : ''}{diff}pt
            </span>
          )}
        </div>
        {stats.total > 0 && (
          <div className="flex items-baseline gap-1">
            <span className="font-black tabular-nums leading-none text-[#111]" style={{ fontSize: '3rem' }}>{stats.metRate}</span>
            <span className="text-xl font-bold text-[#111]">%</span>
          </div>
        )}
      </div>

      {/* スパークライン */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-[var(--color-subtext)]">直近6ヶ月の会えた率</span>
          <span className="text-[11px] text-[var(--color-subtext)] tabular-nums">
            {spark[0].label} → {spark[spark.length - 1].label}
          </span>
        </div>
        <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="block" style={{ height: 60 }}>
          <path d={areaD} fill="#10B981" fillOpacity="0.15" />
          <path d={pathD} fill="none" stroke="#10B981" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4 : 2.5} fill="#10B981" />
          ))}
        </svg>
      </div>

      {/* スタックバー */}
      <div className="flex rounded-full overflow-hidden bg-[#F3F4F6]" style={{ height: '0.75rem' }}>
        {ORDER.map(s => {
          const c = stats.counts[s];
          if (c === 0 || stats.total === 0) return null;
          return <div key={s} style={{ width: `${(c / stats.total) * 100}%`, backgroundColor: STATUS_HEX[s] }} />;
        })}
      </div>

      <Legend counts={stats.counts} />
    </div>
  );
}

// ─────────────────────────────────────────────
// 案②：ドーナツ + 目標リング
// ─────────────────────────────────────────────
function CardB({ stats, goal }: { stats: Stats; goal: number }) {
  const size = 160, stroke = 18, cx = size / 2, cy = size / 2;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = (stats.metRate / 100) * circumference;
  const goalAngle = (goal / 100) * 360 - 90; // 目標位置の角度（度）
  const goalRad = (goalAngle * Math.PI) / 180;
  const goalX = cx + Math.cos(goalRad) * (r + stroke / 2 + 6);
  const goalY = cy + Math.sin(goalRad) * (r + stroke / 2 + 6);
  const goalDotX = cx + Math.cos(goalRad) * r;
  const goalDotY = cy + Math.sin(goalRad) * r;

  return (
    <div className="ios-card flex flex-col" style={{ padding: '2.125rem' }}>
      <div className="mb-3">
        <h3 className="text-lg font-bold leading-tight">会えた率</h3>
        <p className="text-xs text-[var(--color-subtext)] mt-0.5">全{stats.total}件 / 目標 {goal}%</p>
      </div>

      {/* ドーナツ中央配置 */}
      <div className="flex items-center justify-center py-2">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="block -rotate-90">
            {/* 背景リング */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F3F4F6" strokeWidth={stroke} />
            {/* 進捗リング */}
            <circle
              cx={cx} cy={cy} r={r} fill="none"
              stroke="#10B981" strokeWidth={stroke}
              strokeDasharray={`${progress} ${circumference - progress}`}
              strokeLinecap="round"
            />
            {/* 目標位置のマーカードット */}
            <circle cx={goalDotX} cy={goalDotY} r={5} fill="#111" transform={`rotate(90 ${cx} ${cy})`} />
          </svg>
          {/* 中心の数字 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="flex items-baseline gap-0.5">
              <span className="font-black tabular-nums leading-none text-[#111]" style={{ fontSize: '2.5rem' }}>{stats.metRate}</span>
              <span className="text-lg font-bold text-[#111]">%</span>
            </div>
            <span className={`text-[11px] font-bold tabular-nums mt-1 ${stats.metRate >= goal ? 'text-emerald-600' : 'text-[var(--color-subtext)]'}`}>
              {stats.metRate >= goal ? `目標達成 +${stats.metRate - goal}` : `目標まで ${goal - stats.metRate}pt`}
            </span>
          </div>
          {/* 目標ラベル（外側） */}
          <div
            className="absolute flex items-center gap-1 text-[10px] font-bold text-[#111] whitespace-nowrap"
            style={{ left: goalX, top: goalY, transform: 'translate(-50%, -50%)' }}
          >
            <Target size={10} />
            目標{goal}%
          </div>
        </div>
      </div>

      <Legend counts={stats.counts} />
    </div>
  );
}

// ─────────────────────────────────────────────
// 案③：曜日×時間帯ヒートマップ
// ─────────────────────────────────────────────
function CardC({ stats, heatmap }: { stats: Stats; heatmap: { label: string; values: number[] }[] }) {
  const days = ['月', '火', '水', '木', '金', '土', '日'];
  // 最高値のセル（「おすすめ時間帯」ヒント用）
  let best = { day: '', time: '', rate: 0 };
  heatmap.forEach(row => {
    row.values.forEach((v, i) => {
      if (v > best.rate) best = { day: days[i], time: row.label, rate: v };
    });
  });

  return (
    <div className="ios-card flex flex-col" style={{ padding: '2.125rem' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold leading-tight">会えた率</h3>
          <p className="text-xs text-[var(--color-subtext)] mt-0.5">曜日×時間帯で可視化</p>
        </div>
        {stats.total > 0 && (
          <div className="flex items-baseline gap-1">
            <span className="font-black tabular-nums leading-none text-[#111]" style={{ fontSize: '2.5rem' }}>{stats.metRate}</span>
            <span className="text-lg font-bold text-[#111]">%</span>
          </div>
        )}
      </div>

      {/* ヒートマップ本体 */}
      <div className="mb-3">
        <div className="grid" style={{ gridTemplateColumns: '2.5rem repeat(7, 1fr)', gap: '4px' }}>
          <span />
          {days.map(d => (
            <span key={d} className="text-[11px] font-bold text-center text-[var(--color-subtext)]">{d}</span>
          ))}
          {heatmap.map(row => (
            <div key={row.label} className="contents">
              <span className="text-[11px] font-bold text-[var(--color-subtext)] self-center">{row.label}</span>
              {row.values.map((v, i) => (
                <div
                  key={i}
                  className="rounded"
                  style={{
                    aspectRatio: '1.2',
                    backgroundColor: v === 0 ? '#F3F4F6' : `rgba(16, 185, 129, ${Math.max(0.12, v)})`,
                  }}
                  title={`${days[i]} ${row.label}: ${Math.round(v * 100)}%`}
                />
              ))}
            </div>
          ))}
        </div>

        {/* ヒント */}
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px]">
          <Flame size={12} className="text-emerald-600" />
          <span className="text-[var(--color-subtext)]">
            <span className="font-bold text-[#111]">{best.day}の{best.time}</span> が一番会いやすい
          </span>
        </div>
      </div>

      <Legend counts={stats.counts} />
    </div>
  );
}

// ─────────────────────────────────────────────
// 案④：カレンダーヒートマップ（GitHub草風）
// ─────────────────────────────────────────────
function CardD({ stats, calendar }: { stats: Stats; calendar: { date: string; count: number }[] }) {
  // 13週×7日で描く（= 91セル、90日ぴったり収まる）
  const weeks = 13;
  const cells: ({ date: string; count: number } | null)[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: ({ date: string; count: number } | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const idx = w * 7 + d;
      col.push(calendar[idx] ?? null);
    }
    cells.push(col);
  }

  const activeDays = calendar.filter(d => d.count > 0).length;
  const maxCount = Math.max(1, ...calendar.map(c => c.count));
  const colorFor = (c: number) => {
    if (c === 0) return '#F3F4F6';
    const intensity = c / maxCount;
    if (intensity < 0.34) return '#BBF7D0';
    if (intensity < 0.67) return '#4ADE80';
    return '#10B981';
  };

  return (
    <div className="ios-card flex flex-col" style={{ padding: '2.125rem' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold leading-tight">会えた率</h3>
          <p className="text-xs text-[var(--color-subtext)] mt-0.5">直近90日 / 活動日 {activeDays}日</p>
        </div>
        {stats.total > 0 && (
          <div className="flex items-baseline gap-1">
            <span className="font-black tabular-nums leading-none text-[#111]" style={{ fontSize: '2.5rem' }}>{stats.metRate}</span>
            <span className="text-lg font-bold text-[#111]">%</span>
          </div>
        )}
      </div>

      {/* カレンダーグリッド */}
      <div className="mb-3 flex gap-[3px]">
        {cells.map((col, wi) => (
          <div key={wi} className="flex flex-col gap-[3px] flex-1">
            {col.map((cell, di) => (
              <div
                key={di}
                className="rounded-sm"
                style={{
                  aspectRatio: '1',
                  backgroundColor: cell ? colorFor(cell.count) : 'transparent',
                }}
                title={cell ? `${cell.date}: ${cell.count}件` : ''}
              />
            ))}
          </div>
        ))}
      </div>

      {/* 凡例（薄→濃） */}
      <div className="flex items-center justify-end gap-1 mb-3">
        <span className="text-[10px] text-[var(--color-subtext)]">少</span>
        {['#F3F4F6', '#BBF7D0', '#4ADE80', '#10B981'].map(c => (
          <span key={c} className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c }} />
        ))}
        <span className="text-[10px] text-[var(--color-subtext)]">多</span>
      </div>

      <Legend counts={stats.counts} />
    </div>
  );
}

// ─────────────────────────────────────────────
// 案⑤：ストリーク + 次の一手サジェスト
// ─────────────────────────────────────────────
function CardE({ stats, streak }: { stats: Stats; streak: { streak: number; target: number; current: number } }) {
  const progress = Math.min(1, streak.current / streak.target);
  const remaining = Math.max(0, streak.target - streak.current);

  return (
    <div className="ios-card flex flex-col" style={{ padding: '2.125rem' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold leading-tight">会えた率</h3>
          <p className="text-xs text-[var(--color-subtext)] mt-0.5">全{stats.total}件の手応え内訳</p>
        </div>
        {stats.total > 0 && (
          <div className="flex items-baseline gap-1">
            <span className="font-black tabular-nums leading-none text-[#111]" style={{ fontSize: '3rem' }}>{stats.metRate}</span>
            <span className="text-xl font-bold text-[#111]">%</span>
          </div>
        )}
      </div>

      {/* ストリークバナー */}
      <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-orange-50 to-rose-50 border border-orange-200 px-4 py-3 mb-2.5">
        <Flame size={28} className="text-orange-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black tabular-nums text-orange-600 leading-none">{streak.streak}</span>
            <span className="text-sm font-bold text-orange-600">日連続訪問中！</span>
          </div>
          <p className="text-[11px] text-orange-700/80 mt-0.5">習慣化できてる、ほんま素晴らしい</p>
        </div>
      </div>

      {/* 次の一手サジェスト */}
      <div className="rounded-2xl bg-[#F7F7F8] border border-[#EBEBEB] px-4 py-3 mb-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <ArrowRight size={14} className="text-[#111]" />
          <span className="text-[12px] font-bold text-[#111]">
            今月あと <span className="text-emerald-600 text-sm">{remaining}人</span> で目標達成
          </span>
        </div>
        {/* プログレスバー (点・丸表示) */}
        <div className="flex items-center gap-1">
          {Array.from({ length: streak.target }).map((_, i) => (
            <span
              key={i}
              className="flex-1 h-2 rounded-full"
              style={{ backgroundColor: i < streak.current ? '#10B981' : '#E5E7EB' }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-[var(--color-subtext)] tabular-nums">
          <span>{streak.current} / {streak.target}人</span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
      </div>

      <Legend counts={stats.counts} />
    </div>
  );
}
