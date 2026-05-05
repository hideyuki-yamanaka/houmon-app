'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';

// ──────────────────────────────────────────────────────────────
// ダッシュボード「地区別」セクション 拡張性 10 案
//
// 制約:
//   - セクション(ios-card)の外側サイズはそのまま (高さ固定: 約 420px)
//   - 数値が 2〜3 桁になっても折り返し / 切り抜けしない
//   - 内部スクロール / アコーディオンで溢れたら逃がす
//
// 確認用: /mock/dashboard-districts
// ──────────────────────────────────────────────────────────────

type District = { name: string; visited: number; total: number; hex: string; honbu: string; bu: string };

// 数値が増えた時の検証用に 二桁・三桁 の架空地区も混ぜる
const districts: District[] = [
  { name: '香城地区',      visited: 87,  total: 120, hex: '#059669', honbu: '豊岡本部', bu: '豊岡部' },
  { name: '幸福地区',      visited: 45,  total: 99,  hex: '#DB2777', honbu: '豊岡本部', bu: '豊岡中央支部' },
  { name: '英雄地区',      visited: 33,  total: 110, hex: '#2563EB', honbu: '豊岡本部', bu: '豊岡部' },
  { name: '黄金地区',      visited: 12,  total: 9,   hex: '#CA8A04', honbu: '豊岡本部', bu: '光陽部' },
  { name: 'ナポレオン地区', visited: 1,   total: 110, hex: '#4F46E5', honbu: '豊岡本部', bu: '豊岡中央支部' },
  { name: '歓喜地区',      visited: 1,   total: 110, hex: '#0891B2', honbu: '豊岡本部', bu: '豊岡中央支部' },
  { name: '正義地区',      visited: 105, total: 240, hex: '#D97706', honbu: '豊岡本部', bu: '豊岡部' },
  { name: '光輝地区',      visited: 0,   total: 120, hex: '#DC2626', honbu: '豊岡本部', bu: '光陽部' },
  { name: '光陽地区',      visited: 0,   total: 3,   hex: '#7C3AED', honbu: '豊岡本部', bu: '光陽部' },
  { name: '東旭川地区',    visited: 23,  total: 88,  hex: '#9F1239', honbu: '東旭川本部', bu: '東旭川部' },
  { name: '千代田地区',    visited: 11,  total: 45,  hex: '#7F1D1D', honbu: '東旭川本部', bu: '千代田部' },
  { name: '東川地区',      visited: 8,   total: 32,  hex: '#65A30D', honbu: '旭創価本部', bu: '東川部' },
  { name: '東栄地区',      visited: 5,   total: 28,  hex: '#0D9488', honbu: '東栄本部',   bu: '東栄部' },
];

// 地区名から本部・部 のラベル(展開グループに使う)を引く
const sortedByVisited = [...districts].sort((a, b) => b.visited - a.visited);

// 共通: ios-card 模倣 + 高さ固定
function Section({ title, sub, right, children }: {
  title: string; sub: string; right?: string; children: React.ReactNode;
}) {
  return (
    <div className="ios-card hover:!opacity-100 p-4 mb-6 max-w-[420px] mx-auto" style={{ height: 420 }}>
      <div className="flex items-baseline gap-2 mb-2.5">
        <div>
          <h3 className="text-lg font-bold leading-tight">{title}</h3>
          <p className="text-xs text-[var(--color-subtext)] mt-0.5">{sub}</p>
        </div>
        <span className="text-xs text-[var(--color-subtext)] ml-auto">{right ?? `全${districts.length}地区`}</span>
      </div>
      <div style={{ height: 'calc(100% - 56px)' }}>
        {children}
      </div>
    </div>
  );
}

// 数値整形: 大きい桁を tabular-nums で右揃え
function pct(v: number, t: number) {
  if (t === 0) return 0;
  return Math.round((v / t) * 100);
}

