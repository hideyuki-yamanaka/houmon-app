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
  group: 'メンバーカード' | 'ボトムシート';
  /** 値を CSS 変数文字列に変換するカスタムフォーマッタ。
   *  例: 0/1 → 'none'/'inline-block' でトグル風に使う。 */
  formatValue?: (v: number) => string;
};

// 調整可能なデザイントークン一覧 (2026-05-05 整理: メンバーカード + ボトムシート に集約)
//   ダッシュボードページ用の旧トークンは削除。スマホ運用で実際に弄りたいのは
//   ホーム (メンバーリスト + ボトムシート) なので、その2つに絞る。
//   旧 CSS 変数は使用箇所側のフォールバック値で動き続ける。
const DEFS: TuneDef[] = [
  // ── メンバーカード (案 1: 左組織色帯) ──
  { key: 'mcStripeW',      label: '帯の太さ',                 cssVar: '--tune-mc-stripe',       unit: 'px',  min: 0,    max: 16,    step: 1,      default: 8,    group: 'メンバーカード' },
  { key: 'mcKanaSize',     label: 'ふりがなのサイズ',         cssVar: '--tune-mc-kana',         unit: 'rem', min: 0.5,  max: 1,     step: 0.0625, default: 0.5625,group: 'メンバーカード' },
  { key: 'mcNameSize',     label: '名前のサイズ',             cssVar: '--tune-mc-name',         unit: 'rem', min: 0.75, max: 1.25,  step: 0.0625, default: 0.9375,group: 'メンバーカード' },
  { key: 'mcMetaSize',     label: 'メタ行 (組織/住所/訪問) サイズ', cssVar: '--tune-mc-meta',     unit: 'rem', min: 0.5,  max: 0.875, step: 0.0625, default: 0.6875,group: 'メンバーカード' },
  { key: 'mcPadX',         label: 'カード左右パディング',     cssVar: '--tune-mc-pad-x',        unit: 'rem', min: 0.25, max: 1.5,   step: 0.0625, default: 0.75, group: 'メンバーカード' },
  { key: 'mcPadY',         label: 'カード上下パディング',     cssVar: '--tune-mc-pad-y',        unit: 'rem', min: 0.25, max: 1.5,   step: 0.0625, default: 1,    group: 'メンバーカード' },
  // 0/1 → none/inline-block (chevron 表示切替)
  { key: 'mcChevron',      label: 'Chevron 表示 (0=隠す/1=表示)', cssVar: '--tune-mc-chevron',  unit: '',    min: 0,    max: 1,     step: 1,      default: 0,    group: 'メンバーカード',
    formatValue: (v) => v >= 1 ? 'inline-block' : 'none' },
  // カード間の隙間 (memberlist の縦 gap)
  { key: 'mcGap',          label: 'カード間ギャップ',         cssVar: '--tune-mc-gap',          unit: 'px',  min: 0,    max: 24,    step: 1,      default: 0,    group: 'メンバーカード' },
  // 0=none, 1=sm, 2=md, 3=lg のドロップシャドウ。デフォルト 3 (案 4 採用)
  { key: 'mcShadow',       label: 'カード ドロップシャドウ (0=なし/1=弱/2=中/3=強)', cssVar: '--tune-mc-shadow', unit: '', min: 0, max: 3, step: 1, default: 3, group: 'メンバーカード',
    formatValue: (v) => {
      if (v >= 3) return '0 4px 12px rgba(0,0,0,0.12)';
      if (v >= 2) return '0 2px 6px rgba(0,0,0,0.08)';
      if (v >= 1) return '0 1px 3px rgba(0,0,0,0.06)';
      return 'none';
    } },

  // ── ボトムシート背景色 ──
  // 0 = 真っ白、上に行くほど明度を下げてグレー寄りにする (HSL の lightness を 100→70 で動かす)
  { key: 'sheetBgGray',    label: 'シート背景の濃さ (0=白)',  cssVar: '--tune-sheet-bg',        unit: '',    min: 0,    max: 30,    step: 1,      default: 0,    group: 'ボトムシート',
    formatValue: (v) => `hsl(0, 0%, ${100 - v}%)` },
];

const STORAGE_KEY = 'houmon-app:design-tuner-v1';

