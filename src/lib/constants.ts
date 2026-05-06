import type { VisitStatus, Respondent, MemberCategory } from './types';

// ========================================
// 組織階層（3階層構造: 本部 → 部 → 地区）
//   2026-05-05 phase C で 3 階層化。member は (honbu, bu, district) を独立に持つ。
//   category(young/general) は組織階層と直交する別軸。
//
//   ・東旭川/旭創価/東栄 本部は地区情報がまだ無い → districts は空配列
//     (該当 bu を選ぶと bu レベルで全員ヒット)
//   ・豊岡本部だけ統監名簿があり、3 部 × 3 地区 = 9 地区が確定
//
//   旧 ORG_HIERARCHY (2 階層 + category 軸) は ORG_TREE に置き換え。
//   getParentOrgKey/findParentOrg などのユーティリティは新ツリーから組み直し。
// ========================================

export interface OrgDistrictNode {
  key: string;   // district 名 (例「英雄地区」) と完全一致
  short: string; // チップ短縮名
  hex: string;   // ピン/チップ色
}

export interface OrgBuNode {
  key: string;   // bu 名 (例「豊岡部」)
  short: string;
  hex: string;
  districts: OrgDistrictNode[]; // district が無い bu は空配列
}

export interface OrgHonbuNode {
  key: string;   // honbu 名 (例「豊岡本部」)
  short: string;
  hex: string;
  bus: OrgBuNode[];
}

export const ORG_TREE: OrgHonbuNode[] = [
  {
    key: '東旭川本部', short: '東旭川', hex: '#9F1239',
    bus: [
      { key: '東旭川部', short: '東旭川', hex: '#9F1239', districts: [] },
      { key: '千代田部', short: '千代田', hex: '#7F1D1D', districts: [] },
    ],
  },
  {
    key: '豊岡本部', short: '豊岡', hex: '#C2410C',
    bus: [
      // 2026-05-06 ヒデさん指示で 地区別カラーを「どきつくない・直感的に識別できる」9 色に再提案。
      // 設計方針:
      //   - HSL: 明度 ~58%, 彩度 ~50% で揃える (Tailwind 600 級の重さを避ける)
      //   - 色相 (Hue) を 360°÷9 で均等配置 → 隣接地区も視認で混同しない
      //   - 飽和を抑えて Apple/Pages 系の落ち着いたパレットに
      {
        key: '豊岡部', short: '豊岡部', hex: '#1E3A8A',
        districts: [
          { key: '英雄地区', short: '英雄', hex: '#5B8FD9' }, // soft cornflower blue
          { key: '香城地区', short: '香城', hex: '#5FAE82' }, // soft jade green
          { key: '正義地区', short: '正義', hex: '#E59D5A' }, // warm peach
        ],
      },
      {
        key: '光陽部', short: '光陽部', hex: '#4C1D95',
        districts: [
          { key: '光陽地区', short: '光陽', hex: '#9B7FCC' }, // soft lavender
          { key: '光輝地区', short: '光輝', hex: '#D17363' }, // soft terracotta
          { key: '黄金地区', short: '黄金', hex: '#D4A85A' }, // soft mustard gold
        ],
      },
      {
        key: '豊岡中央支部', short: '中央', hex: '#134E4A',
        districts: [
          { key: '歓喜地区',     short: '歓喜',     hex: '#5BA8B8' }, // soft teal
          { key: 'ナポレオン地区', short: 'ナポレオン', hex: '#7984CC' }, // soft periwinkle
          { key: '幸福地区',     short: '幸福',     hex: '#D67BA0' }, // soft rose
        ],
      },
    ],
  },
  {
    key: '旭創価本部', short: '旭創価', hex: '#65A30D',
    bus: [
      { key: '東川部', short: '東川', hex: '#65A30D', districts: [] },
      { key: '空港部', short: '空港', hex: '#4D7C0F', districts: [] },
    ],
  },
  {
    key: '東栄本部', short: '東栄', hex: '#0D9488',
    bus: [
      { key: '東栄部', short: '東栄', hex: '#0D9488', districts: [] },
      { key: '緑東部', short: '緑東', hex: '#0F766E', districts: [] },
    ],
  },
];

// ── 旧 OrgLeaf/OrgParent 互換 (削除予定の callers 用) ──
// 既存コード (MapView, MemberCard など) が findOrgLeaf/getParentOrgKey 経由で
// 色を引いてるので、新ツリーから OrgLeaf/OrgParent 形式の配列も派生させておく。
export interface OrgLeaf { key: string; leafName: string; short: string; hex: string; }
export interface OrgParent { key: string; short: string; hex: string; children: OrgLeaf[]; }

