'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

// ──────────────────────────────────────────────────────────────
// ダッシュボード「地区別」ドーナツ × シングルカラム 5 案
//
// 制約:
//   - 1 列 (シングルカラム) レイアウト
//   - ドーナツチャート (円グラフ) を必ず使う
//   - セクション枠サイズはそのまま (高さ 420px)
//   - 桁数 1〜3 で破綻しない
// ──────────────────────────────────────────────────────────────

type District = { name: string; visited: number; total: number; hex: string };

const districts: District[] = [
  { name: '正義地区',      visited: 105, total: 240, hex: '#D97706' },
  { name: '香城地区',      visited: 87,  total: 120, hex: '#059669' },
  { name: '幸福地区',      visited: 45,  total: 99,  hex: '#DB2777' },
  { name: '英雄地区',      visited: 33,  total: 110, hex: '#2563EB' },
  { name: '東旭川地区',    visited: 23,  total: 88,  hex: '#9F1239' },
  { name: '黄金地区',      visited: 12,  total: 9,   hex: '#CA8A04' }, // 100% 超え (見学者など)
  { name: '千代田地区',    visited: 11,  total: 45,  hex: '#7F1D1D' },
  { name: '東川地区',      visited: 8,   total: 32,  hex: '#65A30D' },
  { name: '東栄地区',      visited: 5,   total: 28,  hex: '#0D9488' },
  { name: 'ナポレオン地区', visited: 1,   total: 110, hex: '#4F46E5' },
  { name: '歓喜地区',      visited: 1,   total: 110, hex: '#0891B2' },
  { name: '光輝地区',      visited: 0,   total: 120, hex: '#DC2626' },
  { name: '光陽地区',      visited: 0,   total: 3,   hex: '#7C3AED' },
];

const sortedByVisited = [...districts].sort((a, b) => b.visited - a.visited);

function pct(v: number, t: number) {
  if (t === 0) return 0;
  return Math.min(100, Math.round((v / t) * 100));
}