// ──────────────────────────────────────────────────────────────
// 案 1: プログレスバー型 1 列リスト (内部スクロール)
//   各行 = 色ドット ・ 地区名 ・ 進捗バー ・ 数値 (m/n)
//   桁が増えても "/" を境に右揃えなので破綻しにくい
// ──────────────────────────────────────────────────────────────
function Pattern1() {
  return (
    <Section title="地区別" sub="訪問済み人数 ／ 地区の総人数">
      <div className="h-full overflow-y-auto -mx-1 pr-1">
        <ul className="space-y-1.5">
          {sortedByVisited.map(d => {
            const p = pct(d.visited, d.total);
            return (
              <li key={d.name} className="flex items-center gap-2 px-1">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.hex }} />
                <span className="text-[13px] font-medium truncate w-[5.5em] shrink-0">{d.name.replace('地区', '')}</span>
                <div className="flex-1 h-1.5 rounded-full bg-[#F0F0F0] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${p}%`, background: d.hex }} />
                </div>
                <span className="text-[11px] tabular-nums text-[var(--color-subtext)] shrink-0 w-[5.5em] text-right">
                  <span className="text-[13px] font-bold text-[#111]">{d.visited}</span>
                  <span className="opacity-60">/{d.total}</span>
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
// 案 2: 3 列維持・数値レイアウト改善 (グリッドスクロール)
//   - 数値は flex で左寄せ、% を補助表示
//   - 桁数 1〜3 で自動幅、tabular-nums + min-w で揃える
// ──────────────────────────────────────────────────────────────
function Pattern2() {
  return (
    <Section title="地区別" sub="訪問済み人数 ／ 地区の総人数">
      <div className="h-full overflow-y-auto -mx-1 pr-1">
        <div className="grid grid-cols-3 gap-2">
          {sortedByVisited.map(d => (
            <button
              key={d.name}
              className="rounded-xl px-2.5 py-2 flex flex-col bg-[#F7F7F8] border border-[#EBEBEB] text-left active:opacity-70"
            >
              <div className="flex items-center gap-1 min-w-0 mb-1">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: d.hex }} />
                <span className="text-[11px] font-semibold text-[#111] truncate">{d.name.replace('地区', '')}</span>
              </div>
              <div className="flex items-baseline gap-0.5 tabular-nums">
                <span className="text-[20px] font-black leading-none text-[#111]">{d.visited}</span>
                <span className="text-[10px] text-[var(--color-subtext)]">/{d.total}</span>
              </div>
              <span className="text-[10px] text-[var(--color-subtext)] tabular-nums mt-0.5">{pct(d.visited, d.total)}%</span>
            </button>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 3: 2 列縦長カード (内部スクロール)
//   - 1 行に 2 タイル、横に余裕があるので桁数が増えても破綻しない
//   - 進捗バーが下に入って視覚化される
// ──────────────────────────────────────────────────────────────
function Pattern3() {
  return (
    <Section title="地区別" sub="訪問済み人数 ／ 地区の総人数">
      <div className="h-full overflow-y-auto -mx-1 pr-1">
        <div className="grid grid-cols-2 gap-2">
          {sortedByVisited.map(d => {
            const p = pct(d.visited, d.total);
            return (
              <button key={d.name} className="rounded-xl p-2.5 bg-[#F7F7F8] border border-[#EBEBEB] text-left active:opacity-70">
                <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.hex }} />
                  <span className="text-[12px] font-semibold truncate">{d.name}</span>
                </div>
                <div className="flex items-baseline gap-1 tabular-nums">
                  <span className="text-[22px] font-black leading-none">{d.visited}</span>
                  <span className="text-[11px] text-[var(--color-subtext)]">/ {d.total}人</span>
                  <span className="text-[10px] text-[var(--color-subtext)] ml-auto">{p}%</span>
                </div>
                <div className="mt-1.5 h-1 rounded-full bg-[#E5E5E5] overflow-hidden">
                  <div className="h-full" style={{ width: `${p}%`, background: d.hex }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 4: 高密度リスト (各行 28px、バーが背景に薄く敷かれる)
//   - 1 セクションに 13 件 全部入るくらい高密度。スクロール最小
//   - 数値は右端に整列、桁が増えてもバーで視覚化済みなので問題ない
// ──────────────────────────────────────────────────────────────
function Pattern4() {
  return (
    <Section title="地区別" sub="訪問済み人数 ／ 地区の総人数">
      <div className="h-full overflow-y-auto -mx-1 pr-1">
        <ul className="divide-y divide-[#F0F0F0]">
          {sortedByVisited.map(d => {
            const p = pct(d.visited, d.total);
            return (
              <li key={d.name} className="relative h-7 flex items-center px-2 text-[12px]">
                <span
                  className="absolute inset-y-0 left-0 rounded"
                  style={{ width: `${p}%`, background: d.hex, opacity: 0.12 }}
                />
                <span className="w-1.5 h-1.5 rounded-full shrink-0 mr-1.5 z-10" style={{ background: d.hex }} />
                <span className="z-10 truncate flex-1">{d.name}</span>
                <span className="z-10 tabular-nums text-[var(--color-subtext)]">
                  <span className="font-bold text-[#111]">{d.visited}</span>
                  <span className="opacity-60">/{d.total}</span>
                  <span className="ml-2 inline-block w-9 text-right">{p}%</span>
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
// 案 5: ドーナツ円グラフ小タイル (3 列、中央数値)
//   - 円の中央に 訪問数のみ表示。総数は下に小さく
//   - 桁数が増えても円のサイズに左右されない
// ──────────────────────────────────────────────────────────────
function Pattern5() {
  return (
    <Section title="地区別" sub="訪問済み人数 ／ 地区の総人数">
      <div className="h-full overflow-y-auto -mx-1 pr-1">
        <div className="grid grid-cols-3 gap-2">
          {sortedByVisited.map(d => {
            const p = pct(d.visited, d.total);
            const r = 18;
            const c = 2 * Math.PI * r;
            return (
              <button key={d.name} className="rounded-xl p-2 flex flex-col items-center bg-[#F7F7F8] border border-[#EBEBEB] active:opacity-70">
                <span className="text-[10px] font-semibold truncate w-full text-center mb-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ background: d.hex }} />
                  {d.name.replace('地区', '')}
                </span>
                <div className="relative w-12 h-12">
                  <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90">
                    <circle cx="22" cy="22" r={r} fill="none" stroke="#E5E5E5" strokeWidth="4" />
                    <circle
                      cx="22" cy="22" r={r} fill="none"
                      stroke={d.hex} strokeWidth="4" strokeLinecap="round"
                      strokeDasharray={`${(p / 100) * c} ${c}`}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[12px] font-black tabular-nums">
                    {d.visited}
                  </span>
                </div>
                <span className="text-[9px] text-[var(--color-subtext)] tabular-nums mt-0.5">/ {d.total}人</span>
              </button>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 6: タブ切替 (上位 / 未訪問多い順 / 全件) + 3 列タイル
//   - デフォルトはランキング上位 6 件のみ → 桁数の影響を分散
//   - 切替で対応するソート順に
// ──────────────────────────────────────────────────────────────
function Pattern6() {
  const [tab, setTab] = useState<'top' | 'low' | 'all'>('top');
  const sorted =
    tab === 'low' ? [...districts].sort((a, b) => (a.total - a.visited) > (b.total - b.visited) ? -1 : 1)
    : tab === 'all' ? districts
    : sortedByVisited.slice(0, 6);
  return (
    <Section title="地区別" sub="訪問済み人数 ／ 地区の総人数">
      <div className="flex gap-1 mb-2">
        {([['top', '訪問多'], ['low', '未訪問多'], ['all', '全件']] as const).map(([k, l]) => (
          <button
            key={k} onClick={() => setTab(k)}
            className={`text-[11px] px-2 py-1 rounded-full ${tab === k ? 'bg-[#111] text-white' : 'bg-[#F0F0F0] text-[var(--color-subtext)]'}`}
          >{l}</button>
        ))}
      </div>
      <div className="h-[calc(100%-32px)] overflow-y-auto -mx-1 pr-1">
        <div className="grid grid-cols-3 gap-2">
          {sorted.map(d => (
            <div key={d.name} className="rounded-xl p-2 bg-[#F7F7F8] border border-[#EBEBEB]">
              <div className="flex items-center gap-1 mb-1 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: d.hex }} />
                <span className="text-[11px] font-semibold truncate">{d.name.replace('地区', '')}</span>
              </div>
              <div className="flex items-baseline gap-0.5 tabular-nums">
                <span className="text-[18px] font-black leading-none">{d.visited}</span>
                <span className="text-[10px] text-[var(--color-subtext)]">/{d.total}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 7: 階層アコーディオン (本部 → 部 → 地区)
//   - デフォルトは 本部行のみ (4 行)
//   - タップで展開、内側に地区がリスト表示
//   - 数百地区になっても破綻しない構造
// ──────────────────────────────────────────────────────────────
function Pattern7() {
  const [open, setOpen] = useState<string | null>('豊岡本部');
  const honbus = Array.from(new Set(districts.map(d => d.honbu)));
  const aggHonbu = (h: string) => {
    const ds = districts.filter(d => d.honbu === h);
    return { visited: ds.reduce((s, d) => s + d.visited, 0), total: ds.reduce((s, d) => s + d.total, 0) };
  };
  return (
    <Section title="地区別" sub="本部 → 地区 を展開">
      <div className="h-full overflow-y-auto -mx-1 pr-1 space-y-1">
        {honbus.map(h => {
          const agg = aggHonbu(h);
          const isOpen = open === h;
          return (
            <div key={h} className="border border-[#EBEBEB] rounded-lg overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : h)}
                className="w-full px-3 py-2 flex items-center bg-[#F7F7F8] active:opacity-70"
              >
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="text-[12px] font-bold ml-1 flex-1 text-left">{h}</span>
                <span className="text-[12px] tabular-nums">
                  <span className="font-black">{agg.visited}</span>
                  <span className="text-[var(--color-subtext)]">/{agg.total}人</span>
                </span>
              </button>
              {isOpen && (
                <ul className="bg-white">
                  {districts.filter(d => d.honbu === h).map(d => (
                    <li key={d.name} className="px-3 py-1.5 flex items-center text-[12px] border-t border-[#F0F0F0]">
                      <span className="w-1.5 h-1.5 rounded-full mr-2 shrink-0" style={{ background: d.hex }} />
                      <span className="flex-1 truncate">{d.name}</span>
                      <span className="tabular-nums text-[var(--color-subtext)]">
                        <span className="font-bold text-[#111]">{d.visited}</span>/{d.total}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </Section>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 8: 横スクロールカルーセル (3.5 タイル見える)
//   - 1 タイル広めで桁が増えても余裕
//   - 横スワイプで次のタイル
// ──────────────────────────────────────────────────────────────
function Pattern8() {
  return (
    <Section title="地区別" sub="訪問済み人数 ／ 地区の総人数">
      <div className="h-full overflow-x-auto overflow-y-hidden -mx-1 pr-1 snap-x snap-mandatory">
        <div className="flex gap-2 h-full pb-2">
          {sortedByVisited.map(d => {
            const p = pct(d.visited, d.total);
            return (
              <button
                key={d.name}
                className="snap-start shrink-0 w-[120px] rounded-xl p-2.5 bg-[#F7F7F8] border border-[#EBEBEB] text-left flex flex-col"
              >
                <div className="flex items-center gap-1.5 min-w-0 mb-1">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.hex }} />
                  <span className="text-[12px] font-semibold truncate">{d.name}</span>
                </div>
                <div className="flex items-baseline gap-1 tabular-nums">
                  <span className="text-[24px] font-black leading-none">{d.visited}</span>
                  <span className="text-[11px] text-[var(--color-subtext)]">/{d.total}</span>
                </div>
                <div className="mt-auto h-1.5 rounded-full bg-[#E5E5E5] overflow-hidden">
                  <div className="h-full" style={{ width: `${p}%`, background: d.hex }} />
                </div>
                <span className="text-[10px] text-[var(--color-subtext)] tabular-nums mt-1">{p}%</span>
              </button>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 9: ゲージ進捗中心 (% を主軸にした 2 列リスト)
//   - 数値より % を強調 (桁数の心配が減る)
//   - 副表示として人数小さく
// ──────────────────────────────────────────────────────────────
function Pattern9() {
  return (
    <Section title="地区別" sub="訪問達成率 (m/n人)">
      <div className="h-full overflow-y-auto -mx-1 pr-1">
        <div className="grid grid-cols-2 gap-2">
          {sortedByVisited.map(d => {
            const p = pct(d.visited, d.total);
            return (
              <div key={d.name} className="rounded-xl p-2.5 bg-[#F7F7F8] border border-[#EBEBEB]">
                <div className="flex items-center gap-1.5 mb-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.hex }} />
                  <span className="text-[12px] font-semibold truncate">{d.name.replace('地区', '')}</span>
                </div>
                <div className="flex items-baseline gap-1 tabular-nums">
                  <span className="text-[26px] font-black leading-none" style={{ color: d.hex }}>{p}</span>
                  <span className="text-[11px] font-bold" style={{ color: d.hex }}>%</span>
                  <span className="text-[10px] text-[var(--color-subtext)] ml-auto tabular-nums">
                    {d.visited}/{d.total}人
                  </span>
                </div>
                <div className="mt-1 h-1 rounded-full bg-[#E5E5E5] overflow-hidden">
                  <div className="h-full" style={{ width: `${p}%`, background: d.hex }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 10: 表組み (4 カラム: 地区・済・総・%)
//   - 各列で右揃え + tabular-nums なので 1〜4 桁まで完全に整列
//   - スクロールはセクション内
// ──────────────────────────────────────────────────────────────
function Pattern10() {
  return (
    <Section title="地区別" sub="訪問済み人数 ／ 地区の総人数">
      <div className="h-full overflow-y-auto -mx-1 pr-1">
        <table className="w-full text-[12px] tabular-nums">
          <thead className="text-[10px] text-[var(--color-subtext)] sticky top-0 bg-white">
            <tr className="border-b border-[#EBEBEB]">
              <th className="text-left py-1.5 pl-1 font-medium">地区</th>
              <th className="text-right py-1.5 font-medium">済</th>
              <th className="text-right py-1.5 font-medium">総</th>
              <th className="text-right py-1.5 pr-1 font-medium">%</th>
            </tr>
          </thead>
          <tbody>
            {sortedByVisited.map(d => {
              const p = pct(d.visited, d.total);
              return (
                <tr key={d.name} className="border-b border-[#F5F5F5] active:bg-[#F7F7F8]">
                  <td className="py-1.5 pl-1 truncate max-w-0 w-full">
                    <span className="inline-block w-1.5 h-1.5 rounded-full align-middle mr-1.5" style={{ background: d.hex }} />
                    {d.name}
                  </td>
                  <td className="text-right font-bold py-1.5">{d.visited}</td>
                  <td className="text-right text-[var(--color-subtext)] py-1.5">{d.total}</td>
                  <td className="text-right text-[var(--color-subtext)] py-1.5 pr-1 w-10">{p}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

const patterns: { num: number; title: string; desc: string; Comp: () => React.JSX.Element }[] = [
  { num: 1, title: 'プログレスバー型 1 列リスト', desc: '色ドット+地区名+進捗バー+数値。数値は右揃え固定幅で桁が増えても破綻なし。内部スクロール。', Comp: Pattern1 },
  { num: 2, title: '3 列維持・数値レイアウト改善', desc: '元と同じ 3 列だが数値は 1 行 (m/n) + % 補助。内部スクロールで全件閲覧。', Comp: Pattern2 },
  { num: 3, title: '2 列縦長カード + 進捗バー', desc: '1 行 2 タイルで横余裕大。バーで視覚化、桁数の影響なし。', Comp: Pattern3 },
  { num: 4, title: '高密度リスト (h28 行)', desc: '13 件全部 1 セクション内に。背景バーで視覚化、右端に数値・%。最小スクロール。', Comp: Pattern4 },
  { num: 5, title: 'ドーナツ円グラフ小タイル', desc: '3 列。円中央に訪問数、下に総数。円のサイズが固定なので桁数に左右されない。', Comp: Pattern5 },
  { num: 6, title: 'タブ切替 (上位/未訪/全件)', desc: 'デフォルト上位 6 件のみ。タブで切替えて桁数の影響を分散。', Comp: Pattern6 },
  { num: 7, title: '階層アコーディオン', desc: '本部行のみ常時表示。タップで地区が展開。地区数百でも構造的に破綻しない。', Comp: Pattern7 },
  { num: 8, title: '横スクロールカルーセル', desc: '横スワイプで全地区。1 タイル 120px 固定、桁の伸びに余裕あり。', Comp: Pattern8 },
  { num: 9, title: 'ゲージ % 主軸 2 列', desc: '% を大きく、人数は副情報。数値 = 0〜100 で桁数の上限が固定。', Comp: Pattern9 },
  { num: 10, title: '表組み (4 カラム)', desc: '地区・済・総・% を右揃え整列。スプレッドシート的に視認できる、最も整列性が高い。', Comp: Pattern10 },
];

export default function MockDistrictsPage() {
  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-16">
      <div className="max-w-[460px] mx-auto px-3 py-4">
        <div className="mb-3">
          <h1 className="text-xl font-bold mb-1">ダッシュボード「地区別」拡張性 10 案</h1>
          <p className="text-[12px] text-[var(--color-subtext)]">
            セクション枠サイズは固定 (高さ 420px)。中身を変えて 1〜3 桁の数値で破綻しない案。
          </p>
          <p className="text-[11px] text-[var(--color-subtext)] mt-1">
            検証データ: 13 地区、訪問済 0〜105 / 総 3〜240 (実値+架空値)。
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
