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
import { usePathname } from 'next/navigation';
import { Settings2, X, RotateCcw, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { CARD_STYLE_PRESETS } from '../lib/cardStylePresets';

// 各グループが「どのページで関係するか」のマップ。関係ないページでは非表示にして
// パネルをコンパクトに保つ (2026-05-06 ヒデさん指示)。
type GroupName = 'メンバーカード' | 'ボトムシート' | 'ダッシュボード共通' | '家庭訪問の回数' | 'ランキング';
const GROUP_PAGES: Record<GroupName, RegExp[]> = {
  // /mock/* (member-card-live など) は認証不要の live プレビューページ。
  // メンバーカード/ボトムシート系トークンを Tuner で動かして即確認できるよう含める。
  'メンバーカード':       [/^\/$/, /^\/calendar/, /^\/members/, /^\/mock\//],
  'ボトムシート':         [/^\/$/, /^\/calendar/, /^\/members/, /^\/mock\//],
  'ダッシュボード共通':   [/^\/log/],
  '家庭訪問の回数':       [/^\/log/],
  'ランキング':           [/^\/log/],
};

// ── ドロップシャドウ プリセット (Tuner 内のカード型プレビューで比較する) ──
// 2026-05-06 ヒデさん指示: 上端が背景に溶けて見えるのを防ぐタイプを中心に 5 案追加して計 10 案。
//   - 「全周ヘアライン」「全方向ぼかし」系で四辺をくっきり見せる
//   - 三段重ねで近接ぼかしを足してフチを締める
//   - スプレッド(negative) でタイトに落とすパターン
const SHADOW_PRESETS: Array<{ id: string; name: string; desc: string; value: string }> = [
  { id: 'A', name: '弱',           desc: '控えめ、紙のようなフラットさ',
    value: '0 1px 3px rgba(0,0,0,0.06)' },
  { id: 'B', name: '標準 (現在のデフォルト)', desc: '一般的なカード感、メンバー/カレンダー/ダッシュボード共通',
    value: '0 4px 12px rgba(0,0,0,0.12)' },
  { id: 'C', name: '立体',         desc: 'はっきり浮く立体感',
    value: '0 8px 24px rgba(0,0,0,0.18)' },
  { id: 'D', name: 'Notion 二段',  desc: '近+遠の柔らかい二段ぼかし',
    value: '0 2px 4px rgba(0,0,0,0.06), 0 12px 28px rgba(0,0,0,0.16)' },
  { id: 'E', name: 'Material 二段', desc: 'くっきり輪郭+遠い影で立体強調',
    value: '0 1px 2px rgba(0,0,0,0.08), 0 8px 20px rgba(0,0,0,0.20)' },
  { id: 'F', name: 'ハードエッジ',   desc: '1px ヘアラインで四辺くっきり + 軽い影',
    value: '0 0 0 1px rgba(0,0,0,0.06), 0 3px 8px rgba(0,0,0,0.08)' },
  { id: 'G', name: 'ハロー (全周ぼかし)', desc: '全方向に均等な柔らか影で上端も浮く',
    value: '0 0 0 1px rgba(0,0,0,0.04), 0 0 16px rgba(0,0,0,0.10)' },
  { id: 'H', name: 'Apple HIG 三段', desc: '近+中+遠の三層、フチが締まる',
    value: '0 1px 2px rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.06), 0 16px 32px rgba(0,0,0,0.10)' },
  { id: 'I', name: 'クリスプ下落ち', desc: 'スプレッド負で輪郭タイト、底に濃く落ちる',
    value: '0 6px 12px -2px rgba(0,0,0,0.18), 0 2px 4px -1px rgba(0,0,0,0.08)' },
  { id: 'J', name: 'ふわっと大きめ', desc: '大ボケ + 近接の薄影で奥行きを出す',
    value: '0 16px 40px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.04)' },
];
// 2026-05-06 ヒデさん指示で B 標準 → A 弱 に変更。
// 1px グレー枠線を CSS で出すようにしたので、シャドウは控えめでよくなった。
const SHADOW_DEFAULT = SHADOW_PRESETS[0].value; // A 弱
const SHADOW_STORAGE_KEY = 'houmon-app:design-tuner-shadow-v1';

// ── 枠線スタイル プリセット + スライダー (2026-05-06 ヒデさん指示) ──
//   メンバーカード(と全 .ios-card) を「もう少しくっきり」見せるため、
//   枠線とその後ろのドロップシャドウを {太さ・濃さ・影Y・影ぼかし・影濃さ} の
//   5 値に分解。プリセットは「とりあえずの一発」、その後スライダーで微調整できる。
//   組み立て後の値は --tune-mc-border に流し、--tune-mc-shadow と box-shadow で重ねる。
type BorderTune = {
  w: number;      // 枠線の太さ (px, 0-3)
  a: number;      // 枠線の濃さ (% of black, 0-30)
  sY: number;     // 後ろ影の Y オフセット (px, 0-12)
  sBlur: number;  // 後ろ影のぼかし (px, 0-30)
  sAlpha: number; // 後ろ影の濃さ (% of black, 0-25)
};
const BORDER_PRESETS: Array<{ id: string; name: string; desc: string } & BorderTune> = [
  { id: 'B0', name: 'なし (現在のデフォルト)', desc: '枠線なし、シャドウのみ',
    w: 0,   a: 0,  sY: 0, sBlur: 0,  sAlpha: 0 },
  { id: 'B1', name: 'グレー細枠 薄',     desc: '1px ヘアライン (透明度8%)',
    w: 1,   a: 8,  sY: 0, sBlur: 0,  sAlpha: 0 },
  { id: 'B2', name: 'グレー細枠 標準',   desc: '1px ヘアライン (透明度12%)',
    w: 1,   a: 12, sY: 0, sBlur: 0,  sAlpha: 0 },
  { id: 'B3', name: 'グレー細枠 濃',     desc: '1px ヘアライン (透明度18%)',
    w: 1,   a: 18, sY: 0, sBlur: 0,  sAlpha: 0 },
  { id: 'B4', name: 'グレー1.5px枠',      desc: '1.5px のしっかりめ枠',
    w: 1.5, a: 12, sY: 0, sBlur: 0,  sAlpha: 0 },
  { id: 'B5', name: 'グレー細枠 + 薄影', desc: '1px 枠 + ふんわり影',
    w: 1,   a: 8,  sY: 2, sBlur: 6,  sAlpha: 6 },
  { id: 'B6', name: 'グレー細枠 + 中影', desc: '1px 枠 + 中ぐらいの影',
    w: 1,   a: 10, sY: 4, sBlur: 10, sAlpha: 8 },
  { id: 'B7', name: 'グレー細枠 + 強影', desc: '1px 枠 + 立体感のある影',
    w: 1,   a: 12, sY: 8, sBlur: 20, sAlpha: 12 },
  { id: 'B8', name: '1.5px枠 + 薄影',     desc: '1.5px 枠 + 軽い影',
    w: 1.5, a: 10, sY: 2, sBlur: 4,  sAlpha: 6 },
  { id: 'B9', name: '太枠 + 強影',         desc: '2px 枠 + しっかりめの影',
    w: 2,   a: 10, sY: 6, sBlur: 16, sAlpha: 10 },
];
// BORDER_PRESETS[0] は { id, name, desc } も持つので spread 経由で
// BorderTune に取り出すと余計なフィールドが state/localStorage に紛れる。
// ここで素のオブジェクトを定義して default として使う。
// 2026-05-06: 基本の 1px グレー枠線は globals.css の border で描くように変更。
// この BORDER_DEFAULT_TUNE は「Tuner で追加で重ねる box-shadow 枠」のデフォルト。
// 0 で重ねない (= CSS の 1px 枠だけ表示) のがデフォルトに。
const BORDER_DEFAULT_TUNE: BorderTune = { w: 0, a: 0, sY: 0, sBlur: 0, sAlpha: 0 };
const BORDER_STORAGE_KEY = 'houmon-app:design-tuner-border-v1';

// ── デザインパターン (10 案 / 実在アプリ参考) ──
// 2026-05-06 ヒデさん指示: 実画面でシャドウ + 枠線 + 角丸を 1 セット切替して比較する。
// クリックで以下 3 つの CSS 変数を一括反映する:
//   --tune-mc-shadow        (box-shadow)
//   --tune-mc-border-style  (CSS の border ショートハンド)
//   --tune-mc-radius        (border-radius)
// ※ プリセット適用時は 既存の "BorderTune" (box-shadow 枠) は 0 にリセット。
//    枠線は CSS の border 側で描くので、box-shadow 枠と二重になるのを避ける。
const PERSONA_STORAGE_KEY = 'houmon-app:design-tuner-persona-v1';
const RADIUS_STORAGE_KEY  = 'houmon-app:design-tuner-radius-v1';
const BORDER_STYLE_STORAGE_KEY = 'houmon-app:design-tuner-border-style-v1';
// 「未選択」を示す番号
const PERSONA_NONE = 0;

// BorderTune を box-shadow の値に組み立てる。
// 全部 0 なら no-op の透明値 (他の box-shadow レイヤーと併用するため空文字は不可)。
//
// 重要: 1 本だけスライダーを動かしても見た目が変わるよう、
// 濃さ/ぼかしが未指定でも安全側のデフォルトでフォールバックして描画する。
//   - 枠線: w > 0 なら描画。a が 0 なら 12% (B 標準濃さ) で代替。
//   - 影:   sY/sBlur/sAlpha のいずれかが > 0 なら描画。0 のものは
//           それぞれ sBlur=8, sAlpha=8 にフォールバック (sY=0 はそのまま)。
function composeBorder(t: BorderTune): string {
  const parts: string[] = [];
  if (t.w > 0) {
    const a = t.a > 0 ? t.a : 12;
    parts.push(`0 0 0 ${t.w}px rgba(0,0,0,${(a / 100).toFixed(2)})`);
  }
  if (t.sY > 0 || t.sBlur > 0 || t.sAlpha > 0) {
    const sBlur = t.sBlur > 0 ? t.sBlur : 8;
    const sAlpha = t.sAlpha > 0 ? t.sAlpha : 8;
    parts.push(`0 ${t.sY}px ${sBlur}px rgba(0,0,0,${(sAlpha / 100).toFixed(2)})`);
  }
  return parts.length > 0 ? parts.join(', ') : '0 0 #0000';
}

// 5 値が同じプリセットがあれば返す (見つからなければ undefined → "カスタム" 表示)
function findBorderPreset(t: BorderTune) {
  return BORDER_PRESETS.find((p) => p.w === t.w && p.a === t.a && p.sY === t.sY && p.sBlur === t.sBlur && p.sAlpha === t.sAlpha);
}

type TuneDef = {
  key: string;
  label: string;
  cssVar: string;
  unit: '' | 'rem' | 'px' | 'em';
  min: number;
  max: number;
  step: number;
  default: number;
  group: 'メンバーカード' | 'ボトムシート' | 'ダッシュボード共通' | '家庭訪問の回数' | 'ランキング';
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
  // デフォルト値はヒデさんが実機調整して決めた値 (2026-05-06 スクショ反映)
  { key: 'mcStripeW',      label: '帯の太さ',                 cssVar: '--tune-mc-stripe',       unit: 'px',  min: 0,    max: 16,    step: 1,      default: 8,    group: 'メンバーカード' },
  { key: 'mcKanaSize',     label: 'ふりがなのサイズ',         cssVar: '--tune-mc-kana',         unit: 'rem', min: 0.5,  max: 1,     step: 0.0625, default: 0.5625,group: 'メンバーカード' },
  { key: 'mcNameSize',     label: '名前のサイズ',             cssVar: '--tune-mc-name',         unit: 'rem', min: 0.75, max: 1.25,  step: 0.0625, default: 1,    group: 'メンバーカード' },
  { key: 'mcMetaSize',     label: 'メタ行 (組織/住所/訪問) サイズ', cssVar: '--tune-mc-meta',     unit: 'rem', min: 0.5,  max: 0.875, step: 0.0625, default: 0.625,group: 'メンバーカード' },
  { key: 'mcPadX',         label: 'カード左右パディング',     cssVar: '--tune-mc-pad-x',        unit: 'rem', min: 0,    max: 1.5,   step: 0.0625, default: 0.75, group: 'メンバーカード' },
  { key: 'mcPadTop',       label: 'カード上パディング',       cssVar: '--tune-mc-pad-top',      unit: 'rem', min: 0,    max: 1.5,   step: 0.0625, default: 0.9375,group: 'メンバーカード' },
  { key: 'mcPadY',         label: 'カード下パディング',       cssVar: '--tune-mc-pad-y',        unit: 'rem', min: 0,    max: 1.5,   step: 0.0625, default: 0.9375,group: 'メンバーカード' },
  // 2 段カード (訪問ログ付き) のときだけ効くヘッダー下余白。
  // 「2026/5/5 14時」と下のグレーログの間を詰めるため独立変数化 (2026-05-06)。
  { key: 'mcPadYLog',      label: 'ヘッダー下パディング(ログ付き時)', cssVar: '--tune-mc-pad-y-log', unit: 'rem', min: 0, max: 1.5, step: 0.0625, default: 0.375, group: 'メンバーカード' },
  // 0/1 → none/inline-block (chevron 表示切替)
  { key: 'mcChevron',      label: 'Chevron 表示 (0=隠す/1=表示)', cssVar: '--tune-mc-chevron',  unit: '',    min: 0,    max: 1,     step: 1,      default: 0,    group: 'メンバーカード',
    formatValue: (v) => v >= 1 ? 'inline-block' : 'none' },
  // カード間の隙間 (memberlist の縦 gap)
  { key: 'mcGap',          label: 'カード間ギャップ',         cssVar: '--tune-mc-gap',          unit: 'px',  min: 0,    max: 24,    step: 1,      default: 8,    group: 'メンバーカード' },
  // メンバーリスト最上端 (検索ヘッダー直下) と最初のカードの間。
  // ヒデさん指示 (2026-05-06): 一番上の朝日さんカード上の余白を増やしたい。
  { key: 'mcListPadTop',   label: 'リスト最上余白 (ヘッダー〜先頭カード)', cssVar: '--tune-mc-list-pad-top', unit: 'px', min: 0, max: 32, step: 1, default: 12, group: 'メンバーカード' },
  // ※ ドロップシャドウは別 UI (案カードプレビュー) で選択するため、ここではスライダー化しない。
// 訪問ログカルーセル (2 段カード時の下半分) との縦余白。
  // ヘッダー (氏名+組織+住所+時刻) と訪問ログの間。
  { key: 'mcLogGapTop',    label: 'ヘッダーと訪問ログの隙間',  cssVar: '--tune-mc-log-gap-top',  unit: 'px',  min: 0,    max: 20,   step: 1,      default: 0,    group: 'メンバーカード' },
  // 訪問ログカルーセル下、カード下端との余白。
  { key: 'mcLogGapBottom', label: '訪問ログとカード下端の隙間', cssVar: '--tune-mc-log-gap-bottom', unit: 'px', min: 0,   max: 20,   step: 1,      default: 14,   group: 'メンバーカード' },

  // ── ボトムシート背景色 ──
  // 0 = 真っ白、上に行くほど明度を下げてグレー寄りにする (HSL の lightness を 100→70 で動かす)
  { key: 'sheetBgGray',    label: 'シート背景の濃さ (0=白)',  cssVar: '--tune-sheet-bg',        unit: '',    min: 0,    max: 30,    step: 1,      default: 0,    group: 'ボトムシート',
    formatValue: (v) => `hsl(0, 0%, ${100 - v}%)` },

  // ── ダッシュボード共通 (/log ページのカード周り) ──
  { key: 'cardPad',        label: 'カード周囲パディング',     cssVar: '--tune-card-pad',        unit: 'rem', min: 0.5,  max: 2.5,  step: 0.125,  default: 2.125,group: 'ダッシュボード共通' },
  { key: 'cardGap',        label: 'カード間の隙間',           cssVar: '--tune-card-gap',        unit: 'rem', min: 0.25, max: 2,    step: 0.125,  default: 1,    group: 'ダッシュボード共通' },
  { key: 'sectionPadTop',  label: 'コンテンツ上余白',         cssVar: '--tune-section-pad-top', unit: 'rem', min: 0,    max: 2,    step: 0.125,  default: 0.75, group: 'ダッシュボード共通' },

  // ── 家庭訪問の回数 (Hero ナンバー) ──
  { key: 'heroSize',       label: 'Heroナンバーのサイズ',     cssVar: '--tune-hero-size',       unit: 'rem', min: 1.5,  max: 6,    step: 0.125,  default: 4,    group: '家庭訪問の回数' },
  // フォントウェイト (100-900、太字を細かく刻める)
  { key: 'heroWeight',     label: 'Heroナンバーの太さ (100-900)', cssVar: '--tune-hero-weight', unit: '', min: 100, max: 900, step: 100, default: 700, group: '家庭訪問の回数' },
  { key: 'heroTracking',   label: 'Heroナンバーの文字間',     cssVar: '--tune-hero-tracking',   unit: 'em',  min: -0.1, max: 0.05, step: 0.005, default: -0.03, group: '家庭訪問の回数' },

  // ── ランキング (訪問回数 TOP5) ──
  { key: 'rankingRowPad',  label: '行の上下パディング',       cssVar: '--tune-ranking-row-pad', unit: 'rem', min: 0.1,  max: 1,    step: 0.0625, default: 0.725,group: 'ランキング' },
  { key: 'rankingNumSize', label: '数字のサイズ (順位/回数)', cssVar: '--tune-ranking-num',     unit: 'rem', min: 0.75, max: 2,    step: 0.0625, default: 1.5,  group: 'ランキング' },
  { key: 'rankingNameSize',label: 'メンバー名のサイズ',       cssVar: '--tune-ranking-name',    unit: 'rem', min: 0.75, max: 1.5,  step: 0.0625, default: 0.875,group: 'ランキング' },
];

const STORAGE_KEY = 'houmon-app:design-tuner-v1';

// パネル高さの保存キー (px、ユーザーがドラッグして決めた値)
const PANEL_HEIGHT_KEY = 'houmon-app:design-tuner-height-v1';
// パネル位置オフセット (デフォルト位置からの相対 px {dx, dy})
const PANEL_OFFSET_KEY = 'houmon-app:design-tuner-offset-v1';

// 設定バージョン: コード側でデフォルトを変えたときにこの数字を 1 上げる。
// localStorage に同じ番号が入ってなければ「古い保存値」とみなして全部捨てて
// 新しいデフォルトを採用する。これでヒデさん側に「初期値」を押させずに
// デプロイだけで全員リセットできる。
//   v1 (= 旧) : 番号自体がなかった時代の保存値 (黒シャドウ強め等)
//   v2        : 2026-05-06 枠線 0.5px / 12% デフォルト (薄すぎたので没)
//   v3        : 2026-05-06 枠線 1px / 15% デフォルトに引き上げ (まだ薄かった)
//   v4        : 2026-05-06 枠線 1px / 25% にさらに引き上げ (PWA に届かず)
//   v5        : 2026-05-06 枠線を CSS border に変更、JS デフォルトは 0 に
//   v6        : 2026-05-06 シャドウを B 標準 → A 弱 に控えめ化
//   v7 (現行) : 2026-05-06 デザインパターン 10 案を導入 (radius / border-style 追加)
const SETTINGS_VERSION = 7;
const SETTINGS_VERSION_KEY = 'houmon-app:design-tuner-version';

export default function DesignTuner() {
  const pathname = usePathname();
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
  // 選択中のシャドウ案 (CSS 値そのまま保存)。デフォルトは B (標準)。
  const [shadowValue, setShadowValue] = useState<string>(SHADOW_DEFAULT);
  // 枠線スタイル: 太さ/濃さ/後ろ影オフセY/後ろ影ぼかし/後ろ影濃さ の 5 値。
  // プリセットでも 5 値が一括セットされる。デフォルトは B0 (全部 0 = 枠線なし)。
  const [borderTune, setBorderTune] = useState<BorderTune>({ ...BORDER_DEFAULT_TUNE });
  // 選択中のデザインパターン番号 (1-10)。0 で未選択 = チューナー個別調整に従う。
  const [personaId, setPersonaId] = useState<number>(PERSONA_NONE);
  // パターンが直接書く CSS の border-radius (例: '12px') と border (例: '1px solid rgba(0,0,0,0.04)' or 'none')。
  // 空文字なら globals.css のフォールバック (6px / 1px solid rgba 0.08) が効く。
  const [cardRadius, setCardRadius] = useState<string>('');
  const [cardBorderStyle, setCardBorderStyle] = useState<string>('');

  // localStorage から復元（初回のみ）
  useEffect(() => {
    // バージョンチェック: コード側のデフォルトを変えたとき (SETTINGS_VERSION を上げたとき)
    // 古い localStorage 値は捨てて、コード側のデフォルトを採用する。
    let storedVer = 0;
    try {
      const raw = window.localStorage.getItem(SETTINGS_VERSION_KEY);
      storedVer = raw ? Number(raw) : 0;
    } catch { /* 無視 */ }
    const versionMismatch = storedVer !== SETTINGS_VERSION;
    if (versionMismatch) {
      // 古い保存値を全部消して、新しいバージョン番号を打つ。
      try {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(SHADOW_STORAGE_KEY);
        window.localStorage.removeItem(BORDER_STORAGE_KEY);
        window.localStorage.removeItem(PERSONA_STORAGE_KEY);
        window.localStorage.removeItem(RADIUS_STORAGE_KEY);
        window.localStorage.removeItem(BORDER_STYLE_STORAGE_KEY);
        window.localStorage.setItem(SETTINGS_VERSION_KEY, String(SETTINGS_VERSION));
      } catch { /* 無視 */ }
    }

    // バージョン一致のときだけ過去の保存値を復元する。
    if (!versionMismatch) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as Record<string, number>;
          setValues((prev) => ({ ...prev, ...saved }));
        }
      } catch {
        // 壊れてたら無視
      }
      // シャドウ案も復元
      try {
        const rawShadow = window.localStorage.getItem(SHADOW_STORAGE_KEY);
        if (rawShadow) setShadowValue(rawShadow);
      } catch { /* 無視 */ }
      // 枠線案も復元 (新形式: BorderTune JSON)。
      // 旧形式 (CSS 文字列) で保存されていた場合は無視してデフォルトに戻す。
      try {
        const rawBorder = window.localStorage.getItem(BORDER_STORAGE_KEY);
        if (rawBorder && rawBorder.trim().startsWith('{')) {
          const parsed = JSON.parse(rawBorder) as Partial<BorderTune>;
          setBorderTune({
            w:      typeof parsed.w === 'number'      ? parsed.w      : BORDER_DEFAULT_TUNE.w,
            a:      typeof parsed.a === 'number'      ? parsed.a      : BORDER_DEFAULT_TUNE.a,
            sY:     typeof parsed.sY === 'number'     ? parsed.sY     : BORDER_DEFAULT_TUNE.sY,
            sBlur:  typeof parsed.sBlur === 'number'  ? parsed.sBlur  : BORDER_DEFAULT_TUNE.sBlur,
            sAlpha: typeof parsed.sAlpha === 'number' ? parsed.sAlpha : BORDER_DEFAULT_TUNE.sAlpha,
          });
        }
      } catch { /* 無視 */ }
      // デザインパターン (10 案) の復元
      try {
        const rawP = window.localStorage.getItem(PERSONA_STORAGE_KEY);
        if (rawP) {
          const n = Number(rawP);
          if (Number.isFinite(n) && n >= 1 && n <= CARD_STYLE_PRESETS.length) setPersonaId(n);
        }
        const rawR = window.localStorage.getItem(RADIUS_STORAGE_KEY);
        if (rawR) setCardRadius(rawR);
        const rawBS = window.localStorage.getItem(BORDER_STYLE_STORAGE_KEY);
        if (rawBS) setCardBorderStyle(rawBS);
      } catch { /* 無視 */ }
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
    // シャドウ値・枠線値も適用
    root.style.setProperty('--tune-mc-shadow', shadowValue);
    root.style.setProperty('--tune-mc-border', composeBorder(borderTune));
    // デザインパターン由来の CSS border / radius (空文字なら removeProperty で fallback に戻す)
    if (cardRadius) root.style.setProperty('--tune-mc-radius', cardRadius);
    else root.style.removeProperty('--tune-mc-radius');
    if (cardBorderStyle) root.style.setProperty('--tune-mc-border-style', cardBorderStyle);
    else root.style.removeProperty('--tune-mc-border-style');
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
      window.localStorage.setItem(SHADOW_STORAGE_KEY, shadowValue);
      window.localStorage.setItem(BORDER_STORAGE_KEY, JSON.stringify(borderTune));
      window.localStorage.setItem(PERSONA_STORAGE_KEY, String(personaId));
      window.localStorage.setItem(RADIUS_STORAGE_KEY, cardRadius);
      window.localStorage.setItem(BORDER_STYLE_STORAGE_KEY, cardBorderStyle);
    } catch {
      // 容量オーバー等は無視
    }
  }, [values, shadowValue, borderTune, cardRadius, cardBorderStyle, personaId, hydrated]);

  // デザインパターン (10 案) を適用する。クリック 1 回でシャドウ / 枠線 / 角丸を一括反映。
  // 既存の "BorderTune" (box-shadow 枠) は 0 にリセット — パターン側の CSS 枠線と二重にならないよう。
  const applyPersona = useCallback((id: number) => {
    const p = CARD_STYLE_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPersonaId(id);
    setShadowValue(p.shadow);
    setCardRadius(p.radius);
    setCardBorderStyle(p.borderStyle);
    setBorderTune({ ...BORDER_DEFAULT_TUNE });
  }, []);
  // パターン解除 (元のチューナー個別調整に戻す)。
  const clearPersona = useCallback(() => {
    setPersonaId(PERSONA_NONE);
    setCardRadius('');
    setCardBorderStyle('');
  }, []);

  const reset = useCallback(() => {
    const init: Record<string, number> = {};
    DEFS.forEach((d) => (init[d.key] = d.default));
    setValues(init);
    setShadowValue(SHADOW_DEFAULT);
    setBorderTune({ ...BORDER_DEFAULT_TUNE });
    setPersonaId(PERSONA_NONE);
    setCardRadius('');
    setCardBorderStyle('');
  }, []);

  const resetGroup = useCallback((group: string) => {
    setValues((prev) => {
      const next = { ...prev };
      DEFS.filter((d) => d.group === group).forEach((d) => {
        next[d.key] = d.default;
      });
      return next;
    });
    if (group === 'メンバーカード') {
      setShadowValue(SHADOW_DEFAULT);
      setBorderTune({ ...BORDER_DEFAULT_TUNE });
      setPersonaId(PERSONA_NONE);
      setCardRadius('');
      setCardBorderStyle('');
    }
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
    // ドロップシャドウ (案カード選択)
    const sp = SHADOW_PRESETS.find((p) => p.value === shadowValue);
    lines.push(`- カード ドロップシャドウ (--tune-mc-shadow): ${sp ? `${sp.id} ${sp.name}` : 'カスタム'} = ${shadowValue}`);
    // デザインパターン (10 案)
    if (personaId > 0) {
      const pp = CARD_STYLE_PRESETS.find((x) => x.id === personaId);
      if (pp) {
        lines.push(`- デザインパターン: ${pp.id}. ${pp.title}`);
        lines.push(`  border: ${pp.borderStyle}`);
        lines.push(`  border-radius: ${pp.radius}`);
        lines.push(`  box-shadow: ${pp.shadow}`);
      }
    }
    // 枠線スタイル (案カード選択 + 5 値スライダー)
    const bp = findBorderPreset(borderTune);
    const borderCss = composeBorder(borderTune);
    lines.push(`- カード 枠線スタイル (--tune-mc-border): ${bp ? `${bp.id} ${bp.name}` : 'カスタム'} = ${borderCss}`);
    lines.push(`  枠線太さ=${borderTune.w}px / 濃さ=${borderTune.a}% / 影Y=${borderTune.sY}px / 影ぼかし=${borderTune.sBlur}px / 影濃さ=${borderTune.sAlpha}%`);
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

  // グループごとに DEFS をまとめる（表示順を維持）。
  // 現在のページに関係ないグループは除外して、パネルをコンパクトに保つ。
  const groups: { name: string; items: TuneDef[] }[] = [];
  for (const d of DEFS) {
    const matchers = GROUP_PAGES[d.group];
    const isRelevant = matchers ? matchers.some((re) => re.test(pathname ?? '')) : true;
    if (!isRelevant) continue;
    let g = groups.find((x) => x.name === d.group);
    if (!g) {
      g = { name: d.group, items: [] };
      groups.push(g);
    }
    g.items.push(d);
  }

  return (
    <>
      {/* フローティングトグルボタン（現在地ボタンの真上に配置）。
          現在地ボタン: シート上端 + 12px、48px (w-12 h-12)。
          ここはその上に 8px gap で 44px (w-11 h-11)。
          PEEK_HEIGHT(320) + 12 + 48 + 8 = 388px from bottom。 */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="デザインチューナーを開く"
        className="fixed right-4 z-[100] w-11 h-11 rounded-full bg-[#111] text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        style={{ bottom: 'calc(388px + env(safe-area-inset-bottom))' }}
      >
        {open ? <X size={18} /> : <Settings2 size={18} />}
      </button>

      {/* パネル本体: 上端にドラッグハンドル + ヘッダー + 内部スクロール領域
          高さはユーザーがドラッグで調整可能 (panelHeight)。 */}
      {open && (
        <div
          className="fixed right-4 z-[99] w-[300px] max-w-[calc(100vw-32px)] rounded-2xl bg-white/95 backdrop-blur border border-[#E5E7EB] flex flex-col"
          style={{
            bottom: 'calc(444px + env(safe-area-inset-bottom))',
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
                      {/* デザインパターン 10 案: シャドウ + 枠線 + 角丸を一括切替 (2026-05-06) */}
                      {g.name === 'メンバーカード' && (
                        <div className="rounded-md bg-[#FFF7ED] p-2 space-y-2 border border-[#FED7AA]">
                          <div className="flex items-baseline justify-between">
                            <span className="text-[10px] font-semibold">🎨 デザインパターン (10 案)</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] text-[var(--color-subtext)]">
                                {personaId > 0
                                  ? `案 ${personaId}`
                                  : 'カスタム'}
                              </span>
                              {personaId > 0 && (
                                <button
                                  type="button"
                                  onClick={clearPersona}
                                  className="text-[9px] text-[var(--color-subtext)] underline active:opacity-60"
                                  title="パターン解除"
                                >
                                  解除
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-[9px] text-[var(--color-subtext)] leading-tight">
                            シャドウ + 枠線 + 角丸を 1 セットで一括切替。実在アプリの elevation を参考。
                          </p>
                          {CARD_STYLE_PRESETS.map((p) => {
                            const active = personaId === p.id;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => applyPersona(p.id)}
                                className={`w-full flex items-stretch bg-white overflow-hidden text-left transition-transform active:scale-[0.99] ${
                                  active ? 'ring-2 ring-[#0EA5E9]' : ''
                                }`}
                                style={{
                                  boxShadow: p.shadow,
                                  border: p.borderStyle === 'none' ? undefined : p.borderStyle,
                                  borderRadius: p.radius,
                                }}
                              >
                                <span className="w-1.5 shrink-0" style={{ background: '#0891B2' }} />
                                <div className="flex-1 px-2 py-1.5 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[11px] font-bold leading-tight">{p.id}. {p.title}</span>
                                    {active && <Check size={11} className="text-[#0EA5E9]" />}
                                  </div>
                                  <div className="text-[9px] text-[var(--color-subtext)] leading-tight truncate">
                                    {p.inspiration}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {/* メンバーカード グループの先頭にシャドウ案カードを表示 */}
                      {g.name === 'メンバーカード' && (
                        <div className="rounded-md bg-[#F5F5F5] p-2 space-y-2">
                          <div className="flex items-baseline justify-between">
                            <span className="text-[10px] font-semibold">カード ドロップシャドウ ({SHADOW_PRESETS.length}案)</span>
                            {(() => {
                              const sp = SHADOW_PRESETS.find((p) => p.value === shadowValue);
                              return (
                                <span className="text-[9px] text-[var(--color-subtext)]">
                                  選択中: {sp ? `${sp.id} ${sp.name}` : 'カスタム'}
                                </span>
                              );
                            })()}
                          </div>
                          {SHADOW_PRESETS.map((p) => {
                            const active = shadowValue === p.value;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setShadowValue(p.value)}
                                className={`w-full flex items-stretch bg-white rounded-md overflow-hidden text-left transition-transform active:scale-[0.99] ${
                                  active ? 'ring-2 ring-[#0EA5E9]' : ''
                                }`}
                                style={{ boxShadow: p.value }}
                              >
                                <span className="w-1.5 shrink-0" style={{ background: '#0891B2' }} />
                                <div className="flex-1 px-2 py-1.5 min-w-0">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[11px] font-bold leading-tight">{p.id}. {p.name}</span>
                                    {active && <Check size={11} className="text-[#0EA5E9]" />}
                                  </div>
                                  <div className="text-[9px] text-[var(--color-subtext)] leading-tight truncate">{p.desc}</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {/* 枠線スタイル: プリセット 10 案 + スライダー 5 本で微調整 (2026-05-06) */}
                      {g.name === 'メンバーカード' && (() => {
                        const matched = findBorderPreset(borderTune);
                        const bt = borderTune;
                        // スライダー定義 (label, key, min, max, step, unit, 値の取り方)
                        const borderSliders: Array<{
                          label: string; key: keyof BorderTune;
                          min: number; max: number; step: number; unit: string;
                        }> = [
                          { label: '枠線の太さ',         key: 'w',      min: 0, max: 3,  step: 0.5, unit: 'px' },
                          { label: '枠線の濃さ (グレー)', key: 'a',      min: 0, max: 30, step: 1,   unit: '%'  },
                          { label: '後ろ影 オフセットY', key: 'sY',     min: 0, max: 12, step: 1,   unit: 'px' },
                          { label: '後ろ影 ぼかし',      key: 'sBlur',  min: 0, max: 30, step: 1,   unit: 'px' },
                          { label: '後ろ影 濃さ',        key: 'sAlpha', min: 0, max: 25, step: 1,   unit: '%'  },
                        ];
                        return (
                          <div className="rounded-md bg-[#F5F5F5] p-2 space-y-2">
                            <div className="flex items-baseline justify-between">
                              <span className="text-[10px] font-semibold">カード 枠線スタイル ({BORDER_PRESETS.length}案 + 微調整)</span>
                              <span className="text-[9px] text-[var(--color-subtext)]">
                                選択中: {matched ? `${matched.id} ${matched.name}` : 'カスタム'}
                              </span>
                            </div>
                            <p className="text-[9px] text-[var(--color-subtext)] leading-tight">
                              プリセットでまず雰囲気を選び、下のスライダーで太さ・濃さ・後ろ影を微調整できます。シャドウ案と重なって表示されます。
                            </p>
                            {BORDER_PRESETS.map((p) => {
                              const active = matched?.id === p.id;
                              const previewShadow = composeBorder(p);
                              const safePreview = previewShadow === '0 0 #0000'
                                ? '0 1px 2px rgba(0,0,0,0.06)'
                                : previewShadow;
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => setBorderTune({ w: p.w, a: p.a, sY: p.sY, sBlur: p.sBlur, sAlpha: p.sAlpha })}
                                  className={`w-full flex items-stretch bg-white rounded-md overflow-hidden text-left transition-transform active:scale-[0.99] ${
                                    active ? 'ring-2 ring-[#0EA5E9]' : ''
                                  }`}
                                  style={{ boxShadow: safePreview }}
                                >
                                  <span className="w-1.5 shrink-0" style={{ background: '#0891B2' }} />
                                  <div className="flex-1 px-2 py-1.5 min-w-0">
                                    <div className="flex items-center gap-1">
                                      <span className="text-[11px] font-bold leading-tight">{p.id}. {p.name}</span>
                                      {active && <Check size={11} className="text-[#0EA5E9]" />}
                                    </div>
                                    <div className="text-[9px] text-[var(--color-subtext)] leading-tight truncate">{p.desc}</div>
                                  </div>
                                </button>
                              );
                            })}
                            {/* 5 本のスライダーで微調整 */}
                            <div className="bg-white rounded-md p-2 space-y-1.5 mt-1">
                              <div className="text-[10px] font-semibold mb-0.5">微調整</div>
                              {borderSliders.map((s) => (
                                <div key={s.key}>
                                  <div className="flex items-baseline justify-between mb-0.5 gap-2">
                                    <label className="text-[10px] font-semibold leading-tight truncate">{s.label}</label>
                                    <span className="text-[10px] tabular-nums text-[var(--color-subtext)] shrink-0">
                                      {bt[s.key]}{s.unit}
                                    </span>
                                  </div>
                                  <input
                                    type="range"
                                    min={s.min}
                                    max={s.max}
                                    step={s.step}
                                    value={bt[s.key]}
                                    onChange={(e) => {
                                      const v = Number(e.target.value);
                                      setBorderTune((prev) => ({ ...prev, [s.key]: v }));
                                    }}
                                    className="w-full accent-[#111]"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
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
