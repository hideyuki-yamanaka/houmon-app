'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import type { MemberWithVisitInfo, Visit, VisitStatus } from '../../lib/types';
import { getMembersWithVisitInfo, getAllVisits } from '../../lib/storage';
import { VISIT_STATUS_CONFIG, DISTRICT_COLORS } from '../../lib/constants';
import MembersListBottomSheet from '../../components/MembersListBottomSheet';
import PersonIcon from '../../components/PersonIcon';
import { useTeamProfiles } from '../../lib/useTeamProfiles';

// ─── ダッシュボードのドリルダウン用 シート種別 ───
// (段階 A: state とシート mount だけを先に入れて Safari 互換性を確認する。
//  各 UI への onClick は段階 B で追加する)
type SheetSpec =
  | { kind: 'week'; weekStartStr: string; agoIdx: number }
  | { kind: 'status'; statuses: VisitStatus[]; label: string }
  | { kind: 'district'; district: string };

// ステータスごとのカラー(SVG/inline style 用)。VISIT_STATUS_CONFIG.dot に揃えてある。
// ヒデさん指示(2026-04-26): 「本人に会えた」「家族に会えた」は同色で扱う。
const STATUS_HEX: Record<VisitStatus, string> = {
  met_self:        VISIT_STATUS_CONFIG.met_self.dot,
  met_family:      VISIT_STATUS_CONFIG.met_family.dot,
  absent:          VISIT_STATUS_CONFIG.absent.dot,
  refused:         VISIT_STATUS_CONFIG.refused.dot,
  unknown_address: VISIT_STATUS_CONFIG.unknown_address.dot,
  moved:           VISIT_STATUS_CONFIG.moved.dot,
};

// ── 期間フィルタ (2026-05-04 ヒデさん指示で追加) ──
//   全期間 (デフォルト) では「直近 12 週固定」をやめて 訪問のあった全期間を見せる。
//   特定期間を選ぶと そこに絞り込み、全カード(回数 / 内訳 / 地区 / TOP5) に効く。
type PeriodFilter = 'all' | 'today' | 'this_week' | 'last_week' | '1m' | '6m' | '1y';
const PERIOD_LABEL: Record<PeriodFilter, string> = {
  all:       '全期間',
  today:     '本日',
  this_week: '今週',
  last_week: '先週',
  '1m':      '直近1ヶ月',
  '6m':      '直近半年',
  '1y':      '直近1年',
};
const PERIOD_ORDER: PeriodFilter[] = ['all', 'today', 'this_week', 'last_week', '1m', '6m', '1y'];

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

/** 期間フィルタの開始/終了日 (visited_at と直接比較できる 'YYYY-MM-DD' 文字列).
 *  終了は今日。開始は フィルタ種別による。'all' は全期間扱い (空文字 = 制限なし). */
function periodRange(p: PeriodFilter): { start: string; end: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = fmtDate(today);
  if (p === 'all') return { start: '', end: todayStr };

  if (p === 'today') {
    return { start: todayStr, end: todayStr };
  }
  if (p === 'this_week') {
    return { start: fmtDate(mondayOf(today)), end: todayStr };
  }
  if (p === 'last_week') {
    const thisMon = mondayOf(today);
    const lastMon = new Date(thisMon); lastMon.setDate(thisMon.getDate() - 7);
    const lastSun = new Date(thisMon); lastSun.setDate(thisMon.getDate() - 1);
    return { start: fmtDate(lastMon), end: fmtDate(lastSun) };
  }
  const start = new Date(today);
  if (p === '1m') start.setDate(today.getDate() - 30);
  else if (p === '6m') start.setMonth(today.getMonth() - 6);
  else if (p === '1y') start.setFullYear(today.getFullYear() - 1);
  return { start: fmtDate(start), end: todayStr };
}

