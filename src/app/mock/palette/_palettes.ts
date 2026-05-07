// 家庭訪問アプリ カラーパレット 3案 (mock 比較用)
// 各案は base / primary / status / tags / org を一貫したトーンで揃える。

export type StatusColors = {
  bar: string;       // ピン色 / スタックバー / アイコン
  text: string;      // 数字・ラベル文字色
  bg: string;        // 弱い背景タイル色
};

export type Palette = {
  id: '1-earth' | '2-ios' | '3-neutral';
  name: string;
  shortName: string;
  caption: string;
  philosophy: string;
  base: {
    bg: string;
    card: string;
    text: string;
    subtext: string;
    border: string;
  };
  primary: string;
  status: {
    met: StatusColors;
    absent: StatusColors;
    refused: StatusColors;
    unknown: StatusColors;
    moved: StatusColors;
  };
  tags: {
    young: { bg: string; fg: string };
    star: string;
    starBg: string;
  };
  // 本部色 4種 + 地区色 9種(豊岡部の例)
  org: {
    honbu: { higashiAsahikawa: string; toyooka: string; sokaAsahi: string; toei: string };
    districts: string[]; // 豊岡 9 地区相当
  };
};

// ─────────────────────────────────────────────
// 案1: アースカラー統一 (温かみ・低彩度・落ち着き)
// ─────────────────────────────────────────────
export const PALETTE_EARTH: Palette = {
  id: '1-earth',
  name: '案1 アースカラー統一',
  shortName: 'Earth',
  caption: '温かみ・低彩度で全体を揃える',
  philosophy:
    '全体を 1 段彩度を落とした自然色トーンで統一。ダッシュボードで採用したアース系の青を全部の「会えた/達成」に展開。鮮やかなビビッドカラーは排除し、長時間見ても疲れない落ち着いた印象に。',
  base: {
    bg: '#F4F1ED',
    card: '#FFFFFF',
    text: '#2A2A2A',
    subtext: '#6E6862',
    border: '#E8E2DA',
  },
  primary: '#3F5773',
  status: {
    met:     { bar: '#4F6D8C', text: '#2A3E54', bg: '#DCE3EC' },
    absent:  { bar: '#A8A29E', text: '#44403C', bg: '#F5F4F2' },
    refused: { bar: '#B85745', text: '#7C2E22', bg: '#F5DCD8' },
    unknown: { bar: '#D97706', text: '#92400E', bg: '#FEF3C7' },
    moved:   { bar: '#9F1239', text: '#6F0A26', bg: '#FFE4E6' },
  },
  tags: {
    young: { bg: '#6FA8C7', fg: '#FFFFFF' },
    star:  '#C5985C',
    starBg: '#F5EBD9',
  },
  org: {
    honbu: {
      higashiAsahikawa: '#9F1239',
      toyooka:          '#C2410C',
      sokaAsahi:        '#65A30D',
      toei:             '#0D9488',
    },
    districts: [
      '#5B8FD9', '#5FAE82', '#E59D5A',
      '#9B7FCC', '#D17363', '#D4A85A',
      '#5BA8B8', '#7984CC', '#D67BA0',
    ],
  },
};

// ─────────────────────────────────────────────
// 案2: iOS純正モダン (鮮やか・ハイコントラスト・Apple HIG)
// ─────────────────────────────────────────────
export const PALETTE_IOS: Palette = {
  id: '2-ios',
  name: '案2 iOS純正モダン',
  shortName: 'iOS',
  caption: 'Apple HIG 準拠、鮮やかでクリーン',
  philosophy:
    'Apple の System Colors をベースに、各機能に明快な色を割り当てる。ヤングタグや星印もシステムブルー/イエローで統一。視認性・コントラストが高く、機能差が一目でわかる。「ザ・iPhone アプリ」な見た目。',
  base: {
    bg: '#F2F2F7',
    card: '#FFFFFF',
    text: '#000000',
    subtext: '#3C3C43',
    border: '#E5E5EA',
  },
  primary: '#007AFF',
  status: {
    met:     { bar: '#34C759', text: '#1D7A3F', bg: '#D6F4DE' },
    absent:  { bar: '#8E8E93', text: '#3C3C43', bg: '#E5E5EA' },
    refused: { bar: '#FF3B30', text: '#B91C1C', bg: '#FFE5E3' },
    unknown: { bar: '#FF9500', text: '#C2410C', bg: '#FFEAD0' },
    moved:   { bar: '#AF52DE', text: '#7B2DBF', bg: '#F3E8FF' },
  },
  tags: {
    young: { bg: '#5AC8FA', fg: '#FFFFFF' },
    star:  '#FFCC00',
    starBg: '#FFF6CC',
  },
  org: {
    honbu: {
      higashiAsahikawa: '#FF3B30',
      toyooka:          '#FF9500',
      sokaAsahi:        '#34C759',
      toei:             '#5AC8FA',
    },
    districts: [
      '#007AFF', '#34C759', '#FF9500',
      '#AF52DE', '#FF3B30', '#FFCC00',
      '#5AC8FA', '#5856D6', '#FF2D55',
    ],
  },
};

