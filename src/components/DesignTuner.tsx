'use client';

// デザインチューナー（開発環境専用）
// ---------------------------------------------------
// 画面右下のギアから開くパネルで、CSS 変数を live 調整するためのツール。
// ページ側で style={{ padding: 'var(--tune-card-pad, 1.5rem)' }} のように
// 参照しておけば、ここで値をいじると即 DOM に反映される。
// localStorage に保存されるのでリロード後も値が残る。
// 本番ビルド（NODE_ENV=production）では何も描画しないので dead weight にならない。
// ---------------------------------------------------

import { useEffect, useState, useCallback } from 'react';
import { Settings2, X, RotateCcw, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

type TuneDef = {
  key: string;
  label: string;
  cssVar: string;
  unit: '' | 'rem' | 'px' | 'em';
  min: number;
  max: number;
  step: number;
  default: number;
  group: 'カード共通' | '家庭訪問の回数' | '地区別' | '推移グラフ' | 'ランキング';
};

// 調整可能なデザイントークン一覧
const DEFS: TuneDef[] = [
  { key: 'cardPad',        label: 'カード周囲パディング',     cssVar: '--tune-card-pad',        unit: 'rem', min: 0.5,  max: 2.5,  step: 0.125,  default: 2.125,group: 'カード共通' },
  { key: 'cardGap',        label: 'カード間の隙間',           cssVar: '--tune-card-gap',        unit: 'rem', min: 0.25, max: 2,    step: 0.125,  default: 1,    group: 'カード共通' },
  { key: 'sectionPadTop',  label: 'コンテンツ上余白',         cssVar: '--tune-section-pad-top', unit: 'rem', min: 0,    max: 2,    step: 0.125,  default: 0.75, group: 'カード共通' },

  { key: 'heroSize',       label: 'Heroナンバーのサイズ',     cssVar: '--tune-hero-size',       unit: 'rem', min: 1.5,  max: 6,    step: 0.125,  default: 4,     group: '家庭訪問の回数' },
  // letter-spacing(em 単位) — マイナスで詰まる、プラスで広がる。「15」みたいな
  // 2 桁数字の隙間が広く感じる時にここを動かして調整する。
  { key: 'heroTracking',   label: 'Heroナンバーの文字間',     cssVar: '--tune-hero-tracking',   unit: 'em',  min: -0.1, max: 0.05, step: 0.005,  default: -0.025, group: '家庭訪問の回数' },
  { key: 'barH',           label: 'スタックバー高さ',         cssVar: '--tune-bar-h',           unit: 'rem', min: 0.25, max: 4,    step: 0.0625, default: 3,     group: '家庭訪問の回数' },
  { key: 'legendGapY',     label: 'レジェンド行間',           cssVar: '--tune-legend-gap-y',    unit: 'rem', min: 0,    max: 1.5,  step: 0.0625, default: 0,     group: '家庭訪問の回数' },

  { key: 'districtAspect', label: 'タイルの横長さ（幅/高さ）', cssVar: '--tune-district-aspect', unit: '',    min: 1.5,  max: 3.5,  step: 0.1,    default: 2.3,  group: '地区別' },
  { key: 'districtGap',    label: 'タイル間の隙間',           cssVar: '--tune-district-gap',    unit: 'rem', min: 0.25, max: 1,    step: 0.0625, default: 0.5,  group: '地区別' },
  { key: 'districtNumSize',label: '数字のサイズ',             cssVar: '--tune-district-num',    unit: 'rem', min: 1.25, max: 3,    step: 0.125,  default: 1.875,group: '地区別' },

  { key: 'trendMinH',      label: '最小高さ',                 cssVar: '--tune-trend-min-h',     unit: 'px',  min: 120,  max: 360,  step: 10,     default: 280,  group: '推移グラフ' },
  { key: 'trendStepPx',    label: '月あたりの横幅',           cssVar: '--tune-trend-step',      unit: 'px',  min: 80,   max: 180,  step: 4,      default: 120,  group: '推移グラフ' },

  { key: 'rankingRowPad',  label: '行の上下パディング',       cssVar: '--tune-ranking-row-pad', unit: 'rem', min: 0.1,  max: 1,    step: 0.0625, default: 0.725,group: 'ランキング' },
  { key: 'rankingNumSize', label: '数字のサイズ（順位・回数）', cssVar: '--tune-ranking-num',     unit: 'rem', min: 0.75, max: 2,    step: 0.0625, default: 1.5,  group: 'ランキング' },
  { key: 'rankingNameSize',label: 'メンバー名のサイズ',       cssVar: '--tune-ranking-name',    unit: 'rem', min: 0.75, max: 1.5,  step: 0.0625, default: 0.875,group: 'ランキング' },
];

const STORAGE_KEY = 'houmon-app:design-tuner-v1';

export default function DesignTuner() {
  const [open, setOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    DEFS.forEach((d) => (init[d.key] = d.default));
    return init;
  });
  const [hydrated, setHydrated] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [copied, setCopied] = useState(false);

  // localStorage から復元（初回のみ）
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Record<string, number>;
        setValues((prev) => ({ ...prev, ...saved }));
      }
    } catch {
      // 壊れてたら無視
    }
    setHydrated(true);
  }, []);

  // CSS 変数を :root に反映 + localStorage に保存
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    DEFS.forEach((d) => {
      const v = values[d.key];
      root.style.setProperty(d.cssVar, d.unit ? `${v}${d.unit}` : `${v}`);
    });
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    } catch {
      // 容量オーバー等は無視
    }
  }, [values, hydrated]);

  const reset = useCallback(() => {
    const init: Record<string, number> = {};
    DEFS.forEach((d) => (init[d.key] = d.default));
    setValues(init);
  }, []);

  const resetGroup = useCallback((group: string) => {
    setValues((prev) => {
      const next = { ...prev };
      DEFS.filter((d) => d.group === group).forEach((d) => {
        next[d.key] = d.default;
      });
      return next;
    });
  }, []);

  // エクスポート用：現在値を人間が読みやすい形式で文字列化（Claude に貼り付けて伝える用）
  const exportText = (() => {
    const lines: string[] = [];
    lines.push('# DesignTuner 現在値');
    let currentGroup = '';
    for (const d of DEFS) {
      if (d.group !== currentGroup) {
        lines.push(`\n## ${d.group}`);
        currentGroup = d.group;
      }
      const v = values[d.key];
      const suffix = d.unit;
      lines.push(`- ${d.label} (${d.cssVar}): ${v}${suffix}`);
    }
    lines.push('\n## JSON');
    lines.push('```json');
    lines.push(JSON.stringify(values, null, 2));
    lines.push('```');
    return lines.join('\n');
  })();

  const copyExport = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard 不可なら何もしない（textarea 側で選択してコピーしてもらう）
    }
  }, [exportText]);

  // 本番ビルドでは描画しない
  if (process.env.NODE_ENV === 'production') return null;

  // グループごとに DEFS をまとめる（表示順を維持）
  const groups: { name: string; items: TuneDef[] }[] = [];
  for (const d of DEFS) {
    let g = groups.find((x) => x.name === d.group);
    if (!g) {
      g = { name: d.group, items: [] };
      groups.push(g);
    }
    g.items.push(d);
  }

  return (
    <>
      {/* フローティングトグルボタン（右下、タブバーの上） */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="デザインチューナーを開く"
        className="fixed right-4 z-[100] w-11 h-11 rounded-full bg-[#111] text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        style={{ bottom: 'calc(72px + env(safe-area-inset-bottom))' }}
      >
        {open ? <X size={18} /> : <Settings2 size={18} />}
      </button>

      {/* パネル本体 */}
      {open && (
        <div
          className="fixed right-4 z-[99] w-[320px] max-w-[calc(100vw-32px)] max-h-[70vh] overflow-y-auto rounded-2xl bg-white border border-[#E5E7EB] p-4"
          style={{
            bottom: 'calc(128px + env(safe-area-inset-bottom))',
            boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold">デザインチューナー</h4>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowExport((v) => !v)}
                className="text-[11px] font-bold text-white bg-[#111] inline-flex items-center gap-1 px-2 py-1 rounded-md active:opacity-70"
                title="Claude に渡すための現在値を表示"
              >
                <Copy size={11} />
                Export
              </button>
              <button
                type="button"
                onClick={reset}
                className="text-[11px] text-[var(--color-subtext)] inline-flex items-center gap-1 active:opacity-60"
                title="全項目を初期値に戻す"
              >
                <RotateCcw size={12} />
                全リセット
              </button>
            </div>
          </div>
          <p className="text-[10px] text-[var(--color-subtext)] leading-snug mb-3">
            スライダーを動かすと即反映。値は端末に保存される。『Export』で現在値を Claude 用にコピーできるで。
          </p>

          {showExport && (
            <div className="mb-3 p-2 rounded-lg bg-[#FAFAFA] border border-[#E5E7EB]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold">現在値（これを Claude に貼り付けて）</span>
                <button
                  type="button"
                  onClick={copyExport}
                  className="text-[11px] font-bold inline-flex items-center gap-1 px-2 py-1 rounded bg-[#111] text-white active:opacity-70"
                >
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? 'コピー済' : 'コピー'}
                </button>
              </div>
              <textarea
                readOnly
                value={exportText}
                onFocus={(e) => e.target.select()}
                className="w-full h-40 text-[10px] font-mono leading-tight p-2 bg-white border border-[#E5E7EB] rounded resize-none"
              />
            </div>
          )}

          <div className="space-y-3">
            {groups.map((g) => {
              const collapsed = collapsedGroups[g.name];
              return (
                <section key={g.name} className="rounded-xl border border-[#F0F0F0] overflow-hidden">
                  <div className="flex items-center bg-[#FAFAFA] px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedGroups((prev) => ({ ...prev, [g.name]: !prev[g.name] }))
                      }
                      className="flex-1 flex items-center gap-1 text-left"
                    >
                      {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                      <span className="text-[11px] font-bold">{g.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => resetGroup(g.name)}
                      className="text-[10px] text-[var(--color-subtext)] active:opacity-60"
                      title={`${g.name} の初期値に戻す`}
                    >
                      初期値
                    </button>
                  </div>
                  {!collapsed && (
                    <div className="p-3 space-y-2.5">
                      {g.items.map((d) => (
                        <div key={d.key}>
                          <div className="flex items-baseline justify-between mb-0.5">
                            <label className="text-[11px] font-semibold leading-tight">{d.label}</label>
                            <span className="text-[11px] tabular-nums text-[var(--color-subtext)]">
                              {values[d.key]}
                              {d.unit}
                            </span>
                          </div>
                          <input
                            type="range"
                            min={d.min}
                            max={d.max}
                            step={d.step}
                            value={values[d.key]}
                            onChange={(e) =>
                              setValues((v) => ({ ...v, [d.key]: Number(e.target.value) }))
                            }
                            className="w-full accent-[#111]"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