export default function LogPage() {
  const [members, setMembers] = useState<MemberWithVisitInfo[]>([]);
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  // ドリルダウン: 各UIタップで開く メンバー一覧シート
  const [sheetSpec, setSheetSpec] = useState<SheetSpec | null>(null);
  // 2026-05-04 フィルタ: 人 (作成者) + 期間
  // 2026-05-06 ヒデさん指示で localStorage に保存して次回もチラつきなく復元する。
  // SSR で window が無いので初期値はデフォルトのまま、useEffect でマウント後に上書き。
  const [personFilter, setPersonFilter] = useState<string>('all');   // 'all' | userId
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const router = useRouter();
  const { profileMap } = useTeamProfiles();

  // ── localStorage からフィルタ復元 ──
  // PERIOD_ORDER に含まれる値・personFilter は string なら採用 ('all' か userId 想定)。
  useEffect(() => {
    try {
      const rawPeriod = window.localStorage.getItem('houmon-app:log-period-filter');
      if (rawPeriod && (PERIOD_ORDER as string[]).includes(rawPeriod)) {
        setPeriodFilter(rawPeriod as PeriodFilter);
      }
      const rawPerson = window.localStorage.getItem('houmon-app:log-person-filter');
      if (rawPerson) setPersonFilter(rawPerson);
    } catch { /* private mode 等は無視 */ }
  }, []);

  // ── フィルタ変更時 localStorage に保存 ──
  useEffect(() => {
    try { window.localStorage.setItem('houmon-app:log-period-filter', periodFilter); } catch { /* 無視 */ }
  }, [periodFilter]);
  useEffect(() => {
    try { window.localStorage.setItem('houmon-app:log-person-filter', personFilter); } catch { /* 無視 */ }
  }, [personFilter]);

  useEffect(() => {
    Promise.all([getMembersWithVisitInfo(), getAllVisits()])
      .then(([m, v]) => { setMembers(m); setAllVisits(v); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── フィルタ適用済み訪問リスト (2026-05-04) ──
  // 人 (created_by) + 期間 (visited_at 範囲) で絞り込み。
  // この後の weekly / breakdown / district / TOP5 の元データになる。
  const filteredVisits = useMemo<Visit[]>(() => {
    const range = periodRange(periodFilter);
    return allVisits.filter(v => {
      if (personFilter !== 'all' && v.createdBy !== personFilter) return false;
      if (range.start && v.visitedAt < range.start) return false;
      if (v.visitedAt > range.end) return false;
      return true;
    });
  }, [allVisits, personFilter, periodFilter]);

  // ── 地区別タイル用 統計 (filteredVisits ベース) ──
  // 旧: 全期間 allVisits 固定 → フィルタに連動するように変更。
  const stats = useMemo(() => {
    const districtStats = new Map<string, { total: number; visited: number }>();
    for (const m of members) {
      const d = districtStats.get(m.district) ?? { total: 0, visited: 0 };
      d.total++;
      if (filteredVisits.some(v => v.memberId === m.id)) d.visited++;
      districtStats.set(m.district, d);
    }
    return { districtStats };
  }, [members, filteredVisits]);

  // ── 週別バケット (filteredVisits ベース) ──
  // 全期間: 訪問のあった最古の週から今週まで全部。 デフォルトでスクロール表示。
  // 期間フィルタ: その範囲内の週だけ。
  // 「家庭訪問の回数」「訪問ログ内訳」両カードで使う。
  const weekly = useMemo<WeekBucket[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMon = mondayOf(today);

    // 範囲決定: 期間フィルタが all なら 訪問の最古週、それ以外は periodRange.start。
    let earliestMon: Date;
    if (periodFilter === 'all') {
      if (filteredVisits.length === 0) {
        // 訪問ゼロなら 今週 1 週だけ作っておく(空表示)
        return [{ start: thisMon, startStr: fmtDate(thisMon), counts: emptyStatusCounts(), total: 0 }];
      }
      const earliestStr = filteredVisits.reduce((min, v) => v.visitedAt < min ? v.visitedAt : min, filteredVisits[0].visitedAt);
      earliestMon = mondayOf(new Date(earliestStr));
    } else {
      const r = periodRange(periodFilter);
      earliestMon = mondayOf(new Date(r.start));
    }

    const buckets: WeekBucket[] = [];
    const cursor = new Date(earliestMon);
    while (cursor.getTime() <= thisMon.getTime()) {
      const startCopy = new Date(cursor);
      buckets.push({ start: startCopy, startStr: fmtDate(startCopy), counts: emptyStatusCounts(), total: 0 });
      cursor.setDate(cursor.getDate() + 7);
    }
    for (const v of filteredVisits) {
      const vMonStr = fmtDate(mondayOf(new Date(v.visitedAt)));
      const b = buckets.find(b => b.startStr === vMonStr);
      if (b) { b.counts[v.status]++; b.total++; }
    }
    return buckets;
  }, [filteredVisits, periodFilter]);

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

  // ── ボトムシート用: タイトルと該当メンバーを spec から動的に算出 ──
  // ⚠ 重要: useMemo は必ず early return より上に置くこと(React Rules of Hooks)。
  //   ここを早期リターン後に置くと初回(loading=true)では呼ばれず、データ取得後に
  //   突然 hooks の数が増えて「Rendered more hooks than during the previous render」
  //   が起きる(2026-05-02 Safari でクラッシュした真犯人)。
  const sheetData = useMemo<{
    title: string | null;
    members: MemberWithVisitInfo[];
    visitsByMember: Map<string, Visit[]>;
  }>(() => {
    // 共通: メンバー単位の訪問ログ Map(新しい順)。シート内の MemberCard withLogs に渡す.
    // 2026-05-04: ダッシュボードのフィルタに合わせて filteredVisits を使う.
    const buildVbm = (ms: MemberWithVisitInfo[]): Map<string, Visit[]> => {
      const wanted = new Set(ms.map(m => m.id));
      const map = new Map<string, Visit[]>();
      for (const v of filteredVisits) {
        if (!wanted.has(v.memberId)) continue;
        const arr = map.get(v.memberId);
        if (arr) arr.push(v);
        else map.set(v.memberId, [v]);
      }
      return map;
    };

    if (!sheetSpec) return { title: null, members: [], visitsByMember: new Map() };
    const memberById = new Map<string, MemberWithVisitInfo>(members.map(m => [m.id, m]));

    if (sheetSpec.kind === 'week') {
      const ids = new Set<string>();
      for (const v of filteredVisits) {
        const vMon = fmtDate(mondayOf(new Date(v.visitedAt)));
        if (vMon === sheetSpec.weekStartStr) ids.add(v.memberId);
      }
      const list = [...ids].map(id => memberById.get(id)).filter(Boolean) as MemberWithVisitInfo[];
      return {
        title: `${weekJaLabel(sheetSpec.agoIdx)}に訪問したメンバー`,
        members: list,
        visitsByMember: buildVbm(list),
      };
    }

    if (sheetSpec.kind === 'status') {
      const set = new Set<VisitStatus>(sheetSpec.statuses);
      const cutoff = weekly[0]?.startStr ?? '';
      const ids = new Set<string>();
      for (const v of filteredVisits) {
        if (!set.has(v.status)) continue;
        if (cutoff && v.visitedAt < cutoff) continue;
        ids.add(v.memberId);
      }
      const list = [...ids].map(id => memberById.get(id)).filter(Boolean) as MemberWithVisitInfo[];
      return {
        title: `${sheetSpec.label}のメンバー`,
        members: list,
        visitsByMember: buildVbm(list),
      };
    }

    // district: その地区の中で、絞り込みされた訪問が 1件以上あるメンバーだけ
    const visitedIds = new Set(filteredVisits.map(v => v.memberId));
    const list = members.filter(m => m.district === sheetSpec.district && visitedIds.has(m.id));
    // 2026-05-05 正規化後 district は "英雄地区" 等で既に末尾に「地区」がついてる。
    // 重複を避け、何も無ければ「(不明)地区のメンバー」を回避するためそのまま使う。
    return {
      title: `${sheetSpec.district}のメンバー`,
      members: list,
      visitsByMember: buildVbm(list),
    };
  }, [sheetSpec, members, filteredVisits, weekly]);

  // 人プルダウン用: チームメンバー一覧 (display_name 順)
  // ⚠ 必ず early return より上 (Rules of Hooks)
  const teamOptions = useMemo(() => {
    const arr: { id: string; name: string }[] = [];
    profileMap.forEach((p, id) => arr.push({ id, name: p.display_name }));
    arr.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    return arr;
  }, [profileMap]);

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
          {/* ────────────── フィルタ (人 + 期間) ────────────── */}
          <div className="flex gap-2 mb-3 flex-wrap">
            <FilterDropdown
              icon={<PersonIcon size={12} />}
              label={personFilter === 'all' ? '全員' : (teamOptions.find(o => o.id === personFilter)?.name ?? '?')}
              value={personFilter}
              options={[{ id: 'all', name: '全員' }, ...teamOptions]}
              onChange={setPersonFilter}
            />
            <FilterDropdown
              label={PERIOD_LABEL[periodFilter]}
              value={periodFilter}
              options={PERIOD_ORDER.map(p => ({ id: p, name: PERIOD_LABEL[p] }))}
              onChange={(v) => setPeriodFilter(v as PeriodFilter)}
            />
          </div>

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
                    <p className="text-xs mt-0.5 text-[#111] font-bold">今週も訪問済み</p>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <RollupNum
                    value={visitWeekCount}
                    className="tabular-nums leading-none text-[#111]"
                    style={{
                      fontSize: 'var(--tune-hero-size, 4rem)',
                      fontWeight: 'var(--tune-hero-weight, 700)',
                      letterSpacing: 'var(--tune-hero-tracking, -0.03em)',
                    }}
                  />
                  <span className="text-sm font-bold text-[#111]">回</span>
                </div>
              </div>

              {/* 縦積みリスト: 各行=「ラベル(今週/N週間前 + 日付)」を上、
                  その下に横棒バー、すべて左揃え。
                  約 5 行ぶんの高さで畳み、超過分はカード内で縦スクロール。
                  (旧: スパン切替・続きを見る を持っていたが、ヒデさん指示で撤去) */}
              <div
                className="overflow-y-auto pr-1"
                style={{ maxHeight: '260px' }}
              >
                <div
                  key={`${personFilter}-${periodFilter}`}
                  className="space-y-3"
                >
                  {(() => {
                    // weekly は古い→新しい順なので、表示は新しい(今週)を上に逆順
                    const ordered = [...weekly].reverse().map((w, idx) => ({ ...w, agoIdx: idx }));
                    return ordered.map((w, displayIdx) => {
                      const hit = w.total > 0;
                      const widthPct = hit ? Math.max(12, (w.total / maxWeekCount) * 100) : 4;
                      // 日付範囲ラベル (B案): 5/4〜10 (同月) / 4/27〜5/3 (月跨ぎ)
                      const sun = new Date(w.start);
                      sun.setDate(w.start.getDate() + 6);
                      const sameMonth = w.start.getMonth() === sun.getMonth();
                      const dateRange = sameMonth
                        ? `${w.start.getMonth() + 1}/${w.start.getDate()}〜${sun.getDate()}`
                        : `${w.start.getMonth() + 1}/${w.start.getDate()}〜${sun.getMonth() + 1}/${sun.getDate()}`;
                      // スタッガー遅延 (上から順に 50ms ずつ)
                      const animDelay = `${Math.min(displayIdx, 8) * 50}ms`;
                      // 内側: 日付範囲 + 今週/先週バッジ (B案: 大きめ ソリッドピル)
                      const inner = (
                        <>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span
                              className={`text-[12px] font-bold leading-none tabular-nums ${
                                w.agoIdx === 0 ? 'text-[#111]' : 'text-[#374151]'
                              }`}
                            >
                              {dateRange}
                            </span>
                            {w.agoIdx === 0 && (
                              <span
                                className="text-[10px] px-2 py-[3px] rounded-full font-bold tracking-wide"
                                style={{ color: '#FFFFFF', background: '#4B5563' }}
                              >
                                今週
                              </span>
                            )}
                            {w.agoIdx === 1 && (
                              <span
                                className="text-[10px] px-2 py-[3px] rounded-full font-bold tracking-wide"
                                style={{ color: '#FFFFFF', background: '#9CA3AF' }}
                              >
                                先週
                              </span>
                            )}
                          </div>
                          <div className="h-5 rounded-md bg-[#F3F4F6] overflow-hidden relative">
                            <div
                              className={`h-full rounded-md flex items-center justify-end px-2 ${hit ? 'animate-bar-stagger' : ''}`}
                              style={{
                                width: `${widthPct}%`,
                                background: hit ? '#4B5563' : '#F3F4F6',
                                animationDelay: hit ? animDelay : undefined,
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
                        </>
                      );
                      // 訪問あった週だけクリック可能。0 件週は非インタラクティブな div のまま。
                      // (Safari iOS で disabled button が稀にレイアウト崩れる前歴あり、
                      //  クリッカブルじゃないものは div で出す方が安全)
                      // ⚠ button は w-full を明示しないとデフォで shrink-to-fit になり
                      //   バーが中身幅(数字分)まで縮んでしまう(2026-05-02 ヒデさん指摘で修正)
                      if (!hit) {
                        return (
                          <div key={w.startStr} className="w-full flex flex-col items-stretch">
                            {inner}
                          </div>
                        );
                      }
                      return (
                        <button
                          key={w.startStr}
                          type="button"
                          onClick={() => setSheetSpec({
                            kind: 'week',
                            weekStartStr: w.startStr,
                            agoIdx: w.agoIdx,
                          })}
                          aria-label={`${weekJaLabel(w.agoIdx)} ${w.total} 件の訪問メンバーを見る`}
                          className="w-full block text-left rounded-md cursor-pointer active:opacity-60 transition-opacity"
                        >
                          {inner}
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
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
              {/* ヘッダー
                  - 左 = タイトル + サブ「直近12週分」(セクション説明 7 字以内)
                  - 右 = 「会えた確率」(小、23 の左に下揃え) + Hero 「23」 + 「%」
                  ヒデさん指示(2026-04-26): サブの旧文言「会えた確率」は Hero 横に移動 */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold leading-tight">訪問ログ内訳</h3>
                  <p className="text-xs mt-0.5 text-[var(--color-subtext)] font-medium">直近12週分</p>
                </div>
                <div className="flex items-baseline gap-1.5">
                  {/* 「会えた確率」を 23 の左、ベースライン揃え(下揃え)で配置 */}
                  <span className="text-[11px] font-medium text-[var(--color-subtext)] whitespace-nowrap">
                    会えた確率
                  </span>
                  <RollupNum
                    value={breakdownStats.metRate}
                    className="tabular-nums leading-none text-[#111]"
                    style={{
                      fontSize: 'var(--tune-hero-size, 4rem)',
                      fontWeight: 'var(--tune-hero-weight, 700)',
                      letterSpacing: 'var(--tune-hero-tracking, -0.03em)',
                    }}
                  />
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
                  // タップ時は statuses 群を spec に渡してメンバーシートを開く
                  const blocks: {
                    key: string; label: string; count: number; sub: string;
                    fg: string; bg: string; statuses: VisitStatus[];
                  }[] = [
                    {
                      key: 'met',
                      label: '会えた',
                      count: c.met_self + c.met_family + c.refused,
                      sub: `本人 ${c.met_self} / 家族 ${c.met_family} / 拒否 ${c.refused}`,
                      fg: '#4B5563',
                      bg: '#F3F4F6',
                      statuses: ['met_self', 'met_family', 'refused'],
                    },
                    {
                      key: 'absent',
                      label: '不在',
                      count: c.absent,
                      sub: `${c.absent} 件`,
                      fg: '#6B7280',
                      bg: '#F3F4F6',
                      statuses: ['absent'],
                    },
                    {
                      key: 'unknown',
                      label: '住所不明',
                      count: c.unknown_address,
                      sub: `${c.unknown_address} 件`,
                      fg: '#F59E0B',
                      bg: '#FFFBEB',
                      statuses: ['unknown_address'],
                    },
                    {
                      key: 'moved',
                      label: '転居',
                      count: c.moved,
                      sub: `${c.moved} 件`,
                      fg: '#8B5CF6',
                      bg: '#F5F3FF',
                      statuses: ['moved'],
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

                      {/* 4 ブロック (2x2 グリッド) — 0 件以外はタップで該当メンバー一覧 */}
                      <div className="grid grid-cols-2 gap-2">
                        {blocks.map(b => {
                          const inner = (
                            <>
                              <div
                                className="text-[11px] font-bold"
                                style={{ color: b.fg }}
                              >
                                {b.label}
                              </div>
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
                              <div
                                className="text-[10px] mt-1"
                                style={{ color: b.fg, opacity: 0.85 }}
                              >
                                {b.sub}
                              </div>
                            </>
                          );
                          // 0 件はタップ無効 → div でレンダー
                          if (b.count === 0) {
                            return (
                              <div
                                key={b.key}
                                className="rounded-xl p-3"
                                style={{ backgroundColor: b.bg }}
                              >
                                {inner}
                              </div>
                            );
                          }
                          // 1 件以上は button(タップでシート展開)
                          return (
                            <button
                              key={b.key}
                              type="button"
                              onClick={() => setSheetSpec({
                                kind: 'status',
                                statuses: b.statuses,
                                label: b.label,
                              })}
                              aria-label={`${b.label}のメンバー ${b.count}件を見る`}
                              className="rounded-xl p-3 text-left active:opacity-70 transition-opacity"
                              style={{ backgroundColor: b.bg }}
                            >
                              {inner}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* ────────────── 地区別 (ドーナツ × シングルカラム / 案 1) ──────────────
                2026-05-05: 旧 3 列タイルから「左ドーナツ + 数値右」 1 列リストに刷新。
                  - 数値が 2〜3 桁になっても折り返さない (右揃え固定幅 + tabular-nums)
                  - 全地区がスクロールで閲覧可能 ("続きを見る" ボタン廃止)
                  - 行 = 1 つの地区、タップで MemberBottomSheet を開く */}
            {(() => {
              const allDistricts = Array.from(stats.districtStats.entries());
              allDistricts.sort(([, a], [, b]) => b.visited - a.visited);
              return (
                <div
                  className="ios-card hover:!opacity-100 md:col-span-1 lg:col-span-2 flex flex-col"
                  style={{ padding: 'var(--tune-card-pad, 2.125rem)', maxHeight: 480 }}
                >
                  <div className="flex items-baseline gap-2 mb-2.5 shrink-0">
                    <div>
                      <h3 className="text-lg font-bold leading-tight">地区別</h3>
                      <p className="text-xs text-[var(--color-subtext)] mt-0.5">訪問済み人数 ／ 地区の総人数</p>
                    </div>
                    <span className="text-xs text-[var(--color-subtext)] ml-auto">全{allDistricts.length}地区</span>
                  </div>
                  <ul className="flex-1 overflow-y-auto -mx-1 pr-1 divide-y divide-[#F0F0F0]">
                    {allDistricts.map(([district, data]) => {
                      const hex = DISTRICT_COLORS[district]?.hex ?? '#6B7280';
                      // 旧連結形式 "豊岡部英雄地区" の互換 (3 階層化以降は通常剥がし不要)
                      // 地区が空文字 (district 未設定の人) の場合は「??地区」を出す。
                      // ?? は 2026-05-05 から「未設定」placeholder の統一表記。
                      const short = district
                        ? district.replace(/豊岡部|光陽部|豊岡中央支部/g, '')
                        : '??地区';
                      const percent = data.total > 0 ? Math.min(100, (data.visited / data.total) * 100) : 0;
                      const r = 14;
                      const c = 2 * Math.PI * r;
                      const dash = (percent / 100) * c;
                      return (
                        <li key={district}>
                          <button
                            type="button"
                            onClick={() => setSheetSpec({ kind: 'district', district })}
                            aria-label={`${short}のメンバー ${data.total}人を見る`}
                            className="w-full flex items-center gap-3 py-2 px-1 text-left active:opacity-60 transition-opacity"
                          >
                            <span className="relative shrink-0" style={{ width: 32, height: 32 }}>
                              <svg viewBox="0 0 32 32" className="w-full h-full -rotate-90">
                                <circle cx="16" cy="16" r={r} fill="none" stroke="#E5E5E5" strokeWidth="4" />
                                <circle
                                  cx="16" cy="16" r={r} fill="none"
                                  stroke={hex} strokeWidth="4" strokeLinecap="round"
                                  strokeDasharray={`${dash} ${c}`}
                                />
                              </svg>
                            </span>
                            <span className="text-[13px] font-semibold flex-1 truncate text-[#111]">{short}</span>
                            <span className="tabular-nums text-right shrink-0">
                              <span className="text-[14px] font-bold text-[#111]">{data.visited}</span>
                              <span className="text-[11px] text-[var(--color-subtext)]"> / {data.total}人</span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })()}

            {/* ────────────── 訪問した回数が多い人 ────────────── */}
            {(() => {
              // 2026-05-04: filteredVisits から再集計 (人/期間 フィルタを反映)
              // 2026-05-05: 同率順位対応 (count が同じ人は 同率N位 表記)。
              //   競技順位方式 (1, 1, 3, 4) で rank を計算し、同じ count が
              //   2人以上いる場合は ラベルに 「同率」 プレフィックスを付ける。
              const countByMember = new Map<string, number>();
              for (const v of filteredVisits) {
                countByMember.set(v.memberId, (countByMember.get(v.memberId) ?? 0) + 1);
              }
              const sorted = members
                .map(m => ({ m, count: countByMember.get(m.id) ?? 0 }))
                .filter(x => x.count > 0)
                .sort((a, b) => b.count - a.count);
              // 競技順位 (skip-rank): count が同じなら同 rank、次の順位は飛ぶ
              let curRank = 0;
              let prevCount = -1;
              const withRank = sorted.map((entry, idx) => {
                if (entry.count !== prevCount) {
                  curRank = idx + 1;
                  prevCount = entry.count;
                }
                return { ...entry, rank: curRank };
              });
              // 全件における 同 rank の人数 (TOP5 で切る前に数える: 6人目以降に
              //   タイがいても TOP5 内の人は 同率 表記する)
              const rankCount = new Map<number, number>();
              for (const r of withRank) {
                rankCount.set(r.rank, (rankCount.get(r.rank) ?? 0) + 1);
              }
              const ranked = withRank.slice(0, 5);
              return (
                <div
                  className="ios-card hover:!opacity-100 md:col-span-1 lg:col-span-2"
                  style={{ padding: 'var(--tune-card-pad, 2.125rem)' }}
                >
                  <div className="flex items-baseline gap-2 mb-2">
                    <div>
                      <h3 className="text-lg font-bold leading-tight">訪問した回数が多い人</h3>
                      <p className="text-xs text-[var(--color-subtext)] mt-0.5">TOP5({PERIOD_LABEL[periodFilter]})</p>
                    </div>
                  </div>
                  <div>
                    {ranked.map(({ m, count, rank }) => {
                      // メダル色: 順位 1=金 / 2=銀 / 3=銅 / 4以下=灰。
                      // タイ (同率) でも順位ベースで色を揃える。
                      const medalColor = rank === 1 ? '#D97706' : rank === 2 ? '#9CA3AF' : rank === 3 ? '#B45309' : '#9CA3AF';
                      const isTie = (rankCount.get(rank) ?? 0) >= 2;
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
                            className="shrink-0 leading-none font-black flex flex-col items-center justify-center"
                            style={{
                              color: medalColor,
                              minWidth: isTie ? 36 : 28,
                            }}
                          >
                            {isTie && (
                              <span className="text-[9px] font-bold leading-none mb-0.5">同率</span>
                            )}
                            <span
                              className="tabular-nums leading-none"
                              style={{ fontSize: 'var(--tune-ranking-num, 1.5rem)' }}
                            >
                              {rank}
                            </span>
                          </span>
                          <span
                            className="flex-1 truncate"
                            style={{ fontSize: 'var(--tune-ranking-name, 0.875rem)' }}
                          >
                            {m.name}
                          </span>
                          <span className="flex items-baseline gap-0.5">
                            <RollupNum
                              value={count}
                              className="tabular-nums leading-none font-black"
                              style={{ fontSize: 'var(--tune-ranking-num, 1.5rem)' }}
                            />
                            <span className="text-[11px] text-[var(--color-subtext)]">回</span>
                          </span>
                        </Link>
                      );
                    })}
                    {ranked.length === 0 && (
                      <p className="text-sm text-[var(--color-subtext)] py-2">訪問実績のあるメンバーはまだいません</p>
                    )}
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      </div>

      {/* ダッシュボードからの ドリルダウン用 メンバー一覧シート
          週バー / 4 ブロック / 地区タイル のいずれをタップしても
          spec をセットしてこの 1 つのシートに集約する。
          メンバータップで /members/{id} へ遷移、シートは自動で閉じる。 */}
      <MembersListBottomSheet
        title={sheetData.title}
        members={sheetData.members}
        visitsByMember={sheetData.visitsByMember}
        onSelectMember={(id) => {
          setSheetSpec(null);
          router.push(`/members/${id}`);
        }}
        onClose={() => setSheetSpec(null)}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// RollupNum — フィルタ切替時に prev → next を 600ms ease-out で
// なめらかに加算する数字 (ヒデさん採択 案A)
// ──────────────────────────────────────────────────────────────
function RollupNum({ value, className, style }: {
  value: number; className?: string; style?: React.CSSProperties;
}) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const start = prev.current;
    const target = value;
    if (start === target) { setDisplay(target); return; }
    const dur = 600;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + (target - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    prev.current = target;
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className} style={style}>{display}</span>;
}

// ──────────────────────────────────────────────────────────────
// FilterDropdown — シンプルなピル型プルダウン (人 / 期間 共用)
// 外側クリックで閉じる、選択したら自動 close。
// ──────────────────────────────────────────────────────────────
function FilterDropdown({
  icon,
  label,
  value,
  options,
  onChange,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  options: { id: string; name: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-[#E5E7EB] text-[12px] font-bold text-gray-900 active:scale-95 transition-transform"
      >
        {icon}
        {label}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-30 overflow-hidden min-w-[140px] max-h-[280px] overflow-y-auto">
          {options.map(o => (
            <button
              key={o.id}
              type="button"
              onClick={() => { onChange(o.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-[13px] hover:bg-[#F3F4F6] ${value === o.id ? 'bg-[#F9FAFB] font-bold' : ''}`}
            >
              {o.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
