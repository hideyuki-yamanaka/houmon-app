'use client';

// 割合セクションのデザイン比較モックページ
// URL: /log/ratio-mock
// ヒデさん要望: 「出会える確率」を主役に、活動ペース確認が目的
//   → 「会えた率」を Hero にした 6 案を並べて比較する

import { useEffect, useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Target, Minus } from 'lucide-react';
import type { Visit, VisitStatus } from '../../../lib/types';
import { getAllVisits } from '../../../lib/storage';
import { VISIT_STATUS_CONFIG } from '../../../lib/constants';

// ステータス → hex カラー（SVG 用）
const STATUS_HEX: Record<VisitStatus, string> = {
  met: '#10B981',
  absent: '#6B7280',
  refused: '#EF4444',
  unknown_address: '#F59E0B',
  moved: '#8B5CF6',
};

// 会えなかった系のサブラベル用の順番（不在は「また行けば会える」系、他は恒久課題）
const NOT_MET_ORDER: VisitStatus[] = ['absent', 'refused', 'unknown_address', 'moved'];

type Stats = {
  total: number;
  met: number;
  notMet: number;
  metRate: number;      // 0-100
  counts: Record<VisitStatus, number>;
};

function computeStats(visits: Visit[]): Stats {
  const counts: Record<VisitStatus, number> = {
    met: 0, absent: 0, refused: 0, unknown_address: 0, moved: 0,
  };
  for (const v of visits) counts[v.status]++;
  const total = visits.length;
  const met = counts.met;
  const notMet = total - met;
  return {
    total,
    met,
    notMet,
    metRate: total > 0 ? Math.round((met / total) * 100) : 0,
    counts,
  };
}

export default function RatioMockPage() {
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllVisits()
      .then(setAllVisits)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 現在期間 = 直近30日、前期間 = その前30日
  const { cur, prev } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff30 = new Date(today);
    cutoff30.setDate(today.getDate() - 30);
    const cutoff60 = new Date(today);
    cutoff60.setDate(today.getDate() - 60);
    const s30 = cutoff30.toISOString().slice(0, 10);
    const s60 = cutoff60.toISOString().slice(0, 10);
    const curV = allVisits.filter(v => v.visitedAt >= s30);
    const prevV = allVisits.filter(v => v.visitedAt >= s60 && v.visitedAt < s30);
    return { cur: computeStats(curV), prev: computeStats(prevV) };
  }, [allVisits]);

  // 全期間の統計（全期間ベースで見たい方向け）
  const allStats = useMemo(() => computeStats(allVisits), [allVisits]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--color-subtext)]">読み込み中...</p>
      </div>
    );
  }

  // 今期のデータが薄い（訪問0件）ときは全期間にフォールバック
  const s = cur.total > 0 ? cur : allStats;
  const prevRate = prev.total > 0 ? prev.metRate : Math.max(0, s.metRate - 8); // 前期データ無ければダミー差
  const deltaPt = s.metRate - prevRate;

  return (
    <div className="absolute inset-0 flex flex-col bg-[var(--color-bg)]">
      <div className="ios-nav px-4 py-3">
        <h1 className="text-xl font-bold text-center">割合カード モック比較</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div
          className="max-w-[1366px] mx-auto px-4 pt-3 space-y-6"
          style={{ paddingBottom: 'calc(60px + env(safe-area-inset-bottom) + 16px)' }}
        >
          <div className="ios-card p-3">
            <p className="text-xs text-[var(--color-subtext)]">
              ※ 「直近30日」の実データで6案を比較（会えた率 {s.metRate}% / 全{s.total}件）。
              コンセプトは共通で「<b className="text-[#111]">会えた率</b>を主役 × 活動ペース把握」。
            </p>
          </div>

          <MockSection
            title="案A：ヒーロー・ビッグナンバー"
            caption="会えた率を超特大に。『自分いまどれくらい出会えてるか』が一発で入る。下に『会えなかった』の内訳を控えめに"
          >
            <DesignA s={s} />
          </MockSection>

          <MockSection
            title="案B：二極ドーナツ"
            caption="ドーナツを『会えた vs その他』の2色に。中央に率、下に小さく『その他』の内訳ブレイクダウン"
          >
            <DesignB s={s} />
          </MockSection>

          <MockSection
            title="案C：目標プログレス"
            caption="目標ライン（例: 70%）を基準線として明示。達成 / 未達が即わかる。ペース管理に一番ストレート"
          >
            <DesignC s={s} target={70} />
          </MockSection>

          <MockSection
            title="案D：スプリット・スタック"
            caption="横長スタックバー1本で全内訳を表示。『会えた』が大きく左に、残りは濃淡で。5カテゴリ公平寄り"
          >
            <DesignD s={s} />
          </MockSection>

          <MockSection
            title="案E：スピードメーター"
            caption="半円ゲージで『今どのあたりか』を直感的に。色帯（赤→黄→緑）で自分のペースを感覚で掴む"
          >
            <DesignE s={s} />
          </MockSection>

          <MockSection
            title="案F：ペース判定"
            caption="会えた率 + 前期比 + 文言評価（『ええ感じ』『もうひと押し』）。活動ペース確認に全振り"
          >
            <DesignF s={s} prevRate={prevRate} deltaPt={deltaPt} />
          </MockSection>
        </div>
      </div>
    </div>
  );
}

