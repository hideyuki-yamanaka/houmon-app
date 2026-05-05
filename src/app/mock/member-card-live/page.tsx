'use client';

// ──────────────────────────────────────────────────────────────
// 実 MemberCard を使った live プレビューページ
//   - 認証不要 (/mock 配下)
//   - DesignTuner で値を動かすと即反映 (CSS 変数経由)
//   - 訪問ログ有り / 無し / 長文住所 / 未訪問 を網羅したサンプル
// ──────────────────────────────────────────────────────────────

import Link from 'next/link';
import MemberCard from '../../../components/MemberCard';
import type { MemberWithVisitInfo, Visit } from '../../../lib/types';

const baseDate = '2026-05-05T00:00:00Z';

const members: MemberWithVisitInfo[] = [
  {
    id: 'm1', name: '朝日 涼太', nameKana: 'あさひりょうた',
    honbu: '豊岡本部', bu: '豊岡中央支部', district: '歓喜地区',
    category: 'young', age: 25, address: '旭川市豊岡5条7丁目1-10',
    visitCycleDays: 30, totalVisits: 0, isOverdue: false,
    createdAt: baseDate, updatedAt: baseDate,
  },
  {
    id: 'm2', name: '伊藤 直樹', nameKana: 'いとうなおき',
    honbu: '東旭川本部', bu: '', district: '',
    category: 'young', age: 27, address: '旭川市東光6条8丁目',
    visitCycleDays: 30, totalVisits: 1, isOverdue: false,
    lastVisitDate: '2026-05-05', lastVisitHour: 14, lastVisitStatus: 'unknown_address',
    createdAt: baseDate, updatedAt: baseDate,
  },
  {
    id: 'm3', name: '加藤 寿希也', nameKana: 'かとうじゅきや',
    honbu: '豊岡本部', bu: '豊岡部', district: '香城地区',
    category: 'young', age: 26, address: '旭川市豊岡14条6丁目',
    visitCycleDays: 30, totalVisits: 0, isOverdue: false,
    createdAt: baseDate, updatedAt: baseDate,
  },
  {
    id: 'm4', name: '我部山 翼', nameKana: 'かべやまつばさ',
    honbu: '旭創価本部', bu: '東川部', district: '',
    category: 'young', age: 27, address: '東川町西町9丁目',
    visitCycleDays: 30, totalVisits: 0, isOverdue: false,
    createdAt: baseDate, updatedAt: baseDate,
  },
  {
    id: 'm5', name: '三浦 史也', nameKana: 'みうらふみや',
    honbu: '豊岡本部', bu: '豊岡部', district: '英雄地区',
    category: 'general', age: 31,
    address: '旭川市豊岡14条5丁目タウンズ9001-102',
    visitCycleDays: 30, totalVisits: 3, isOverdue: false,
    lastVisitDate: '2026-04-25', lastVisitHour: 15, lastVisitStatus: 'met_self',
    createdAt: baseDate, updatedAt: baseDate,
  },
  {
    id: 'm6', name: '塚本 拓実', nameKana: 'つかもとたくみ',
    honbu: '豊岡本部', bu: '光陽部', district: '光輝地区',
    category: 'general', age: 29,
    address: '旭川市豊岡2条4丁目3-8第5豊岡マンション2F3号',
    visitCycleDays: 30, totalVisits: 2, isOverdue: false,
    lastVisitDate: '2026-04-28', lastVisitHour: 11, lastVisitStatus: 'absent',
    createdAt: baseDate, updatedAt: baseDate,
  },
];

// 訪問ログのサンプル (m2/m5/m6 だけログ持ち)
const visitsByMember: Record<string, Visit[]> = {
  m2: [{
    id: 'v1', memberId: 'm2', visitedAt: '2026-05-05', visitedHour: 14,
    status: 'unknown_address', summary: '町目以降が不明です。',
    createdAt: baseDate, updatedAt: baseDate,
  }],
  m5: [
    {
      id: 'v2', memberId: 'm5', visitedAt: '2026-04-25', visitedHour: 15,
      status: 'met_self', summary: 'お元気そうでした。次回は教学について少し話したいです。',
      createdAt: baseDate, updatedAt: baseDate,
    },
    {
      id: 'v3', memberId: 'm5', visitedAt: '2026-04-10', visitedHour: 11,
      status: 'met_family', summary: '奥様が出てきてくれました。',
      createdAt: baseDate, updatedAt: baseDate,
    },
    {
      id: 'v4', memberId: 'm5', visitedAt: '2026-03-20', visitedHour: 14,
      status: 'absent',
      createdAt: baseDate, updatedAt: baseDate,
    },
  ],
  m6: [
    {
      id: 'v5', memberId: 'm6', visitedAt: '2026-04-28', visitedHour: 11,
      status: 'absent', summary: 'インターホン応答なし。',
      createdAt: baseDate, updatedAt: baseDate,
    },
    {
      id: 'v6', memberId: 'm6', visitedAt: '2026-04-03', visitedHour: 13,
      status: 'met_self',
      createdAt: baseDate, updatedAt: baseDate,
    },
  ],
};

export default function MockMemberCardLivePage() {
  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-20">
      <div className="max-w-[420px] mx-auto px-3 py-4">
        <div className="mb-3">
          <h1 className="text-xl font-bold mb-1">MemberCard live プレビュー</h1>
          <p className="text-[12px] text-[var(--color-subtext)]">
            実 MemberCard を使った live ビュー。右下の歯車から DesignTuner を開き、
            「メンバーカード」グループを動かすと即反映。
          </p>
          <Link href="/" className="text-[12px] text-[var(--color-primary)] underline mt-2 inline-block">← ホームへ戻る</Link>
        </div>

        <h2 className="text-[13px] font-bold mb-1 mt-4">未訪問</h2>
        <div className="space-y-1 mb-4">
          {members.filter(m => m.totalVisits === 0).map(m => (
            <MemberCard key={m.id} member={m} />
          ))}
        </div>

        <h2 className="text-[13px] font-bold mb-1 mt-4">訪問ログ付き (1件)</h2>
        <div className="space-y-1 mb-4">
          {members.filter(m => m.id === 'm2').map(m => (
            <MemberCard key={m.id} member={m} withLogs visits={visitsByMember[m.id] ?? []} />
          ))}
        </div>

        <h2 className="text-[13px] font-bold mb-1 mt-4">訪問ログ付き (複数件)</h2>
        <div className="space-y-1">
          {members.filter(m => m.totalVisits > 0 && m.id !== 'm2').map(m => (
            <MemberCard key={m.id} member={m} withLogs visits={visitsByMember[m.id] ?? []} />
          ))}
        </div>
      </div>
    </div>
  );
}
