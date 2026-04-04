import type { Member, Visit, MemberWithVisitInfo, VisitStatus } from './types';

const now = new Date().toISOString();

export const MOCK_MEMBERS: Member[] = [
  {
    id: 'member-001', name: '渡辺 信行', district: '豊岡中央支部幸福地区',
    address: '旭川市豊岡4条5丁目', lat: 43.7665, lng: 142.4015,
    phone: '0166-31-XXXX', age: 72, role: '地区部長',
    altarStatus: 'お形木', dailyPractice: '○', newspaper: 'マイ聖教',
    financialContribution: '○', activityStatus: '会合参加', educationLevel: '青年1級',
    visitCycleDays: 30, createdAt: now, updatedAt: now,
  },
  {
    id: 'member-002', name: '鈴木 恵子', district: '豊岡部英雄地区',
    address: '旭川市豊岡6条3丁目', lat: 43.7690, lng: 142.3985,
    phone: '0166-32-XXXX', age: 65, role: '白ゆり長',
    altarStatus: 'お守り', dailyPractice: '○', newspaper: '家族購読',
    financialContribution: '○', activityStatus: '会える', educationLevel: '助師',
    visitCycleDays: 30, createdAt: now, updatedAt: now,
  },
  {
    id: 'member-003', name: '竹内 義男', district: '光陽部光陽地区',
    address: '旭川市豊岡3条7丁目', lat: 43.7635, lng: 142.4080,
    phone: '0166-33-XXXX', age: 80,
    altarStatus: '（不明）', activityStatus: '会えない',
    visitCycleDays: 30, createdAt: now, updatedAt: now,
  },
  {
    id: 'member-004', name: '高橋 美咲', district: '豊岡部香城地区',
    address: '旭川市豊岡5条2丁目', lat: 43.7678, lng: 142.3950,
    age: 45, role: '女性部員',
    altarStatus: 'お形木', dailyPractice: '○', newspaper: 'マイ聖教',
    financialContribution: '○', activityStatus: '対話実践', educationLevel: '青年3級',
    youthGroup: 'S期', visitCycleDays: 30, createdAt: now, updatedAt: now,
  },
  {
    id: 'member-005', name: '佐藤 一郎', district: '光陽部光輝地区',
    address: '旭川市豊岡7条4丁目', lat: 43.7710, lng: 142.4035,
    age: 58,
    altarStatus: 'お形木', dailyPractice: '○', newspaper: '未購読',
    activityStatus: '会える', visitCycleDays: 30, createdAt: now, updatedAt: now,
  },
  {
    id: 'member-006', name: '山田 花子', district: '豊岡部正義地区',
    address: '旭川市豊岡2条6丁目', lat: 43.7620, lng: 142.4060,
    age: 70, role: '副白ゆり長',
    altarStatus: 'お守り', dailyPractice: '○', newspaper: '家族購読',
    financialContribution: '○', activityStatus: '会合参加', educationLevel: '助師',
    visitCycleDays: 30, createdAt: now, updatedAt: now,
  },
  {
    id: 'member-007', name: '田中 正雄', district: '光陽部黄金地区',
    address: '旭川市豊岡8条1丁目', lat: 43.7730, lng: 142.3920,
    age: 62,
    visitCycleDays: 30, createdAt: now, updatedAt: now,
  },
  {
    id: 'member-008', name: '小林 美智子', district: '豊岡中央支部歓喜地区',
    address: '旭川市豊岡1条8丁目', lat: 43.7600, lng: 142.4100,
    age: 55, role: '地区女性部長',
    altarStatus: 'お形木', dailyPractice: '○', newspaper: 'マイ聖教',
    financialContribution: '○', activityStatus: '対話実践', educationLevel: '青年1級',
    visitCycleDays: 30, createdAt: now, updatedAt: now,
  },
  {
    id: 'member-009', name: '伊藤 健太', district: '豊岡中央支部ナポレオン地区',
    address: '旭川市豊岡9条5丁目', lat: 43.7745, lng: 142.4010,
    age: 38,
    altarStatus: 'お形木', dailyPractice: '○', activityStatus: '会える',
    visitCycleDays: 30, createdAt: now, updatedAt: now,
  },
  {
    id: 'member-010', name: '中村 洋子', district: '豊岡部英雄地区',
    address: '旭川市豊岡5条7丁目', lat: 43.7680, lng: 142.4085,
    age: 68,
    altarStatus: 'お形木', dailyPractice: '○', newspaper: 'マイ聖教',
    financialContribution: '○', activityStatus: '会合参加',
    visitCycleDays: 30, createdAt: now, updatedAt: now,
  },
];