function MockSection({ title, caption, children }: { title: string; caption: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2">
        <h2 className="text-base font-bold">{title}</h2>
        <p className="text-[11px] text-[var(--color-subtext)] mt-0.5">{caption}</p>
      </div>
      <div className="ios-card p-5 hover:!opacity-100">
        {children}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   案A：ヒーロー・ビッグナンバー
   中央に超特大の「会えた率」、下段に「会えなかった」内訳
   ───────────────────────────────────────────── */
function DesignA({ s }: { s: Stats }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <h3 className="text-lg font-bold leading-tight">会えた率</h3>
          <p className="text-xs text-[var(--color-subtext)] mt-0.5">直近30日の手応え</p>
        </div>
        <span className="text-xs text-[var(--color-subtext)] tabular-nums">全{s.total}件</span>
      </div>
      {/* Hero number — 極太 × 極大 */}
      <div className="flex items-baseline justify-center py-4">
        <span className="text-[84px] font-black leading-none tabular-nums text-[#111]">{s.metRate}</span>
        <span className="text-3xl font-black text-[#111] ml-1">%</span>
      </div>
      <div className="text-center text-sm text-[var(--color-subtext)] mb-5">
        <span className="tabular-nums font-bold text-[#111]">{s.met}</span> / {s.total} 件 会えた
      </div>
      {/* 会えなかった内訳 — サブ情報として小さく */}
      <div className="border-t border-[#F0F0F0] pt-3">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs font-semibold text-[var(--color-subtext)]">会えなかった {s.notMet}件</span>
          <span className="text-xs text-[var(--color-subtext)] tabular-nums">{s.total > 0 ? 100 - s.metRate : 0}%</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {NOT_MET_ORDER.map(status => {
            const c = s.counts[status];
            if (c === 0) return null;
            return (
              <span
                key={status}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[11px]"
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_HEX[status] }} />
                <span className="text-[var(--color-subtext)]">{VISIT_STATUS_CONFIG[status].label}</span>
                <span className="font-bold tabular-nums text-[#111]">{c}</span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   案B：二極ドーナツ
   緑 = 会えた、グレー = その他。中央に率。下にその他内訳の細い棒
   ───────────────────────────────────────────── */
function DesignB({ s }: { s: Stats }) {
  const r = 62;
  const c = 2 * Math.PI * r;
  const dash = (s.metRate / 100) * c;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <h3 className="text-lg font-bold leading-tight">会えた率</h3>
          <p className="text-xs text-[var(--color-subtext)] mt-0.5">会えた vs その他</p>
        </div>
        <span className="text-xs text-[var(--color-subtext)] tabular-nums">全{s.total}件</span>
      </div>
      <div className="flex items-center gap-5 py-3">
        {/* ドーナツ */}
        <div className="relative w-[160px] h-[160px] shrink-0">
          <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
            <circle cx="80" cy="80" r={r} fill="none" stroke="#F3F4F6" strokeWidth="18" />
            <circle
              cx="80" cy="80" r={r} fill="none"
              stroke={STATUS_HEX.met} strokeWidth="18" strokeLinecap="round"
              strokeDasharray={`${dash} ${c}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-black tabular-nums leading-none">{s.metRate}<span className="text-lg">%</span></span>
            <span className="text-[11px] text-[var(--color-subtext)] mt-1">会えた</span>
          </div>
        </div>
        {/* レジェンド + その他内訳 */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_HEX.met }} />
            <span className="text-sm font-semibold flex-1">会えた</span>
            <span className="text-base font-black tabular-nums">{s.met}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#9CA3AF]" />
            <span className="text-sm font-semibold flex-1">その他</span>
            <span className="text-base font-black tabular-nums">{s.notMet}</span>
          </div>
          {/* その他内訳の細いバー */}
          <div className="mt-3 space-y-1 pt-2 border-t border-[#F0F0F0]">
            {NOT_MET_ORDER.map(status => {
              const c = s.counts[status];
              if (c === 0) return null;
              const pct = s.notMet > 0 ? (c / s.notMet) * 100 : 0;
              return (
                <div key={status} className="flex items-center gap-2">
                  <span className="text-[11px] text-[var(--color-subtext)] w-14 shrink-0">{VISIT_STATUS_CONFIG[status].label}</span>
                  <div className="flex-1 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: STATUS_HEX[status] }} />
                  </div>
                  <span className="text-[11px] font-bold tabular-nums w-5 text-right">{c}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   案C：目標プログレス
   目標ラインを明示。達成/未達でラベル変化
   ───────────────────────────────────────────── */
function DesignC({ s, target }: { s: Stats; target: number }) {
  const cleared = s.metRate >= target;
  const needMore = cleared ? 0 : Math.ceil(((target / 100) * s.total) - s.met);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <h3 className="text-lg font-bold leading-tight">会えた率</h3>
          <p className="text-xs text-[var(--color-subtext)] mt-0.5">目標 {target}% との比較</p>
        </div>
        <span className="text-xs text-[var(--color-subtext)] tabular-nums">全{s.total}件</span>
      </div>
      {/* メインナンバー + 目標との差 */}
      <div className="flex items-baseline gap-3 mt-2 mb-3">
        <span className="text-6xl font-black tabular-nums leading-none" style={{ color: cleared ? '#059669' : '#111' }}>
          {s.metRate}<span className="text-2xl">%</span>
        </span>
        <span className="text-sm font-semibold text-[var(--color-subtext)] tabular-nums">
          / 目標 {target}%
        </span>
      </div>
      {/* プログレスバー with 目標ライン */}
      <div className="relative h-6 bg-[#F3F4F6] rounded-full overflow-visible mb-3">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.min(100, s.metRate)}%`, backgroundColor: cleared ? '#10B981' : '#111' }}
        />
        {/* 目標ライン */}
        <div
          className="absolute -top-1 bottom-[-4px] w-[2px] bg-[#B91C1C]"
          style={{ left: `${target}%` }}
        >
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-[#B91C1C] whitespace-nowrap">
            目標 {target}%
          </span>
        </div>
      </div>
      {/* ステータスメッセージ */}
      <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
        cleared ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
      }`}>
        <Target size={16} />
        <span className="text-sm font-bold">
          {cleared ? `目標クリア！（+${s.metRate - target}pt）` : `目標まで あと ${needMore} 人 会えたら達成`}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   案D：スプリット・スタック（1本の横スタック + 上段メイン数字）
   ───────────────────────────────────────────── */
function DesignD({ s }: { s: Stats }) {
  const order: VisitStatus[] = ['met', 'absent', 'refused', 'unknown_address', 'moved'];
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h3 className="text-lg font-bold leading-tight">会えた率</h3>
          <p className="text-xs text-[var(--color-subtext)] mt-0.5">1本のバーで全内訳</p>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black tabular-nums leading-none text-[#111]">{s.metRate}</span>
          <span className="text-base font-bold text-[#111]">%</span>
        </div>
      </div>
      {/* スタックバー */}
      <div className="flex h-4 rounded-full overflow-hidden bg-[#F3F4F6] mb-3">
        {order.map(status => {
          const c = s.counts[status];
          if (c === 0) return null;
          const pct = (c / s.total) * 100;
          return (
            <div
              key={status}
              className="h-full"
              style={{ width: `${pct}%`, backgroundColor: STATUS_HEX[status] }}
            />
          );
        })}
      </div>
      {/* レジェンド */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
        {order.map(status => {
          const c = s.counts[status];
          return (
            <div key={status} className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_HEX[status] }} />
              <span className="text-[13px] truncate flex-1">{VISIT_STATUS_CONFIG[status].label}</span>
              <span className="text-sm font-black tabular-nums">{c}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   案E：スピードメーター（半円ゲージ）
   0% 左 → 100% 右、帯色: 0-40 赤 / 40-70 黄 / 70- 緑
   ───────────────────────────────────────────── */
function DesignE({ s }: { s: Stats }) {
  // SVG 半円のパラメータ
  const W = 280, H = 160;
  const cx = W / 2, cy = 140, rr = 110;
  // 角度: -180° (左端) → 0° (右端)、rate=0 → -180, rate=100 → 0
  const angle = -180 + (s.metRate / 100) * 180;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  // 帯のパス（3色セグメント）
  const arcPath = (startPct: number, endPct: number) => {
    const a1 = -180 + (startPct / 100) * 180;
    const a2 = -180 + (endPct / 100) * 180;
    const x1 = cx + rr * Math.cos(rad(a1));
    const y1 = cy + rr * Math.sin(rad(a1));
    const x2 = cx + rr * Math.cos(rad(a2));
    const y2 = cy + rr * Math.sin(rad(a2));
    const largeArc = Math.abs(a2 - a1) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${rr} ${rr} 0 ${largeArc} 1 ${x2} ${y2}`;
  };
  // 針先
  const px = cx + (rr - 6) * Math.cos(rad(angle));
  const py = cy + (rr - 6) * Math.sin(rad(angle));
  const verdict = s.metRate >= 70 ? { text: 'ええペース！', color: '#059669' }
    : s.metRate >= 40 ? { text: 'まずまず', color: '#D97706' }
    : { text: 'もうひと押し', color: '#B91C1C' };

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <h3 className="text-lg font-bold leading-tight">会えた率</h3>
          <p className="text-xs text-[var(--color-subtext)] mt-0.5">活動ペースを感覚で</p>
        </div>
        <span className="text-xs text-[var(--color-subtext)] tabular-nums">全{s.total}件</span>
      </div>
      <div className="flex flex-col items-center">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[320px]">
          {/* 3色帯 */}
          <path d={arcPath(0, 40)} stroke="#FCA5A5" strokeWidth="18" fill="none" strokeLinecap="butt" />
          <path d={arcPath(40, 70)} stroke="#FCD34D" strokeWidth="18" fill="none" strokeLinecap="butt" />
          <path d={arcPath(70, 100)} stroke="#6EE7B7" strokeWidth="18" fill="none" strokeLinecap="butt" />
          {/* 目盛り */}
          {[0, 40, 70, 100].map(v => {
            const a = -180 + (v / 100) * 180;
            const x1 = cx + (rr - 22) * Math.cos(rad(a));
            const y1 = cy + (rr - 22) * Math.sin(rad(a));
            const tx = cx + (rr - 36) * Math.cos(rad(a));
            const ty = cy + (rr - 36) * Math.sin(rad(a));
            return (
              <g key={v}>
                <circle cx={x1} cy={y1} r="2" fill="#9CA3AF" />
                <text x={tx} y={ty} fontSize="11" textAnchor="middle" dominantBaseline="middle" fill="#6B7280">{v}</text>
              </g>
            );
          })}
          {/* 針 */}
          <line x1={cx} y1={cy} x2={px} y2={py} stroke="#111" strokeWidth="3" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="7" fill="#111" />
        </svg>
        <div className="flex items-baseline gap-1 -mt-2">
          <span className="text-5xl font-black tabular-nums leading-none text-[#111]">{s.metRate}</span>
          <span className="text-xl font-bold">%</span>
        </div>
        <span className="mt-1 text-sm font-bold" style={{ color: verdict.color }}>
          {verdict.text}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   案F：ペース判定（活動ペース確認全振り）
   会えた率 + 前期比 + 文言評価
   ───────────────────────────────────────────── */
function DesignF({ s, prevRate, deltaPt }: { s: Stats; prevRate: number; deltaPt: number }) {
  const trendIcon = deltaPt > 1 ? TrendingUp : deltaPt < -1 ? TrendingDown : Minus;
  const trendColor = deltaPt > 1 ? 'text-emerald-600' : deltaPt < -1 ? 'text-rose-600' : 'text-gray-500';
  const verdict = deltaPt > 3
    ? { text: 'ええ感じや、このペースで', tone: 'bg-emerald-50 text-emerald-800' }
    : deltaPt < -3
    ? { text: 'ちょっと落ちてる。タイミング変えてみる？', tone: 'bg-amber-50 text-amber-800' }
    : { text: '安定してる。キープ！', tone: 'bg-blue-50 text-blue-800' };
  const TrendIcon = trendIcon;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <div>
          <h3 className="text-lg font-bold leading-tight">会えた率</h3>
          <p className="text-xs text-[var(--color-subtext)] mt-0.5">直近30日 vs 前30日</p>
        </div>
        <span className="text-xs text-[var(--color-subtext)] tabular-nums">全{s.total}件</span>
      </div>
      <div className="grid grid-cols-3 gap-3 items-stretch mt-2">
        {/* 今期 */}
        <div className="col-span-2 rounded-xl bg-[#F7F7F8] p-3 flex flex-col justify-center">
          <span className="text-[11px] text-[var(--color-subtext)] font-semibold">今期</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-5xl font-black tabular-nums leading-none">{s.metRate}</span>
            <span className="text-xl font-bold">%</span>
            <span className={`ml-2 inline-flex items-center gap-0.5 text-sm font-black tabular-nums ${trendColor}`}>
              <TrendIcon size={16} />
              {deltaPt > 0 ? '+' : ''}{deltaPt}pt
            </span>
          </div>
          <span className="text-[11px] text-[var(--color-subtext)] mt-1 tabular-nums">
            {s.met} / {s.total} 件
          </span>
        </div>
        {/* 前期 */}
        <div className="rounded-xl bg-[#FAFAFA] p-3 flex flex-col justify-center border border-[#EEE]">
          <span className="text-[11px] text-[var(--color-subtext)] font-semibold">前期</span>
          <div className="flex items-baseline gap-0.5 mt-1">
            <span className="text-2xl font-black tabular-nums leading-none text-[#6B7280]">{prevRate}</span>
            <span className="text-sm font-bold text-[#6B7280]">%</span>
          </div>
        </div>
      </div>
      {/* 判定メッセージ */}
      <div className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2.5 ${verdict.tone}`}>
        <span className="text-sm font-bold">{verdict.text}</span>
      </div>
      {/* その他内訳（小さく） */}
      <div className="mt-3 pt-3 border-t border-[#F0F0F0] flex flex-wrap gap-1.5">
        {NOT_MET_ORDER.map(status => {
          const c = s.counts[status];
          if (c === 0) return null;
          return (
            <span key={status} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_HEX[status] }} />
              <span className="text-[var(--color-subtext)]">{VISIT_STATUS_CONFIG[status].label}</span>
              <span className="font-bold tabular-nums text-[#111]">{c}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
