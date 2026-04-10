import type { VisitStatus, Respondent, MemberCategory } from './types';

// ========================================
// 組織階層（2層構造）
// - 男子部: 部 → 地区（district は "豊岡部英雄地区" のように結合文字列）
// - ヤング: 本部 → 地区
//     豊岡本部のヤングは男子部の地区を共有（同じ district キーを使う）
//     東栄/旭創価/東旭川 本部はヤング名簿しかなく地区情報が無いため、
//     leaf 無しの本部のみ（chip では本部全員にしぼれるだけ）
//     地区が不明なヤングは district = 本部名 で格納し、備考(notes)に「仮」を入れる
// ========================================

export interface OrgLeaf {
  key: string;   // 男子部は district の値そのまま。ヤングは地区名（member.district と一致）
  short: string; // ピル表示用の短縮名
  hex: string;   // ピン・タグの基本色
}

export interface OrgParent {
  key: string;   // 部名 or 本部名
  short: string;
  hex: string;   // 親組織の代表色
  children: OrgLeaf[];
}

export interface OrgCategory {
  category: MemberCategory;
  label: string; // "男子部" / "ヤング"
  parents: OrgParent[];
}

// 男子部の地区を定数化（ヤング豊岡本部からも同じ地区を共有するため）
const GENERAL_TOYOOKA_LEAVES: OrgLeaf[] = [
  { key: '豊岡部香城地区', short: '香城', hex: '#059669' },
  { key: '豊岡部英雄地区', short: '英雄', hex: '#2563EB' },
  { key: '豊岡部正義地区', short: '正義', hex: '#D97706' },
];
const GENERAL_KOYO_LEAVES: OrgLeaf[] = [
  { key: '光陽部光陽地区', short: '光陽', hex: '#7C3AED' },
  { key: '光陽部光輝地区', short: '光輝', hex: '#DC2626' },
  { key: '光陽部黄金地区', short: '黄金', hex: '#CA8A04' },
];
const GENERAL_CHUO_LEAVES: OrgLeaf[] = [
  { key: '豊岡中央支部歓喜地区', short: '歓喜', hex: '#0891B2' },
  { key: '豊岡中央支部ナポレオン地区', short: 'ナポレオン', hex: '#4F46E5' },
  { key: '豊岡中央支部幸福地区', short: '幸福', hex: '#DB2777' },
];

// ──────────────────────────────────────────────────────────────
// 色設計メモ（ピン/フィルターで被らないように全部ユニーク）
// leaves(9): #059669 #2563EB #D97706 / #7C3AED #DC2626 #CA8A04 / #0891B2 #4F46E5 #DB2777
// general parents(3): #1E3A8A #4C1D95 #134E4A  ← leaves と被らない深色
// young parents(4):   #0D9488 #C2410C #65A30D #9F1239  ← ぜんぶ別系統
// ──────────────────────────────────────────────────────────────
export const ORG_HIERARCHY: OrgCategory[] = [
  {
    category: 'young',
    label: 'ヤング',
    parents: [
      // 東栄/旭創価/東旭川 本部はヤング名簿のみで地区情報なし → leaf 空
      { key: '東栄本部',   short: '東栄',   hex: '#0D9488', children: [] },
      // 豊岡本部のヤングは男子部の9地区を共有する
      {
        key: '豊岡本部', short: '豊岡', hex: '#C2410C',
        children: [
          ...GENERAL_TOYOOKA_LEAVES,
          ...GENERAL_KOYO_LEAVES,
          ...GENERAL_CHUO_LEAVES,
        ],
      },
      { key: '旭創価本部', short: '旭創価', hex: '#65A30D', children: [] },
      { key: '東旭川本部', short: '東旭川', hex: '#9F1239', children: [] },
    ],
  },
  {
    category: 'general',
    label: '男子部',
    parents: [
      { key: '豊岡部',       short: '豊岡部', hex: '#1E3A8A', children: GENERAL_TOYOOKA_LEAVES },
      { key: '光陽部',       short: '光陽部', hex: '#4C1D95', children: GENERAL_KOYO_LEAVES },
      { key: '豊岡中央支部', short: '中央',   hex: '#134E4A', children: GENERAL_CHUO_LEAVES },
    ],
  },
];

// ── キー→色のフラットマップ（旧 DISTRICT_COLORS 互換） ──
function buildDistrictColors(): Record<string, { hex: string; bg: string; text: string }> {
  const map: Record<string, { hex: string; bg: string; text: string }> = {};
  for (const cat of ORG_HIERARCHY) {
    for (const parent of cat.parents) {
      // 親組織キー（"豊岡部" など）自体も参照できるように
      map[parent.key] = { hex: parent.hex, bg: '', text: '' };
      for (const leaf of parent.children) {
        map[leaf.key] = { hex: leaf.hex, bg: '', text: '' };
      }
    }
  }
  return map;
}

export const DISTRICT_COLORS: Record<string, { hex: string; bg: string; text: string }> = buildDistrictColors();

// ── ユーティリティ ──

/** member の所属する本部/部（parentKey）を返す */
export function getParentOrgKey(member: { district: string; category?: MemberCategory; honbu?: string }): string | null {
  if (member.category === 'young') return member.honbu ?? null;
  // 男子部は district 文字列から部を推測
  for (const cat of ORG_HIERARCHY) {
    if (cat.category !== 'general') continue;
    for (const parent of cat.parents) {
      if (member.district.startsWith(parent.key)) return parent.key;
    }
  }
  return null;
}

/** 親キー（部 or 本部）から OrgParent を検索 */
export function findParentOrg(parentKey: string): OrgParent | null {
  for (const cat of ORG_HIERARCHY) {
    const p = cat.parents.find(p => p.key === parentKey);
    if (p) return p;
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

/** district の key（leaf）から OrgLeaf を検索 */
export function findOrgLeaf(districtKey: string): OrgLeaf | null {
  for (const cat of ORG_HIERARCHY) {
    for (const parent of cat.parents) {
      const leaf = parent.children.find(c => c.key === districtKey);
      if (leaf) return leaf;
    }
  }
  return null;
}

/** ヤング本部一覧（後方互換用） */
export const YOUNG_HONBU_KEYS = ORG_HIERARCHY
  .find(c => c.category === 'young')!
  .parents.map(p => p.key);

// ── 訪問カテゴリ ──
export const VISIT_STATUS_CONFIG: Record<VisitStatus, { label: string; color: string; bg: string }> = {
  met:             { label: '会えた',     color: 'text-green-700',  bg: 'bg-green-100' },
  absent:          { label: '不在',       color: 'text-gray-700',   bg: 'bg-gray-100' },
  refused:         { label: '拒否',       color: 'text-red-700',    bg: 'bg-red-100' },
  unknown_address: { label: '住所不明',   color: 'text-amber-700',  bg: 'bg-amber-100' },
  moved:           { label: '転居',       color: 'text-purple-700', bg: 'bg-purple-100' },
};

// ── 対応者 ──
export const RESPONDENT_CONFIG: Record<Respondent, { label: string }> = {
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
