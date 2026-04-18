'use client';

// 地区別カバー率カードのデザイン比較用モックページ
// 5案を同じデータで並べて比較する
// URL: /log/district-mock

import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import type { MemberWithVisitInfo } from '../../../lib/types';
import { getMembersWithVisitInfo } from '../../../lib/storage';

type DistrictRow = {
  name: string;
  short: string;
  total: number;
  visited: number;
  rate: number; // 0-100
};

export default function DistrictMockPage() {
  const [members, setMembers] = useState<MemberWithVisitInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMembersWithVisitInfo()
      .then(setMembers)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const districts: DistrictRow[] = (() => {
    const map = new Map<string, { total: number; visited: number }>();
    for (const m of members) {
      const d = map.get(m.district) ?? { total: 0, visited: 0 };
      d.total += 1;
      if (m.lastVisitDate) d.visited += 1;
      map.set(m.district, d);
    }
    return Array.from(map.entries()).map(([name, v]) => ({
      name,
      short: name.replace(/豊岡部|光陽部|豊岡中央支部/g, ''),
      total: v.total,
      visited: v.visited,
      rate: v.total > 0 ? Math.round((v.visited / v.total) * 100) : 0,
    }));
  })();

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
        <h1 className="text-xl font-bold text-center">地区カード モック比較</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div
          className="max-w-[1366px] mx-auto px-4 pt-3 space-y-6"
          style={{ paddingBottom: 'calc(60px + env(safe-area-inset-bottom) + 16px)' }}
        >
          <p className="text-xs text-[var(--color-subtext)]">
            ※ 実データ（全{districts.length}地区）で5案を比較。気に入ったやつ教えてな〜
          </p>

          <MockSection
            title="案A：ヒートマップ・タイル"
            caption="背景色の濃淡でカバー率を表現。地図的で直感的、余白が自然に埋まる"
          >
            <DesignA districts={districts} />
          </MockSection>

          <MockSection
            title="案B：リング・バッジ"
            caption="各セルに小さな円形プログレスリング。スコアカード感が出て、地区ごとの達成バッジらしい見せ方"
          >
            <DesignB districts={districts} />
          </MockSection>

          <MockSection
            title="案C：ビッグナンバー"
            caption="カバー率の数字をドカンとでかく。ダッシュボードらしい定量感"
          >
            <DesignC districts={districts} />
          </MockSection>

          <MockSection
            title="案D：コニック・ボーダー"
            caption="カードの枠線そのものが進捗アーク。枠が主役になって「地区の区画」感が強い"
          >
            <DesignD districts={districts} />
          </MockSection>

          <MockSection
            title="案E：フィル・メーター"
            caption="タイル下部から上に向けて塗りが上がる。水位計みたいで「溜まり具合」が直感的"
          >
            <DesignE districts={districts} />
          </MockSection>
        </div>
      </div>
    </div>
  );
}