// パネル高さの保存キー (px、ユーザーがドラッグして決めた値)
const PANEL_HEIGHT_KEY = 'houmon-app:design-tuner-height-v1';
// パネル位置オフセット (デフォルト位置からの相対 px {dx, dy})
const PANEL_OFFSET_KEY = 'houmon-app:design-tuner-offset-v1';

export default function DesignTuner() {
  const [open, setOpen] = useState(false);
  // グループ単位の折りたたみ (個別に開閉可能。デフォルト全展開)。
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  // パネル全体の高さ (px)。上端のドラッグハンドルでユーザーが調整可能。
  // デフォルト = 約 50vh 相当だが SSR で window 取れないので、初期値は固定 + マウント後に
  // localStorage から復元。最小 200px、最大 = window.innerHeight - 200px くらい。
  const [panelHeight, setPanelHeight] = useState<number>(420);
  // パネルの位置オフセット (デフォルト = 右下固定。ユーザーがタイトル部をドラッグして移動可能)
  const [panelOffset, setPanelOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
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
    // パネル高さ復元 (なければデフォルト 420px、画面が小さければ 50vh で調整)
    try {
      const rawH = window.localStorage.getItem(PANEL_HEIGHT_KEY);
      if (rawH) {
        const h = Number(rawH);
        if (Number.isFinite(h) && h > 100) setPanelHeight(h);
      } else {
        setPanelHeight(Math.max(240, Math.min(420, Math.floor(window.innerHeight * 0.5))));
      }
    } catch { /* 無視 */ }
    // パネルオフセット復元
    try {
      const rawOff = window.localStorage.getItem(PANEL_OFFSET_KEY);
      if (rawOff) {
        const parsed = JSON.parse(rawOff) as { dx: number; dy: number };
        if (Number.isFinite(parsed.dx) && Number.isFinite(parsed.dy)) setPanelOffset(parsed);
      }
    } catch { /* 無視 */ }
    setHydrated(true);
  }, []);

  // パネル高さ + オフセットを localStorage に保存
  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(PANEL_HEIGHT_KEY, String(panelHeight)); } catch { /* 無視 */ }
  }, [panelHeight, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(PANEL_OFFSET_KEY, JSON.stringify(panelOffset)); } catch { /* 無視 */ }
  }, [panelOffset, hydrated]);

  // タイトル部のドラッグでパネル全体を移動。
  const startMove = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const startOff = panelOffset;
    const prevSel = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    const onMove = (ev: PointerEvent) => {
      setPanelOffset({
        dx: startOff.dx + (ev.clientX - startX),
        dy: startOff.dy + (ev.clientY - startY),
      });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.body.style.userSelect = prevSel;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [panelOffset]);

  // 上端ドラッグでパネル高さを変更するハンドラ。
  // ハンドル要素の onPointerDown から呼ぶ。touch/mouse 両対応のため pointer events 使用。
  const startResize = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = panelHeight;
    // ドラッグ中は body の選択を無効化 (誤テキスト選択防止)
    const prevSel = document.body.style.userSelect;
    document.body.style.userSelect = 'none';
    const max = Math.max(200, window.innerHeight - 180);
    const onMove = (ev: PointerEvent) => {
      // 上に動かすほど高さが増える (下端固定なので)
      const delta = startY - ev.clientY;
      const next = Math.max(180, Math.min(max, startH + delta));
      setPanelHeight(next);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.body.style.userSelect = prevSel;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }, [panelHeight]);

  // CSS 変数を :root に反映 + localStorage に保存
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    DEFS.forEach((d) => {
      const v = values[d.key];
      const cssValue = d.formatValue ? d.formatValue(v) : (d.unit ? `${v}${d.unit}` : `${v}`);
      root.style.setProperty(d.cssVar, cssValue);
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

  // 表示判定:
  //   - 開発環境(npm run dev)では常に表示
  //   - 本番ビルドでも、URL に ?tuner=1 が付いてる時だけ表示する
  //     (例) https://houmon-app-lilac.vercel.app/log?tuner=1
  //     → 本番アプリでもユーザー(ヒデさん)だけが裏でデザイン調整できる仕組み。
  //     ローカル dev サーバーが #practice パスバグで動かない問題への対処も兼ねる。
  const isDev = process.env.NODE_ENV !== 'production';
  const isTunerQuery =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('tuner');
  if (!isDev && !isTunerQuery) return null;

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

      {/* パネル本体: 上端にドラッグハンドル + ヘッダー + 内部スクロール領域
          高さはユーザーがドラッグで調整可能 (panelHeight)。 */}
      {open && (
        <div
          className="fixed right-4 z-[99] w-[300px] max-w-[calc(100vw-32px)] rounded-2xl bg-white/95 backdrop-blur border border-[#E5E7EB] flex flex-col"
          style={{
            bottom: 'calc(128px + env(safe-area-inset-bottom))',
            height: panelHeight,
            boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
            transform: `translate(${panelOffset.dx}px, ${panelOffset.dy}px)`,
          }}
        >
          {/* 上端のドラッグハンドル — 上方向にドラッグでパネルを高く、下方向で低く */}
          <div
            onPointerDown={startResize}
            className="shrink-0 h-3 flex items-center justify-center cursor-ns-resize touch-none select-none"
            title="ドラッグでパネルの高さを変更"
          >
            <span className="block w-10 h-1 rounded-full bg-[#D1D5DB]" />
          </div>

          {/* ヘッダー (タイトル部はドラッグで移動可能) */}
          <div className="flex items-center justify-between px-3 pb-2 shrink-0">
            <h4
              onPointerDown={startMove}
              className="text-[12px] font-bold cursor-move select-none touch-none flex-1 mr-2"
              title="ドラッグでパネルを移動"
            >
              デザインチューナー
            </h4>
            <div className="flex items-center gap-1.5">
              {(panelOffset.dx !== 0 || panelOffset.dy !== 0) && (
                <button
                  type="button"
                  onClick={() => setPanelOffset({ dx: 0, dy: 0 })}
                  className="text-[10px] text-[var(--color-subtext)] active:opacity-60"
                  title="位置を初期化"
                >
                  位置↺
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowExport((v) => !v)}
                className="text-[10px] font-bold text-white bg-[#111] inline-flex items-center gap-1 px-1.5 py-0.5 rounded active:opacity-70"
                title="Claude に渡すための現在値を表示"
              >
                <Copy size={10} />Export
              </button>
              <button
                type="button"
                onClick={reset}
                className="text-[10px] text-[var(--color-subtext)] inline-flex items-center gap-0.5 active:opacity-60"
                title="全項目を初期値に戻す"
              >
                <RotateCcw size={11} />リセット
              </button>
            </div>
          </div>

          {showExport && (
            <div className="p-2 border-y border-[#F0F0F0] bg-[#FAFAFA] shrink-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold">現在値</span>
                <button
                  type="button"
                  onClick={copyExport}
                  className="text-[10px] font-bold inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#111] text-white active:opacity-70"
                >
                  {copied ? <Check size={10} /> : <Copy size={10} />}
                  {copied ? 'コピー済' : 'コピー'}
                </button>
              </div>
              <textarea
                readOnly
                value={exportText}
                onFocus={(e) => e.target.select()}
                className="w-full h-24 text-[9px] font-mono leading-tight p-1.5 bg-white border border-[#E5E7EB] rounded resize-none"
              />
            </div>
          )}

          {/* グループ一覧 (内部スクロール、グループごとに個別折りたたみ) */}
          <div className="overflow-y-auto flex-1 px-2 pt-1 pb-2 space-y-1.5">
            {groups.map((g) => {
              const collapsed = collapsedGroups[g.name];
              return (
                <section key={g.name} className="rounded-lg border border-[#F0F0F0] overflow-hidden">
                  <div className="flex items-center bg-[#FAFAFA] px-2 py-1">
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedGroups((prev) => ({ ...prev, [g.name]: !prev[g.name] }))
                      }
                      className="flex-1 flex items-center gap-1 text-left"
                    >
                      {collapsed ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
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
                    <div className="p-2 space-y-2">
                      {g.items.map((d) => (
                        <div key={d.key}>
                          <div className="flex items-baseline justify-between mb-0.5 gap-2">
                            <label className="text-[10px] font-semibold leading-tight truncate">{d.label}</label>
                            <span className="text-[10px] tabular-nums text-[var(--color-subtext)] shrink-0">
                              {values[d.key]}{d.unit}
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