// ─────────────────────────────────────────────
// 案3: ニュートラル+限定アクセント (ミニマル・データ重視)
// ─────────────────────────────────────────────
export const PALETTE_NEUTRAL: Palette = {
  id: '3-neutral',
  name: '案3 ニュートラル+限定アクセント',
  shortName: 'Neutral',
  caption: 'ベースは無彩色、達成だけ青で目立たせる',
  philosophy:
    '色を使う場所を最小限に絞る。「会えた=達成」だけ明確な青で塗り、それ以外のステータスはグレースケールで淡く表現。情報量(濃淡)で差をつけて、色のノイズを下げる。プロフェッショナルで集中できる印象。組織色だけは識別のため彩度を残す。',
  base: {
    bg: '#FAFAFA',
    card: '#FFFFFF',
    text: '#0A0A0A',
    subtext: '#525252',
    border: '#E5E5E5',
  },
  primary: '#2563EB',
  status: {
    met:     { bar: '#2563EB', text: '#1E40AF', bg: '#DBEAFE' },
    absent:  { bar: '#9CA3AF', text: '#525252', bg: '#F5F5F5' },
    refused: { bar: '#404040', text: '#262626', bg: '#E5E5E5' },
    unknown: { bar: '#737373', text: '#404040', bg: '#F0F0F0' },
    moved:   { bar: '#A3A3A3', text: '#525252', bg: '#FAFAFA' },
  },
  tags: {
    young: { bg: '#0A0A0A', fg: '#FFFFFF' },
    star:  '#0A0A0A',
    starBg: '#F5F5F5',
  },
  org: {
    honbu: {
      higashiAsahikawa: '#7C3F58',
      toyooka:          '#7C5239',
      sokaAsahi:        '#3F7C44',
      toei:             '#3F6C7C',
    },
    districts: [
      '#5B7B9A', '#6E9078', '#A88860',
      '#867AA0', '#A07060', '#A08C5C',
      '#6E94A0', '#7B82A0', '#A07690',
    ],
  },
};

export const PALETTES: Palette[] = [PALETTE_EARTH, PALETTE_IOS, PALETTE_NEUTRAL];

// ─────────────────────────────────────────────
// 共通サンプルデータ
// ─────────────────────────────────────────────
export const SAMPLE_BREAKDOWN = {
  met_self: 32,
  met_family: 18,
  refused: 4,
  absent: 28,
  unknown: 6,
  moved: 4,
};

export const SAMPLE_MEMBERS = [
  {
    id: '1',
    name: '朝日 涼太',
    nameKana: 'あさひりょうた',
    age: 25,
    address: '旭川市豊岡5条7丁目1-10',
    honbu: '豊岡本部',
    bu: '豊岡中央支部',
    district: '歓喜地区',
    districtIdx: 6, // 歓喜地区 (orgs.districts[6])
    young: true,
    wantToVisit: true,
    lastVisit: null,
  },
  {
    id: '2',
    name: '伊藤 直樹',
    nameKana: 'いとうなおき',
    age: 27,
    address: '旭川市東光6条8丁目',
    honbu: '東旭川本部',
    bu: '東旭川部',
    district: '',
    districtIdx: -1, // 本部色
    young: true,
    wantToVisit: false,
    lastVisit: '2026-05-05',
    lastStatus: 'unknown',
  },
  {
    id: '3',
    name: '加藤 寿希也',
    nameKana: 'かとうじゅきや',
    age: 31,
    address: '旭川市豊岡14条6丁目',
    honbu: '豊岡本部',
    bu: '豊岡部',
    district: '英雄地区',
    districtIdx: 0,
    young: false,
    wantToVisit: false,
    lastVisit: '2026-04-21',
    lastStatus: 'met_family',
  },
] as const;