function MockSection({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2">
        <h2 className="text-base font-bold">{title}</h2>
        <p className="text-[11px] text-[var(--color-subtext)] mt-0.5">{caption}</p>
      </div>
      <div className="ios-card p-4 hover:!opacity-100">
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={16} className="text-[#111]" />
          <h3 className="text-sm font-semibold">地区別訪問カバー率</h3>
        </div>
        {children}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   案A：ヒートマップ・タイル
   背景色のα値 = カバー率。率が高いほど濃い黒ベース。
   文字は反転が必要になる濃度以上（>60%）で白寄りにする。
   ───────────────────────────────────────────── */
function DesignA({ districts }: { districts: DistrictRow[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {districts.map(d => {
        const alpha = 0.06 + (d.rate / 100) * 0.72; // 0.06〜0.78
        const isDark = d.rate >= 60;
        return (
          <div
            key={d.name}
            className="rounded-xl border border-[#EBEBEB] p-3 flex flex-col items-center justify-center aspect-square"
            style={{ backgroundColor: `rgba(17, 17, 17, ${alpha})` }}
          >
            <span
              className="text-[11px] font-medium leading-tight text-center"
              style={{ color: isDark ? 'rgba(255,255,255,0.85)' : 'var(--color-subtext)' }}
            >
              {d.short}
            </span>
            <span
              className="text-2xl font-bold tabular-nums leading-none mt-1"
              style={{ color: isDark ? '#fff' : '#111' }}
            >
              {d.rate}%
            </span>
            <span
              className="text-[10px] tabular-nums mt-1"
              style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'var(--color-subtext)' }}
            >
              {d.visited}/{d.total}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   案B：リング・バッジ
   左（または上）に円形プログレス、横に数値
   ───────────────────────────────────────────── */
function DesignB({ districts }: { districts: DistrictRow[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {districts.map(d => {
        const r = 16;
        const c = 2 * Math.PI * r;
        const dash = (d.rate / 100) * c;
        return (
          <div
            key={d.name}
            className="rounded-xl border border-[#EBEBEB] bg-white p-3 flex items-center gap-2.5"
          >
            <div className="relative w-11 h-11 shrink-0">
              <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
                <circle cx="20" cy="20" r={r} fill="none" stroke="#F0F0F0" strokeWidth="4" />
                <circle
                  cx="20" cy="20" r={r} fill="none" stroke="#111" strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={`${dash} ${c}`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-bold tabular-nums">{d.rate}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold truncate leading-tight">{d.short}</div>
              <div className="text-[10px] text-[var(--color-subtext)] tabular-nums mt-0.5">
                {d.visited}/{d.total}件
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   案C：ビッグナンバー
   巨大な% + 下に地区名＋ミニバー
   ───────────────────────────────────────────── */
function DesignC({ districts }: { districts: DistrictRow[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {districts.map(d => {
        const lowRate = d.rate < 50;
        return (
          <div
            key={d.name}
            className="rounded-xl border border-[#EBEBEB] bg-white p-3 flex flex-col justify-between aspect-square"
          >
            <div>
              <span
                className="text-3xl font-black tabular-nums leading-none"
                style={{ color: lowRate ? '#B91C1C' : '#111' }}
              >
                {d.rate}
              </span>
              <span className="text-sm font-bold ml-0.5" style={{ color: lowRate ? '#B91C1C' : '#111' }}>%</span>
            </div>
            <div>
              <div className="text-[11px] font-semibold truncate">{d.short}</div>
              <div className="h-1 bg-[#F0F0F0] rounded-full mt-1 overflow-hidden">
                <div className="h-full rounded-full bg-[#111]" style={{ width: `${d.rate}%` }} />
              </div>
              <div className="text-[10px] text-[var(--color-subtext)] tabular-nums mt-1">
                {d.visited}/{d.total}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   案D：コニック・ボーダー
   カードの外周に沿った conic-gradient のアークで進捗を示す
   ───────────────────────────────────────────── */
function DesignD({ districts }: { districts: DistrictRow[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {districts.map(d => {
        const deg = (d.rate / 100) * 360;
        return (
          <div
            key={d.name}
            className="relative rounded-2xl p-[3px] aspect-square"
            style={{
              background: `conic-gradient(from -90deg, #111 0deg ${deg}deg, #EBEBEB ${deg}deg 360deg)`,
            }}
          >
            <div className="w-full h-full rounded-[14px] bg-white flex flex-col items-center justify-center">
              <span className="text-[11px] font-medium text-[var(--color-subtext)] leading-tight text-center px-1">
                {d.short}
              </span>
              <span className="text-2xl font-bold tabular-nums leading-none mt-1">{d.rate}%</span>
              <span className="text-[10px] text-[var(--color-subtext)] tabular-nums mt-1">
                {d.visited}/{d.total}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   案E：フィル・メーター
   タイル下部から上へ水位が上がる感じ。率がそのまま視覚的な高さ。
   ───────────────────────────────────────────── */
function DesignE({ districts }: { districts: DistrictRow[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {districts.map(d => {
        return (
          <div
            key={d.name}
            className="relative rounded-xl border border-[#EBEBEB] bg-white overflow-hidden aspect-square"
          >
            {/* 下から塗り上がるフィル */}
            <div
              className="absolute left-0 right-0 bottom-0 bg-[#111]/10"
              style={{ height: `${d.rate}%` }}
            />
            {/* 水位ライン */}
            <div
              className="absolute left-0 right-0 border-t border-[#111]/40"
              style={{ bottom: `${d.rate}%` }}
            />
            {/* テキスト本体 */}
            <div className="relative z-10 w-full h-full p-3 flex flex-col items-center justify-center">
              <span className="text-[11px] font-medium text-[var(--color-subtext)] leading-tight text-center">
                {d.short}
              </span>
              <span className="text-2xl font-bold tabular-nums leading-none mt-1">{d.rate}%</span>
              <span className="text-[10px] text-[var(--color-subtext)] tabular-nums mt-1">
                {d.visited}/{d.total}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