// 共通ドーナツ (汎用)
function Donut({ size, stroke, percent, color, children }: {
  size: number; stroke: number; percent: number; color: string; children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (percent / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E5E5" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      )}
    </div>
  );
}

// 共通: ios-card 模倣 + 高さ固定
function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="ios-card hover:!opacity-100 p-4 mb-6 max-w-[420px] mx-auto" style={{ height: 420 }}>
      <div className="flex items-baseline gap-2 mb-2.5">
        <div>
          <h3 className="text-lg font-bold leading-tight">{title}</h3>
          <p className="text-xs text-[var(--color-subtext)] mt-0.5">{sub}</p>
        </div>
        <span className="text-xs text-[var(--color-subtext)] ml-auto">全{districts.length}地区</span>
      </div>
      <div style={{ height: 'calc(100% - 56px)' }}>{children}</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 1: 左ドーナツ + 地区名 + 右数値
//   - 行高 44px、ドーナツ 32px
//   - 訪問数を太字で強調、総数とパーセントは subtext
// ──────────────────────────────────────────────────────────────
function Pattern1() {
  return (
    <Section title="地区別" sub="訪問達成率を地区ごとに">
      <div className="h-full overflow-y-auto -mx-1 pr-1">
        <ul className="divide-y divide-[#F0F0F0]">
          {sortedByVisited.map(d => {
            const p = pct(d.visited, d.total);
            return (
              <li key={d.name} className="flex items-center gap-3 py-2 px-1">
                <Donut size={32} stroke={4} percent={p} color={d.hex} />
                <span className="text-[13px] font-semibold flex-1 truncate">{d.name}</span>
                <span className="tabular-nums text-right shrink-0">
                  <span className="text-[14px] font-bold">{d.visited}</span>
                  <span className="text-[11px] text-[var(--color-subtext)]"> / {d.total}人</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 2: 中央に訪問数のドーナツ + 右に地区名 (大きめ表示)
//   - 行高 56px、ドーナツ 44px、中に訪問数を表示
//   - パーセントとカウントを 1 列ずつ
// ──────────────────────────────────────────────────────────────
function Pattern2() {
  return (
    <Section title="地区別" sub="ドーナツ内＝訪問済み人数">
      <div className="h-full overflow-y-auto -mx-1 pr-1">
        <ul className="space-y-1">
          {sortedByVisited.map(d => {
            const p = pct(d.visited, d.total);
            return (
              <li
                key={d.name}
                className="flex items-center gap-3 py-1.5 px-2 rounded-lg active:bg-[#F7F7F8]"
              >
                <Donut size={44} stroke={5} percent={p} color={d.hex}>
                  <span className="text-[13px] font-black tabular-nums">{d.visited}</span>
                </Donut>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate">{d.name}</div>
                  <div className="text-[11px] text-[var(--color-subtext)] tabular-nums">
                    総 {d.total}人・<span className="font-bold" style={{ color: d.hex }}>{p}%</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-[var(--color-icon-gray)] shrink-0" />
              </li>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 3: ドーナツ + 横長進捗バー (二重視覚化)
//   - ドーナツで「率」、バーで「絶対量」を直感把握
//   - 桁数は両方の視覚要素に左右されないので保険になる
// ──────────────────────────────────────────────────────────────
function Pattern3() {
  return (
    <Section title="地区別" sub="達成率 (ドーナツ) ＋ 訪問量 (バー)">
      <div className="h-full overflow-y-auto -mx-1 pr-1">
        <ul className="space-y-2">
          {sortedByVisited.map(d => {
            const p = pct(d.visited, d.total);
            return (
              <li key={d.name} className="flex items-center gap-3 px-1">
                <Donut size={36} stroke={4} percent={p} color={d.hex}>
                  <span className="text-[10px] font-bold tabular-nums" style={{ color: d.hex }}>{p}%</span>
                </Donut>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-[12px] font-semibold truncate">{d.name}</span>
                    <span className="text-[10px] text-[var(--color-subtext)] tabular-nums ml-auto shrink-0">
                      <span className="text-[12px] font-bold text-[#111]">{d.visited}</span>
                      <span>/{d.total}</span>
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#F0F0F0] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${p}%`, background: d.hex }} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 4: ドーナツ大 + マルチ指標 (達成 / 残り / 率)
//   - 1 行に「ドーナツ・地区名・小指標 3 つ」
//   - 桁数が増えても 各指標が独立カラムなので破綻しにくい
// ──────────────────────────────────────────────────────────────
function Pattern4() {
  return (
    <Section title="地区別" sub="達成 / 残り / 率 を 1 行で">
      <div className="h-full overflow-y-auto -mx-1 pr-1">
        <ul className="divide-y divide-[#F0F0F0]">
          {sortedByVisited.map(d => {
            const p = pct(d.visited, d.total);
            const remain = Math.max(0, d.total - d.visited);
            return (
              <li key={d.name} className="flex items-center gap-3 py-2 px-1">
                <Donut size={40} stroke={5} percent={p} color={d.hex}>
                  <span className="text-[11px] font-black tabular-nums" style={{ color: d.hex }}>{p}%</span>
                </Donut>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate">{d.name}</div>
                  <div className="text-[10px] text-[var(--color-subtext)] flex gap-2 tabular-nums mt-0.5">
                    <span>達成 <span className="text-[#111] font-bold">{d.visited}</span></span>
                    <span>残り <span className="text-[#111] font-bold">{remain}</span></span>
                    <span>母数 {d.total}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 5: ランキング順 + ドーナツ小 (順位を強調)
//   - 順位バッジで上下関係が一目瞭然
//   - 桁数の代わりに順位 (1〜13) で正規化、視覚優先
// ──────────────────────────────────────────────────────────────
function Pattern5() {
  return (
    <Section title="地区別" sub="ランキング順 (訪問人数)">
      <div className="h-full overflow-y-auto -mx-1 pr-1">
        <ul className="space-y-1">
          {sortedByVisited.map((d, i) => {
            const p = pct(d.visited, d.total);
            const rank = i + 1;
            const isTop3 = rank <= 3;
            return (
              <li key={d.name} className="flex items-center gap-2.5 py-1.5 px-1">
                <span
                  className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black tabular-nums ${
                    isTop3 ? 'text-white' : 'text-[var(--color-subtext)] bg-[#F0F0F0]'
                  }`}
                  style={isTop3 ? { background: d.hex } : undefined}
                >
                  {rank}
                </span>
                <Donut size={28} stroke={3.5} percent={p} color={d.hex} />
                <span className="text-[13px] font-semibold flex-1 truncate">{d.name}</span>
                <span className="tabular-nums shrink-0 text-right">
                  <span className="text-[14px] font-bold">{d.visited}</span>
                  <span className="text-[10px] text-[var(--color-subtext)]"> /{d.total}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}

const patterns = [
  { num: 1, title: '左ドーナツ + 数値右', desc: '行高 44px、ドーナツ 32px。訪問数を太字、総数は副表示。最もシンプル。', Comp: Pattern1 },
  { num: 2, title: 'ドーナツ中央数値 + 詳細', desc: 'ドーナツ 44px の中に訪問数。右に地区名・総数・%。情報密度高い。', Comp: Pattern2 },
  { num: 3, title: 'ドーナツ + 進捗バー (二重視覚化)', desc: 'ドーナツで「率」、バーで「絶対量」を表現。視覚化を冗長化して桁数の影響を吸収。', Comp: Pattern3 },
  { num: 4, title: 'ドーナツ大 + 3 指標 (達成/残り/率)', desc: 'ドーナツ 40px。残数を明示することで「あと何件」が一目でわかる。', Comp: Pattern4 },
  { num: 5, title: 'ランキング順位 + ドーナツ小', desc: '順位バッジで上下関係を視覚化。ドーナツは 28px、TOP3 は色付きバッジ強調。', Comp: Pattern5 },
];

export default function MockDistrictsDonutPage() {
  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-16">
      <div className="max-w-[460px] mx-auto px-3 py-4">
        <div className="mb-3">
          <h1 className="text-xl font-bold mb-1">ダッシュボード地区別 ドーナツ × シングルカラム 5 案</h1>
          <p className="text-[12px] text-[var(--color-subtext)]">
            セクション枠固定 (高さ 420px)、内部スクロール。13 地区・最大 3 桁数値で全案破綻なし。
          </p>
          <Link href="/" className="text-[12px] text-[var(--color-primary)] underline mt-2 inline-block">← ホームへ戻る</Link>
        </div>
        {patterns.map(p => (
          <div key={p.num}>
            <div className="px-1 mb-1.5">
              <h2 className="text-[14px] font-bold">案 {p.num}: {p.title}</h2>
              <p className="text-[11px] text-[var(--color-subtext)]">{p.desc}</p>
            </div>
            <p.Comp />
          </div>
        ))}
      </div>
    </div>
  );
}
