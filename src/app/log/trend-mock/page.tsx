'use client';

// 訪問人数の推移グラフのデザイン比較モック（折れ線ベース3案）
// URL: /log/trend-mock
//
// 要件:
//  - 折れ線グラフの形は維持（推移が一目で分かる利点を残す）
//  - 初期表示は3〜4ヶ月の「ズームイン」状態。各月の数字が大きく読める
//  - 左右スクロール許容で12ヶ月全部見られる
//  - デフォルトは右端（現在月）
//  - フォントを大きくして「こじんまり感」を解消

import { useEffect, useRef, useState } from 'react';
import type { Visit } from '../../../lib/types';
import { getAllVisits } from '../../../lib/storage';

type Bucket = { label: string; year: number; month: number; count: number };

export default function TrendMockPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllVisits()
      .then(setVisits)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 12ヶ月分のバケットを作成
  const buckets: Bucket[] = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bs: (Bucket & { members: Set<string> })[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      bs.push({
        label: `${d.getMonth() + 1}月`,
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        count: 0,
        members: new Set(),
      });
    }
    for (const v of visits) {
      const vd = new Date(v.visitedAt);
      const b = bs.find(x => x.year === vd.getFullYear() && x.month === vd.getMonth() + 1);
      if (b) b.members.add(v.memberId);
    }
    bs.forEach(b => (b.count = b.members.size));
    return bs.map(({ members: _m, ...rest }) => rest);
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
        <h1 className="text-xl font-bold text-center">折れ線グラフ モック比較</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div
          className="max-w-[1366px] mx-auto px-4 pt-3 space-y-6"
          style={{ paddingBottom: 'calc(60px + env(safe-area-inset-bottom) + 16px)' }}
        >
          <p className="text-xs text-[var(--color-subtext)]">
            折れ線ベースで3案。初期表示は3〜4ヶ月にズームイン、横スクロールで12ヶ月見られるで
          </p>

          <MockSection
            title="案A：3ヶ月ズーム・シンプル拡大"
            caption="既存の折れ線をそのまま「3ヶ月分だけ画面内に収める幅」まで引き伸ばし。文字サイズ・点・ライン全部大きく。足し算だけなので変化が小さい"
          >
            <DesignA buckets={buckets} />
          </MockSection>

          <MockSection
            title="案B：3ヶ月ズーム + マーカーカード"
            caption="各データポイントの上に「月名＋人数」のマーカーカードを浮かせる。折れ線はベースとしてうっすら、カードが主役の読み取りやすさ重視"
          >
            <DesignB buckets={buckets} />
          </MockSection>

          <MockSection
            title="案C：4ヶ月ズーム + 前月比ラベル"
            caption="4ヶ月ウィンドウで少しだけ視界広め。各ポイントに人数＋前月比（+2 / -1）を表示。ラインは太め＋エリア塗りで存在感を強める"
          >
            <DesignC buckets={buckets} />
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
      <div className="ios-card p-5 hover:!opacity-100">
        <div className="mb-3">
          <h3 className="text-lg font-bold leading-tight">訪問人数の推移</h3>
          <p className="text-xs text-[var(--color-subtext)] mt-0.5">直近12ヶ月（月ごとのユニーク人数）</p>
        </div>
        {children}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// 共通: スクロール領域で「n ヶ月分を画面内に収める」ためのステップ幅
// container width の (1/n) を各月の横幅ステップとする
// ─────────────────────────────────────────────
function useScrollToRight(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    requestAnimationFrame(() => {
      if (ref.current) ref.current.scrollLeft = ref.current.scrollWidth;
    });
  }, [ref]);
}

/* ─────────────────────────────────────────────
   案A: 3ヶ月ズーム・シンプル拡大
   - 初期: 3ヶ月分が画面内に収まる幅
   - 折れ線＋ドット＋人数ラベル、全部サイズ大
   ───────────────────────────────────────────── */
