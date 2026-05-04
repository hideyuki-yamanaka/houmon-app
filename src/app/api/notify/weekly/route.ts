// ──────────────────────────────────────────────────────────────
// POST /api/notify/weekly
//
// 週次の進捗サマリーを 全 subscriber に Push する。
// GitHub Actions の cron から呼ぶ前提。
//
// 認証: NOTIFY_CRON_SECRET ヘッダ X-Cron-Secret で検証
//   → 外部からの不正呼び出しを防ぐ
//
// 各ユーザーに 「今週は N 件訪問した (会えた M 件 / 不在 K 件)」 を送る。
// 「自分のチームの owner_id 配下の visits」を直近 7 日で集計。
//
// 環境変数:
//   NOTIFY_CRON_SECRET             ← 必須 (cron 認証用)
//   SUPABASE_SERVICE_ROLE_KEY      ← 必須
//   VAPID_*                        ← 必須
// ──────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/server/supabaseAdmin';
import { sendPushTo, getSubscriptionsForUsers } from '../../../../lib/server/sendPush';

interface UserSummary {
  userId: string;
  total: number;
  metSelfFamily: number;
  absent: number;
  refused: number;
}

export async function POST(req: NextRequest) {
  // ── cron シークレット検証 ─────────────────────────
  const expected = process.env.NOTIFY_CRON_SECRET;
  const provided = req.headers.get('x-cron-secret');
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const admin = getSupabaseAdmin();

  // 直近 7 日の visits を取得
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const sinceISO = oneWeekAgo.toISOString().slice(0, 10); // YYYY-MM-DD

  const { data: visits, error: visitsErr } = await admin
    .from('visits')
    .select('user_id, status, visited_at')
    .is('deleted_at', null)
    .gte('visited_at', sinceISO);
  if (visitsErr) {
    return NextResponse.json({ error: `visits 取得失敗: ${visitsErr.message}` }, { status: 500 });
  }

  // owner_id (= データの所有者) ごとに集計
  // ※ team_memberships を辿って 招待された人にも同じサマリーを送る
  const ownerSummary = new Map<string, UserSummary>();
  for (const v of visits ?? []) {
    const oid = v.user_id as string | null;
    if (!oid) continue;
    const cur = ownerSummary.get(oid) ?? { userId: oid, total: 0, metSelfFamily: 0, absent: 0, refused: 0 };
    cur.total++;
    if (v.status === 'met_self' || v.status === 'met_family') cur.metSelfFamily++;
    else if (v.status === 'absent') cur.absent++;
    else if (v.status === 'refused') cur.refused++;
    ownerSummary.set(oid, cur);
  }

  // 各 owner のチームメンバー (owner 本人 + 招待された人) を集める
  const { data: memberships } = await admin
    .from('team_memberships')
    .select('owner_id, member_id');
  const teamMembers = new Map<string, Set<string>>(); // owner_id → Set<user_id>
  for (const [oid] of ownerSummary) {
    teamMembers.set(oid, new Set([oid]));
  }
  for (const m of memberships ?? []) {
    if (!m.owner_id || !m.member_id) continue;
    const set = teamMembers.get(m.owner_id);
    if (set) set.add(m.member_id);
  }

  // 各 user_id に送信内容を組み立て
  let totalSent = 0;
  let totalRemoved = 0;
  const errors: { userId: string; message: string }[] = [];

  for (const [ownerId, summary] of ownerSummary) {
    const members = teamMembers.get(ownerId) ?? new Set<string>([ownerId]);
    const userIds = Array.from(members);
    const targets = await getSubscriptionsForUsers(userIds);
    if (targets.length === 0) continue;

    const body = `今週は ${summary.total} 件訪問しました (本人/家族に会えた ${summary.metSelfFamily} 件、不在 ${summary.absent} 件)`;
    const result = await sendPushTo(targets, {
      title: '📊 今週の活動サマリー',
      body,
      url: '/log',
      tag: `weekly-${new Date().toISOString().slice(0, 10)}`,
    });
    totalSent += result.succeeded;
    totalRemoved += result.removed;
    if (result.errors.length > 0) {
      errors.push(...result.errors.map(e => ({ userId: ownerId, message: `${e.status ?? '?'} ${e.message}` })));
    }
  }

  return NextResponse.json({
    teamsProcessed: ownerSummary.size,
    sent: totalSent,
    removed: totalRemoved,
    errors,
  });
}
