'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import type { MemberWithVisitInfo, Visit, VisitStatus } from '../../lib/types';
import { getMembersWithVisitInfo, getAllVisits } from '../../lib/storage';
import { VISIT_STATUS_CONFIG, DISTRICT_COLORS } from '../../lib/constants';

// ステータスごとのドーナツ色（constants の bg クラスだと SVG に塗れないので hex を定義）
const STATUS_HEX: Record<VisitStatus, string> = {
  met_self:        '#10B981', // 緑(濃) — 本人に会えたが一番嬉しい
  met_family:      '#34D399', // 緑(薄)
  absent:          '#6B7280',
  refused:         '#EF4444',
  unknown_address: '#F59E0B',
  moved:           '#8B5CF6',
};

// 「家庭訪問の回数」カードのスパン切替
type Span = 12 | 26 | 52 | -1; // -1 = 全期間
const SPAN_OPTIONS: { val: Span; label: string }[] = [
  { val: 12, label: '12週' },
  { val: 26, label: '半年' },
  { val: 52, label: '1年' },
  { val: -1, label: '全期間' },
];

// 月曜始まり週バケット
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
  return { met_self: 0, met_family: 0, absent: 0, refused: 0, unknown_address: 0, moved: 0 };
}

type WeekBucket = {
  start: Date;
  startStr: string;
  counts: Record<VisitStatus, number>;
  total: number;
};

/** N 週前の和ラベル: 0=今週 / 1=先週 / 2=2週間前 / ... */
function weekJaLabel(i: number): string {
  if (i === 0) return '今週';
  if (i === 1) return '先週';
  return `${i}週間前`;
}