function DesignA({ buckets }: { buckets: Bucket[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollToRight(scrollRef);

  const yMax = Math.max(6, ...buckets.map(b => b.count));
  const chartH = 200; // 大きめ
  const stepPx = 120; // 1ヶ月あたりの横幅 → 3ヶ月で約 360px 見える
  const innerW = buckets.length * stepPx;

  const xAt = (i: number) => i * stepPx + stepPx / 2;
  const yAt = (c: number) => chartH - 30 - (c / yMax) * (chartH - 60); // 上下30pxの余白

  const pts = buckets.map((b, i) => ({ x: xAt(i), y: yAt(b.count), ...b }));
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L${pts[pts.length - 1].x} ${chartH - 30} L${pts[0].x} ${chartH - 30} Z`;

  return (
    <div className="flex gap-3">
      {/* Y軸固定 */}
      <div className="relative shrink-0 w-7" style={{ height: chartH + 24 }}>
        {[yMax, Math.round(yMax / 2), 0].map((v, idx) => (
          <span
            key={v}
            className="absolute right-0 text-sm text-[var(--color-subtext)] tabular-nums -translate-y-1/2"
            style={{ top: yAt(v) }}
          >
            {v}
          </span>
        ))}
      </div>

      {/* スクロールチャート */}
      <div ref={scrollRef} className="flex-1 min-w-0 overflow-x-auto">
        <div style={{ width: innerW }}>
          <div className="relative" style={{ width: innerW, height: chartH }}>
            <svg width={innerW} height={chartH} className="block overflow-visible">
              {/* グリッド */}
              {[0, 0.5, 1].map(f => (
                <line
                  key={f}
                  x1={0}
                  x2={innerW}
                  y1={yAt(yMax * f)}
                  y2={yAt(yMax * f)}
                  stroke="#EBEBEB"
                  strokeWidth="1"
                />
              ))}
              <path d={areaD} fill="#111" fillOpacity="0.06" />
              <path d={pathD} fill="none" stroke="#111" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              {/* ドット */}
              {pts.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={p.count > 0 ? 6 : 4}
                  fill={p.count > 0 ? '#111' : '#D1D5DB'}
                />
              ))}
            </svg>
            {/* 数字ラベル */}
            <div className="absolute inset-0 pointer-events-none">
              {pts.map((p, i) => (
                p.count > 0 ? (
                  <span
                    key={i}
                    className="absolute text-lg font-black tabular-nums text-[#111] leading-none -translate-x-1/2 whitespace-nowrap"
                    style={{ left: p.x, top: p.y - 24 }}
                  >
                    {p.count}人
                  </span>
                ) : null
              ))}
            </div>
          </div>

          {/* X軸: 月ラベル */}
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
                  p.count > 0 ? 'text-base font-bold text-[#111]' : 'text-sm text-[#9CA3AF]'
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
}

/* ─────────────────────────────────────────────
   案B: 3ヶ月ズーム + マーカーカード
   - 各データポイントの上に月名＋人数のミニカードを浮かせる
   - カードが主役、折れ線は控えめ（背景のガイド）
   ───────────────────────────────────────────── */
function DesignB({ buckets }: { buckets: Bucket[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollToRight(scrollRef);

  const yMax = Math.max(6, ...buckets.map(b => b.count));
  const chartH = 220; // マーカーカード分ちょっと大きめ
  const stepPx = 120;
  const innerW = buckets.length * stepPx;

  const xAt = (i: number) => i * stepPx + stepPx / 2;
  const yAt = (c: number) => chartH - 40 - (c / yMax) * (chartH - 80);

  const pts = buckets.map((b, i) => ({ x: xAt(i), y: yAt(b.count), ...b }));
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');

  return (
    <div className="flex gap-3">
      {/* Y軸固定 */}
      <div className="relative shrink-0 w-7" style={{ height: chartH + 24 }}>
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

      <div ref={scrollRef} className="flex-1 min-w-0 overflow-x-auto">
        <div style={{ width: innerW }}>
          <div className="relative" style={{ width: innerW, height: chartH }}>
            <svg width={innerW} height={chartH} className="block overflow-visible">
              {/* 背景グリッド */}
              {[0, 0.5, 1].map(f => (
                <line key={f} x1={0} x2={innerW} y1={yAt(yMax * f)} y2={yAt(yMax * f)} stroke="#F0F0F0" strokeWidth="1" />
              ))}
              {/* 折れ線（控えめ） */}
              <path d={pathD} fill="none" stroke="#6B7280" strokeWidth="1.5" strokeDasharray="0" strokeLinejoin="round" strokeLinecap="round" />
              {/* ドット */}
              {pts.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill={p.count > 0 ? '#111' : '#D1D5DB'}
                />
              ))}
            </svg>

            {/* マーカーカード（訪問ありの月のみ） */}
            <div className="absolute inset-0 pointer-events-none">
              {pts.map((p, i) => {
                if (p.count === 0) return null;
                const isCurrent = i === pts.length - 1;
                return (
                  <div
                    key={i}
                    className={`absolute -translate-x-1/2 rounded-lg px-2.5 py-1.5 shadow-sm flex flex-col items-center ${
                      isCurrent
                        ? 'bg-[#111] text-white'
                        : 'bg-white border border-[#E5E5E5] text-[#111]'
                    }`}
                    style={{ left: p.x, top: Math.max(4, p.y - 54) }}
                  >
                    <span className={`text-[10px] tabular-nums leading-none ${isCurrent ? 'text-white/70' : 'text-[var(--color-subtext)]'}`}>
                      {p.label}
                    </span>
                    <span className="text-xl font-black tabular-nums leading-none mt-0.5">
                      {p.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* X軸: 月ラベル (全月) */}
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
                  p.count > 0 ? 'text-sm font-semibold text-[#111]' : 'text-sm text-[#9CA3AF]'
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
}

/* ─────────────────────────────────────────────
   案C: 4ヶ月ズーム + 前月比ラベル
   - 少し広めの4ヶ月ウィンドウ（視界広め）
   - ラインは太く＋エリア塗り濃いめ
   - 各ポイントに人数＋前月比（+2 / -1）
   ───────────────────────────────────────────── */
function DesignC({ buckets }: { buckets: Bucket[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useScrollToRight(scrollRef);

  const yMax = Math.max(6, ...buckets.map(b => b.count));
  const chartH = 220;
  const stepPx = 92; // 4ヶ月で約 368px 見える
  const innerW = buckets.length * stepPx;

  const xAt = (i: number) => i * stepPx + stepPx / 2;
  const yAt = (c: number) => chartH - 40 - (c / yMax) * (chartH - 80);

  const pts = buckets.map((b, i) => ({
    x: xAt(i),
    y: yAt(b.count),
    diff: i > 0 ? b.count - buckets[i - 1].count : null,
    ...b,
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L${pts[pts.length - 1].x} ${chartH - 40} L${pts[0].x} ${chartH - 40} Z`;

  return (
    <div className="flex gap-3">
      {/* Y軸固定 */}
      <div className="relative shrink-0 w-7" style={{ height: chartH + 24 }}>
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

      <div ref={scrollRef} className="flex-1 min-w-0 overflow-x-auto">
        <div style={{ width: innerW }}>
          <div className="relative" style={{ width: innerW, height: chartH }}>
            <svg width={innerW} height={chartH} className="block overflow-visible">
              {/* グリッド */}
              {[0, 0.5, 1].map(f => (
                <line key={f} x1={0} x2={innerW} y1={yAt(yMax * f)} y2={yAt(yMax * f)} stroke="#EBEBEB" strokeWidth="1" />
              ))}
              {/* 太めの線＋濃いめのエリア */}
              <path d={areaD} fill="#111" fillOpacity="0.1" />
              <path d={pathD} fill="none" stroke="#111" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
              {/* ドット（リング付き） */}
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

            {/* 数字 + 前月比 ラベル */}
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

          {/* X軸: 月ラベル */}
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
}