function flatBus(): OrgParent[] {
  const out: OrgParent[] = [];
  for (const honbu of ORG_TREE) {
    for (const bu of honbu.bus) {
      out.push({
        key: bu.key, short: bu.short, hex: bu.hex,
        children: bu.districts.map(d => ({ key: d.key, leafName: d.key, short: d.short, hex: d.hex })),
      });
    }
  }
  return out;
}
const ALL_BUS: OrgParent[] = flatBus();

// ── キー→色のフラットマップ ──
function buildDistrictColors(): Record<string, { hex: string; bg: string; text: string }> {
  const map: Record<string, { hex: string; bg: string; text: string }> = {};
  for (const honbu of ORG_TREE) {
    map[honbu.key] = { hex: honbu.hex, bg: '', text: '' };
    for (const bu of honbu.bus) {
      map[bu.key] = { hex: bu.hex, bg: '', text: '' };
      for (const d of bu.districts) {
        map[d.key] = { hex: d.hex, bg: '', text: '' };
        // 旧連結キー (例「豊岡部英雄地区」) も登録 (古い district 値の互換)
        map[bu.key + d.key] = { hex: d.hex, bg: '', text: '' };
      }
    }
  }
  return map;
}

export const DISTRICT_COLORS: Record<string, { hex: string; bg: string; text: string }> = buildDistrictColors();

// ── ユーティリティ ──

/** member の所属する 部 or 本部 を返す (色決定/バッジ用)。
 *  bu があれば bu、無ければ honbu。両方無ければ null。 */
export function getParentOrgKey(member: { district?: string; category?: MemberCategory; honbu?: string; bu?: string }): string | null {
  if (member.bu && member.bu.trim()) return member.bu.trim();
  if (member.honbu && member.honbu.trim()) return member.honbu.trim();
  // 旧データ (district に部が前置されてる) のフォールバック
  if (member.district) {
    for (const bu of ALL_BUS) {
      if (member.district.startsWith(bu.key)) return bu.key;
    }
  }
  return null;
}

/** 親キー (部 or 本部) から OrgParent 互換オブジェクトを検索 */
export function findParentOrg(parentKey: string): OrgParent | null {
  // bu レベルで検索
  const bu = ALL_BUS.find(p => p.key === parentKey);
  if (bu) return bu;
  // honbu レベルで検索 (children には その honbu 配下の全 district を入れる)
  const honbu = ORG_TREE.find(h => h.key === parentKey);
  if (honbu) {
    return {
      key: honbu.key, short: honbu.short, hex: honbu.hex,
      children: honbu.bus.flatMap(b => b.districts.map(d => ({
        key: d.key, leafName: d.key, short: d.short, hex: d.hex,
      }))),
    };
  }
  return null;
}

// ── マップピン色 ──
// MapView と MemberCard の両方で使う共通ロジック。
// 「未訪問 = 白地 + 組織色ストローク + 組織色ドット」
// 「訪問済み = 組織色塗り + 白ドット」というルールはどちらも同じなので、
// 色の決定はここに集約してる。
export const MEMBER_PIN_FALLBACK_COLOR = '#9AA0A6';

export function getMemberOrgColor(member: {
  district: string;
  category?: MemberCategory;
  honbu?: string;
}): string {
  const leaf = findOrgLeaf(member.district);
  if (leaf) return leaf.hex;
  const parentKey = getParentOrgKey(member);
  if (parentKey) {
    const parent = findParentOrg(parentKey);
    if (parent) return parent.hex;
  }
  return MEMBER_PIN_FALLBACK_COLOR;
}

/** district の key (例「英雄地区」) から OrgLeaf 互換を検索。
 *  旧連結キー (例「豊岡部英雄地区」) も後方互換でマッチ。 */
export function findOrgLeaf(districtKey: string): OrgLeaf | null {
  for (const honbu of ORG_TREE) {
    for (const bu of honbu.bus) {
      const d = bu.districts.find(x => x.key === districtKey || (bu.key + x.key) === districtKey);
      if (d) return { key: d.key, leafName: d.key, short: d.short, hex: d.hex };
    }
  }
  return null;
}

/** 本部一覧 (4 本部) */
export const YOUNG_HONBU_KEYS = ORG_TREE.map(h => h.key);