export const MOCK_VISITS: Visit[] = [
  {
    id: 'visit-001', memberId: 'member-001', visitedAt: '2026-03-28', status: 'met',
    respondent: 'self', summary: '元気そうでした。来月の地区座談会について相談。',
    createdAt: now, updatedAt: now,
  },
  {
    id: 'visit-002', memberId: 'member-001', visitedAt: '2026-03-10', status: 'met',
    respondent: 'self', summary: '新聞の感想を聞けた。',
    createdAt: now, updatedAt: now,
  },
  {
    id: 'visit-003', memberId: 'member-001', visitedAt: '2026-02-15', status: 'absent',
    respondent: 'nobody', summary: 'お留守だった。お土産を玄関に置いてきた。',
    createdAt: now, updatedAt: now,
  },
  {
    id: 'visit-004', memberId: 'member-002', visitedAt: '2026-03-25', status: 'met',
    respondent: 'family', summary: '息子さんが対応。お元気とのこと。',
    createdAt: now, updatedAt: now,
  },
  {
    id: 'visit-005', memberId: 'member-004', visitedAt: '2026-04-02', status: 'met',
    respondent: 'self', summary: '対話実践の様子を聞けた。前向きな様子。',
    createdAt: now, updatedAt: now,
  },
  {
    id: 'visit-006', memberId: 'member-006', visitedAt: '2026-03-20', status: 'met',
    respondent: 'self',
    createdAt: now, updatedAt: now,
  },
  {
    id: 'visit-007', memberId: 'member-008', visitedAt: '2026-04-01', status: 'met',
    respondent: 'self', summary: '地区の活動状況について情報共有。',
    createdAt: now, updatedAt: now,
  },
  {
    id: 'visit-008', memberId: 'member-005', visitedAt: '2026-02-20', status: 'absent',
    respondent: 'nobody',
    createdAt: now, updatedAt: now,
  },
];

export function getMockMembersWithVisitInfo(): MemberWithVisitInfo[] {
  const now = new Date();
  const visitsByMember = new Map<string, { lastDate: string; lastStatus: string; count: number }>();

  for (const v of MOCK_VISITS) {
    const existing = visitsByMember.get(v.memberId);
    if (existing) {
      existing.count++;
      if (v.visitedAt > existing.lastDate) {
        existing.lastDate = v.visitedAt;
        existing.lastStatus = v.status;
      }
    } else {
      visitsByMember.set(v.memberId, { lastDate: v.visitedAt, lastStatus: v.status, count: 1 });
    }
  }

  return MOCK_MEMBERS.map((m) => {
    const info = visitsByMember.get(m.id);
    const daysSince = info
      ? Math.floor((now.getTime() - new Date(info.lastDate).getTime()) / (1000 * 60 * 60 * 24))
      : undefined;
    return {
      ...m,
      lastVisitDate: info?.lastDate,
      lastVisitStatus: info?.lastStatus as VisitStatus | undefined,
      totalVisits: info?.count ?? 0,
      isOverdue: daysSince === undefined ? true : daysSince > m.visitCycleDays,
      daysSinceLastVisit: daysSince,
    };
  });
}

export function getMockVisits(memberId: string): Visit[] {
  return MOCK_VISITS
    .filter(v => v.memberId === memberId)
    .sort((a, b) => b.visitedAt.localeCompare(a.visitedAt));
}