export default function LogPage() {
  const [members, setMembers] = useState<MemberWithVisitInfo[]>([]);
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  // 「家庭訪問の回数」カードのスパン
  const [span, setSpan] = useState<Span>(12);
  // 地区セクションのアコーディオン展開状態 — 9件を超えたら畳む
  const [expandDistrict, setExpandDistrict] = useState(false);
  // 家庭訪問の回数カード: 直近 N 行で畳んで「続きを見る」展開
  const [expandWeeks, setExpandWeeks] = useState(false);

  useEffect(() => {
    Promise.all([getMembersWithVisitInfo(), getAllVisits()])
      .then(([m, v]) => { setMembers(m); setAllVisits(v); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── 全期間ベースの統計（地区別タイルで使用） ──
  // 旧仕様の period タブを撤廃したので、地区別は常に全期間累計を見せる。
  const stats = useMemo(() => {
    const districtStats = new Map<string, { total: number; visited: number }>();
    for (const m of members) {
      const d = districtStats.get(m.district) ?? { total: 0, visited: 0 };
      d.total++;
      if (allVisits.some(v => v.memberId === m.id)) d.visited++;
      districtStats.set(m.district, d);
    }
    return { districtStats };
  }, [members, allVisits]);

  // ── スパンに応じた週別バケット ──
  // span=12 なら直近 12 週、span=26/52 は半年/1年、span=-1 は最初の訪問週から今週まで全部。
  const weekly = useMemo<WeekBucket[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMon = mondayOf(today);

    let weekCount: number;
    if (span !== -1) {
      weekCount = span;
    } else {
      // 全期間: 一番古い訪問の週から今週までカバーする週数を算出
      if (allVisits.length === 0) {
        weekCount = 12; // データ無ければとりあえず 12 週分の空バケット
      } else {
        const earliest = allVisits.reduce(
          (min, v) => (v.visitedAt < min ? v.visitedAt : min),
          allVisits[0].visitedAt,
        );
        const earliestMon = mondayOf(new Date(earliest));
        const diffMs = thisMon.getTime() - earliestMon.getTime();
        const diffWk = Math.round(diffMs / (1000 * 60 * 60 * 24 * 7));
        weekCount = Math.max(1, diffWk + 1);
      }
    }

    const buckets: WeekBucket[] = [];
    for (let i = weekCount - 1; i >= 0; i--) {
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
  }, [allVisits, span]);

  // ── 訪問ログ内訳(スタックバー＋レジェンド)用の統計 ──
  // weekly と同じ範囲で集計、会えた率も計算
  const breakdownStats = useMemo(() => {
    const counts = emptyStatusCounts();
    for (const w of weekly) {
      for (const s of Object.keys(counts) as VisitStatus[]) counts[s] += w.counts[s];
    }
    const total = (Object.values(counts) as number[]).reduce((a, b) => a + b, 0);
    // 「会えた確率」= (本人 + 家族 + 拒否) / 総訪問件数
    // ヒデさん指示(2026-04-26): 拒否も「人は出てきた」=会えた扱いに含める
    const metCount = counts.met_self + counts.met_family + counts.refused;
    const metRate = total > 0 ? Math.round((metCount / total) * 100) : 0;
    return { counts, total, metRate };
  }, [weekly]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-[var(--color-subtext)]">読み込み中...</p>
      </div>
    );
  }

  // 訪問あった週数(=回数)、Hero 用
  const visitWeekCount = weekly.filter(w => w.total > 0).length;
  // 今週も訪問あったか(緑バッジ用)
  const thisWeekVisited = (weekly[weekly.length - 1]?.total ?? 0) > 0;
  // バーの最大値(割り算事故防止)
  const maxWeekCount = Math.max(1, ...weekly.map(w => w.total));
  // 訪問ログ内訳のスタックバー順
  const statusOrder: VisitStatus[] = ['met_self', 'met_family', 'absent', 'refused', 'unknown_address', 'moved'];

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
          {/* (旧: 上部の期間タブ "全期間/1週間/1ヶ月/..." はメインカードに効かず体験が悪かったので
              撤廃した。代わりに「家庭訪問の回数」カードに局所的なスパン切替を入れてある) */}

          {/* 弁当グリッド：スマホ=1列 / タブレット=2列 / PC=4列 */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
            style={{ gap: 'var(--tune-card-gap, 1rem)' }}
          >

            {/* ────────────── 家庭訪問の回数 ────────────── */}
            {/* 横棒グラフ(B案ベース) + スパン切替 */}
            <div
              className="ios-card hover:!opacity-100 md:col-span-2 lg:col-span-2 flex flex-col"
              style={{ padding: 'var(--tune-card-pad, 2.125rem)' }}
            >
              {/* ヘッダー: 左=タイトル+サブ / 右=Hero "N 回" */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold leading-tight">家庭訪問の回数</h3>
                  {thisWeekVisited && (
                    <p className="text-xs mt-0.5 text-[#10B981] font-bold">今週も訪問済み</p>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span
                    className="font-extrabold tabular-nums leading-none text-[#111]"
                    style={{
                      fontSize: 'var(--tune-hero-size, 4rem)',
                      letterSpacing: 'var(--tune-hero-tracking, -0.06em)',
                    }}
                  >
                    {visitWeekCount}
                  </span>
                  <span className="text-sm font-bold text-[#111]">回</span>
                </div>
              </div>

              {/* スパン切替: iOS 風セグメント UI(4 分割)、右寄せ */}
              <div className="flex justify-end mb-3">
                <div
                  role="tablist"
                  aria-label="期間"
                  className="inline-flex p-0.5 bg-[#F3F4F6] rounded-lg"
                >
                  {SPAN_OPTIONS.map(opt => {
                    const active = span === opt.val;
                    return (
                      <button
                        key={opt.val}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setSpan(opt.val)}
                        className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                          active
                            ? 'bg-white text-[#111] shadow-sm'
                            : 'text-[var(--color-subtext)] active:bg-[#E5E7EB]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 縦積みリスト: 各行=「ラベル(今週/N週間前 + 日付)」を上、
                  その下に横棒バー。すべて左揃え。
                  全期間モードは bucket 数が多くなるので訪問あった週だけに絞る。
                  地区別カードと同じく直近 N 行で畳み、超過分は「続きを見る」展開。 */}
              {(() => {
                // weekly は古い→新しい順なので、表示は新しい(今週)を上に逆順
                const ordered = [...weekly].reverse().map((w, idx) => ({ ...w, agoIdx: idx }));
                const allDisplay = span === -1 ? ordered.filter(w => w.total > 0) : ordered;
                const VISIBLE_LIMIT = 5; // 直近 5 行(=約1ヶ月分)まで先に見せる
                const visible = expandWeeks ? allDisplay : allDisplay.slice(0, VISIBLE_LIMIT);
                const hasMore = allDisplay.length > VISIBLE_LIMIT;
                return (
                  <>
                    <div className="space-y-3">
                      {visible.map(w => {
                        const hit = w.total > 0;
                        const widthPct = hit ? Math.max(12, (w.total / maxWeekCount) * 100) : 4;
                        return (
                          <div key={w.startStr} className="flex flex-col items-stretch">
                            {/* ラベル(行1): 今週 / 先週 / N週間前 + 日付 (左揃え) */}
                            <div className="flex items-baseline gap-1.5 mb-1">
                              <span
                                className={`text-[12px] font-bold leading-none ${
                                  w.agoIdx === 0 ? 'text-[#111]' : 'text-[#6B7280]'
                                }`}
                              >
                                {weekJaLabel(w.agoIdx)}
                              </span>
                              <span className="text-[10px] tabular-nums text-[#9CA3AF]">
                                {w.start.getMonth() + 1}/{w.start.getDate()}
                              </span>
                            </div>
                            {/* バー(行2) */}
                            <div className="h-5 rounded-md bg-[#F3F4F6] overflow-hidden relative">
                              <div
                                className="h-full rounded-md transition-all flex items-center justify-end px-2"
                                style={{
                                  width: `${widthPct}%`,
                                  background: hit ? '#10B981' : '#F3F4F6',
                                }}
                              >
                                {hit && (
                                  <span className="text-[11px] font-bold tabular-nums text-white">
                                    {w.total}
                                  </span>
                                )}
                              </div>
                              {!hit && (
                                <span className="absolute inset-y-0 left-2 flex items-center text-[11px] tabular-nums text-[#9CA3AF]">
                                  0
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {span === -1 && allDisplay.length === 0 && (
                        <p className="text-sm text-[var(--color-subtext)] py-4 text-center">訪問記録がまだありません</p>
                      )}
                    </div>
                    {hasMore && (
                      <div className="flex justify-center mt-3">
                        <button
                          onClick={() => setExpandWeeks(v => !v)}
                          aria-expanded={expandWeeks}
                          className="px-4 py-1.5 rounded-full border border-[#D1D5DB] text-[11px] text-[#6B7280] bg-white active:opacity-60 transition-opacity"
                        >
                          {expandWeeks ? '閉じる' : `続きを見る (+${allDisplay.length - VISIBLE_LIMIT})`}
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* ────────────── 訪問ログ内訳 ────────────── */}
            {/* (旧 訪問人数の推移カードを置き換え)
                ヘッダーレイアウトは「家庭訪問の回数」と同じ:
                  左 = タイトル + サブ「会えた確率」 / 右 = Hero "N %"
                中身 = カテゴリ別の割合スタックバー + レジェンド */}
            <div
              className="ios-card hover:!opacity-100 md:col-span-2 lg:col-span-2 flex flex-col"
              style={{ padding: 'var(--tune-card-pad, 2.125rem)' }}
            >
              {/* ヘッダー */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold leading-tight">訪問ログ内訳</h3>
                  <p className="text-xs mt-0.5 text-[var(--color-subtext)] font-medium">会えた確率</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span
                    className="font-extrabold tabular-nums leading-none text-[#111]"
                    style={{
                      fontSize: 'var(--tune-hero-size, 4rem)',
                      letterSpacing: 'var(--tune-hero-tracking, -0.06em)',
                    }}
                  >
                    {breakdownStats.metRate}
                  </span>
                  <span className="text-sm font-bold text-[#111]">%</span>
                </div>
              </div>

              {/* 中身: スタックバー(視覚的内訳) + 4 ブロック(会えた / 会えてない / 住所不明 / 転居)
                  各ブロック: メイン=パーセント、サブ=件数(または内訳件数)。 */}
              <div className="mt-auto">
                {breakdownStats.total === 0 ? (
                  <p className="text-sm text-[var(--color-subtext)] py-4 text-center">訪問記録がまだありません</p>
                ) : (() => {
                  const c = breakdownStats.counts;
                  const total = breakdownStats.total;
                  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
                  // 4 ブロックの定義(色は各カテゴリ系統色に揃える)
                  // ヒデさん指示(2026-04-26): 拒否は「会えた」に含める。
                  // → 「会えてない」 = 不在のみ になるので、ブロック名も「不在」に統一
                  const blocks = [
                    {
                      key: 'met',
                      label: '会えた',
                      count: c.met_self + c.met_family + c.refused,
                      sub: `本人 ${c.met_self} / 家族 ${c.met_family} / 拒否 ${c.refused}`,
                      fg: '#10B981',
                      bg: '#ECFDF5',
                    },
                    {
                      key: 'absent',
                      label: '不在',
                      count: c.absent,
                      sub: `${c.absent} 件`,
                      fg: '#6B7280',
                      bg: '#F3F4F6',
                    },
                    {
                      key: 'unknown',
                      label: '住所不明',
                      count: c.unknown_address,
                      sub: `${c.unknown_address} 件`,
                      fg: '#F59E0B',
                      bg: '#FFFBEB',
                    },
                    {
                      key: 'moved',
                      label: '転居',
                      count: c.moved,
                      sub: `${c.moved} 件`,
                      fg: '#8B5CF6',
                      bg: '#F5F3FF',
                    },
                  ];
                  return (
                    <>
                      {/* スタックバー(視覚的内訳) */}
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-[var(--color-subtext)]">カテゴリ別の割合</span>
                        <span className="text-[12px] font-bold">全 {total} 件</span>
                      </div>
                      <div
                        className="flex rounded-full overflow-hidden bg-[#F3F4F6] mb-3"
                        style={{ height: '0.875rem' }}
                      >
                        {statusOrder.map(status => {
                          const cc = c[status];
                          if (cc === 0) return null;
                          const pp = (cc / total) * 100;
                          return (
                            <div
                              key={status}
                              className="h-full transition-[width] duration-500"
                              style={{ width: `${pp}%`, backgroundColor: STATUS_HEX[status] }}
                              title={`${VISIT_STATUS_CONFIG[status].label}: ${cc}件`}
                            />
                          );
                        })}
                      </div>

                      {/* 4 ブロック (2x2 グリッド) */}
                      <div className="grid grid-cols-2 gap-2">
                        {blocks.map(b => (
                          <div
                            key={b.key}
                            className="rounded-xl p-3"
                            style={{ backgroundColor: b.bg }}
                          >
                            <div
                              className="text-[11px] font-bold"
                              style={{ color: b.fg }}
                            >
                              {b.label}
                            </div>
                            {/* メイン = パーセント (大きめ) */}
                            <div className="flex items-baseline gap-1 mt-0.5">
                              <span
                                className="font-extrabold tabular-nums leading-none"
                                style={{
                                  color: b.fg,
                                  fontSize: '1.875rem',
                                  letterSpacing: '-0.04em',
                                }}
                              >
                                {pct(b.count)}
                              </span>
                              <span className="text-[12px] font-bold" style={{ color: b.fg }}>
                                %
                              </span>
                            </div>
                            {/* サブ = 件数 / 内訳 */}
                            <div
                              className="text-[10px] mt-1"
                              style={{ color: b.fg, opacity: 0.85 }}
                            >
                              {b.sub}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* ────────────── 地区別タイル ────────────── */}
            {(() => {
              const allDistricts = Array.from(stats.districtStats.entries());
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
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: hex }} />
                            <span className="text-[13px] font-semibold text-[#111] truncate">{short}</span>
                          </div>
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

            {/* ────────────── 訪問した回数が多い人 ────────────── */}
            {(() => {
              const ranked = members
                .filter(m => m.totalVisits > 0)
                .sort((a, b) => b.totalVisits - a.totalVisits)
                .slice(0, 5);
              return (
                <div
                  className="ios-card hover:!opacity-100 md:col-span-1 lg:col-span-2"
                  style={{ padding: 'var(--tune-card-pad, 2.125rem)' }}
                >
                  <div className="flex items-baseline gap-2 mb-2">
                    <div>
                      <h3 className="text-lg font-bold leading-tight">訪問した回数が多い人</h3>
                      <p className="text-xs text-[var(--color-subtext)] mt-0.5">TOP5(全期間)</p>
                    </div>
                  </div>
                  <div>
                    {ranked.map((m, i) => {
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