// ── 訪問カテゴリ ──
// 2026-04-26: 旧 met を met_self/met_family に分割 → 同 26 日にカラーシステムを
// アウトライン型(白背景+色枠+色文字+色ドット)に再構築。視認性を優先し、
// 「本人に会えた」「家族に会えた」は同じ緑で統一する(ヒデさん指示)。
//
// 各値は hex で持つ:
//   border : チップの枠線色
//   text   : チップの文字色
//   dot    : チップ左の小ドット & マップピン色 等で再利用
export const VISIT_STATUS_CONFIG: Record<VisitStatus, {
  label: string;
  border: string;
  text: string;
  dot: string;
}> = {
  met_self:        { label: '本人に会えた', border: '#10B981', text: '#047857', dot: '#10B981' },
  met_family:      { label: '家族に会えた', border: '#10B981', text: '#047857', dot: '#10B981' },
  absent:          { label: '不在',         border: '#9CA3AF', text: '#4B5563', dot: '#6B7280' },
  refused:         { label: '拒否',         border: '#EF4444', text: '#B91C1C', dot: '#EF4444' },
  unknown_address: { label: '住所不明',     border: '#F59E0B', text: '#B45309', dot: '#F59E0B' },
  moved:           { label: '転居',         border: '#8B5CF6', text: '#6D28D9', dot: '#8B5CF6' },
};

// ── 対応者 ──
export const RESPONDENT_CONFIG: Record<Respondent, { label: string }> = {
  father:  { label: '父' },
  mother:  { label: '母' },
  wife:    { label: '妻' },
  son:     { label: '息子' },
  sibling: { label: '兄弟' },
};

// ── ○×△ ステータスグリッド項目 ──
export type StatusLevel = 'good' | 'mid' | 'bad' | 'unknown';

export interface StatusGridItem {
  key: string;
  label: string;
  evaluate: (member: Record<string, string | null | undefined>) => StatusLevel;
}

export const STATUS_GRID_ITEMS: StatusGridItem[] = [
  {
    key: 'altarStatus',
    label: '御安置',
    evaluate: (m) => {
      const v = m.altar_status ?? m.altarStatus;
      if (!v || v === '（不明）') return 'unknown';
      if (v.includes('お形木')) return 'good';
      if (v.includes('お守り')) return 'mid';
      return 'bad';
    },
  },
  {
    key: 'dailyPractice',
    label: '勤行',
    evaluate: (m) => {
      const v = m.daily_practice ?? m.dailyPractice;
      if (v === '○') return 'good';
      return v ? 'bad' : 'unknown';
    },
  },
  {
    key: 'newspaper',
    label: '聖教',
    evaluate: (m) => {
      const v = m.newspaper;
      if (!v) return 'unknown';
      if (v.includes('マイ') || v.includes('家族')) return 'good';
      if (v.includes('未')) return 'bad';
      return 'unknown';
    },
  },
  {
    key: 'financialContribution',
    label: '広布',
    evaluate: (m) => {
      const v = m.financial_contribution ?? m.financialContribution;
      if (v === '○') return 'good';
      if (v === '未') return 'bad';
      return 'unknown';
    },
  },
  {
    key: 'activityStatus',
    label: '活動',
    evaluate: (m) => {
      const v = m.activity_status ?? m.activityStatus;
      if (!v) return 'unknown';
      if (v.includes('参加') || v.includes('実践')) return 'good';
      if (v.includes('会える')) return 'mid';
      return 'bad';
    },
  },
  {
    key: 'educationLevel',
    label: '教学',
    evaluate: (m) => {
      const v = m.education_level ?? m.educationLevel;
      if (!v || v === '未教学') return v === '未教学' ? 'bad' : 'unknown';
      if (v.includes('1級')) return 'good';
      return 'mid';
    },
  },
  {
    key: 'youthGroup',
    label: '創牙',
    evaluate: (m) => {
      const v = m.youth_group ?? m.youthGroup;
      if (!v) return 'unknown';
      return 'good';
    },
  },
];

export const STATUS_LEVEL_DISPLAY: Record<StatusLevel, { symbol: string; color: string }> = {
  good:    { symbol: '○', color: 'text-green-600' },
  mid:     { symbol: '△', color: 'text-amber-500' },
  bad:     { symbol: '×', color: 'text-red-500' },
  unknown: { symbol: '−', color: 'text-gray-400' },
};

// ── マップ初期位置（旭川市豊岡エリア） ──
export const MAP_DEFAULT_CENTER: [number, number] = [43.764, 142.404];
export const MAP_DEFAULT_ZOOM = 15;
