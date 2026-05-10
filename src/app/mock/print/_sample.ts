// 印刷レイアウト比較 mock 用 のサンプル員データ。
// 5案で同じデータを使うことで、レイアウト差だけを比較できる。

import type { MemberWithVisitInfo, Visit } from '../../../lib/types';

export const SAMPLE_MEMBER: MemberWithVisitInfo = {
  id: 'sample-1',
  name: '朝日 涼太',
  nameKana: 'あさひりょうた',
  honbu: '豊岡本部',
  bu: '豊岡中央支部',
  district: '歓喜地区',
  category: 'young',
  age: 25,
  address: '旭川市豊岡5条7丁目1-10 サンライズマンション 305号室',
  birthday: '2001-03-14',
  enrollmentDate: '2018-04-02',
  role: '青年部 班長',
  workplace: '株式会社 北海エンジニアリング',
  family: '父・母・妹 (4人家族・実家)',
  phone: '0166-12-3456',
  mobile: '090-1234-5678',
  altarStatus: 'お形木御本尊',
  dailyPractice: '○',
  newspaper: 'マイ聖教',
  financialContribution: '○',
  activityStatus: '会合参加・実践あり',
  educationLevel: '大学卒',
  youthGroup: '青年部',
  info: `・(創健長?)の息子さん
・坂本さんの高校の同級生(ただし高校時代に喋ったことはない)
・大学卒業後 札幌のIT企業で2年働いたあと旭川へ帰郷
・趣味は読書 (主に SF)・釣り・キャンプ
・最近は仕事が忙しくて土日も出勤することがある
・月に一度は会合に顔を出してくれる`,
  visitCycleDays: 30,
  totalVisits: 4,
  isOverdue: false,
  lastVisitDate: '2026-05-05',
  lastVisitHour: 14,
  lastVisitStatus: 'met_self',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2026-05-05T05:00:00Z',
};

export const SAMPLE_VISITS: Visit[] = [
  {
    id: 'v1',
    memberId: 'sample-1',
    visitedAt: '2026-05-05',
    visitedHour: 14,
    status: 'met_self',
    respondents: ['father'],
    summary: 'ご本人と直接お話できた。仕事が忙しいが体調は良好とのこと。次回は来月の会合で会う約束。最近読んだ本の話で盛り上がった。',
    createdAt: '2026-05-05T05:00:00Z',
    updatedAt: '2026-05-05T05:00:00Z',
  },
  {
    id: 'v2',
    memberId: 'sample-1',
    visitedAt: '2026-04-08',
    visitedHour: 19,
    status: 'absent',
    respondents: [],
    summary: '不在。ポストに案内を投函しておいた。マンション 1階の駐車場には車があったので 留守ではなさそう。',
    createdAt: '2026-04-08T10:00:00Z',
    updatedAt: '2026-04-08T10:00:00Z',
  },
  {
    id: 'v3',
    memberId: 'sample-1',
    visitedAt: '2026-03-12',
    visitedHour: 18,
    status: 'met_family',
    respondents: ['mother'],
    summary: 'お母様が対応してくれた。本人は仕事で帰宅遅くなる時期とのこと。家族みなさんお元気そう。今度の家族の集まりに 招待していただいた。',
    createdAt: '2026-03-12T09:00:00Z',
    updatedAt: '2026-03-12T09:00:00Z',
  },
  {
    id: 'v4',
    memberId: 'sample-1',
    visitedAt: '2026-02-14',
    visitedHour: 14,
    status: 'met_self',
    respondents: [],
    summary: '本人と短時間お話。風邪気味で体調がイマイチとのことで、お見舞い。お薬を持参していたので、お渡しした。',
    createdAt: '2026-02-14T05:00:00Z',
    updatedAt: '2026-02-14T05:00:00Z',
  },
  {
    id: 'v5',
    memberId: 'sample-1',
    visitedAt: '2026-01-18',
    visitedHour: 11,
    status: 'absent',
    respondents: [],
    summary: '不在。',
    createdAt: '2026-01-18T03:00:00Z',
    updatedAt: '2026-01-18T03:00:00Z',
  },
];
