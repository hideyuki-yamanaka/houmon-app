import type { VisitStatus, Respondent } from './types';

// ── 地区カラー（9地区） ──
export const DISTRICT_COLORS: Record<string, { hex: string; bg: string; text: string }> = {
  '豊岡部英雄地区':         { hex: '#2563EB', bg: 'bg-blue-600',    text: 'text-blue-600' },
  '豊岡部香城地区':         { hex: '#059669', bg: 'bg-emerald-600', text: 'text-emerald-600' },
  '豊岡部正義地区':         { hex: '#D97706', bg: 'bg-amber-600',   text: 'text-amber-600' },
  '光陽部光陽地区':         { hex: '#7C3AED', bg: 'bg-violet-600',  text: 'text-violet-600' },
  '光陽部光輝地区':         { hex: '#DC2626', bg: 'bg-red-600',     text: 'text-red-600' },
  '光陽部黄金地区':         { hex: '#CA8A04', bg: 'bg-yellow-600',  text: 'text-yellow-600' },
  '豊岡中央支部歓喜地区':   { hex: '#0891B2', bg: 'bg-cyan-600',    text: 'text-cyan-600' },
  '豊岡中央支部ナポレオン地区': { hex: '#4F46E5', bg: 'bg-indigo-600', text: 'text-indigo-600' },
  '豊岡中央支部幸福地区':   { hex: '#DB2777', bg: 'bg-pink-600',    text: 'text-pink-600' },
};

// ── 訪問カテゴリ ──
export const VISIT_STATUS_CONFIG: Record<VisitStatus, { label: string; color: string; bg: string }> = {
  met:             { label: '会えた',     color: 'text-green-700',  bg: 'bg-green-100' },
  absent:          { label: '不在',       color: 'text-gray-700',   bg: 'bg-gray-100' },
  refused:         { label: '拒否',       color: 'text-red-700',    bg: 'bg-red-100' },
  unknown_address: { label: '住所不明',   color: 'text-amber-700',  bg: 'bg-amber-100' },
};

// ── 対応者 ──
export const RESPONDENT_CONFIG: Record<Respondent, { label: string }> = {
  self:   { label: '本人' },
  family: { label: '家族' },
  other:  { label: '他の人' },
  nobody: { label: '留守' },
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
export const MAP_DEFAULT_ZOOM = 14;
