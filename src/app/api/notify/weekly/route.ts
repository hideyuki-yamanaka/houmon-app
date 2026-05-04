// ──────────────────────────────────────────────────────────────
// POST /api/notify/weekly
//
// 週次の進捗サマリーを 全 subscriber に Push する。
// GitHub Actions の cron から呼ぶ前提。
//
// 認証: NOTIFY_CRON_SECRET ヘッダ X-Cron-Secret で検証
//   → 外部からの不正呼び出しを防ぐ
//
// ヒデさん指示 (2026-05-04):
//   - タイトル: 「家庭訪問アプリ」 (一律)
//   - 本文: 「{苗字}さんが今週 N 人 訪問しました。」 (created_by ごと)
//   - タップ: /visits/by-user/{userId}?range=week
//
// 各ユーザーは「自分自身の今週の活動」を 1 通受け取る。
// 訪問 0 人なら通知しない。
//
// 環境変数:
//   NOTIFY_CRON_SECRET             ← 必須 (cron 認証用)
//   SUPABASE_SERVICE_ROLE_KEY      ← 必須
//   VAPID_*                        ← 必須
// ──────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/server/supabaseAdmin';
import { sendPushTo, getSubscriptionsForUsers } from '../../../../lib/server/sendPush';

export async function POST(req: NextRequest) {
  // ── cron シークレット検証 ─────────────────────────
  const expected = process.env.NOTIFY_CRON_SECRET;
  const provided = req.headers.get('x-cron-secret');
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const admin = getSupabaseAdmin();

  // 直近 7 日 (今日を含む) の visits を取得
  const today = new Date();
  const jstOffsetMs = 9 * 60 * 60 * 1000;
  const todayJST = new Date(today.getTime() + jstOffsetMs);
  const sevenDaysAgo = new Date(todayJST.getTime() - 6 * 24 * 60 * 60 * 1000);
  const sinceISO = sevenDaysAgo.toISOString().slice(0, 10);
  const weekStart = sevenDaysAgo.toISOString().slice(0, 10); // tag 用

  const { data: visits, error: visitsErr } = await admin
    .from('visits')
    .select('created_by, member_id')
    .is('deleted_at', null)
    .gte('visited_at', sinceISO);
  if (visitsErr) {
    return NextResponse.json({ error: `visits 取得失敗: ${visitsErr.message}` }, { status: 500 });
  }

  // created_by ごとに unique member 数を集計
  // Map<created_by, Set<member_id>>
  const perUser = new Map<string, Set<string>>();
  for (const v of visits ?? []) {
    const uid = v.created_by as string | null;
    const mid = v.member_id as string | null;
    if (!uid || !mid) continue;
    if (!perUser.has(uid)) perUser.set(uid, new Set());
    perUser.get(uid)!.add(mid);
  }

  if (perUser.size === 0) {
    return NextResponse.json({ note: '今週の訪問なし', sent: 0 });
  }

  // 通知対象ユーザーの display_name を一括取得
  const userIds = Array.from(perUser.keys());
  const { data: profiles } = await admin
    .from('profiles')
    .select('user_id, display_name')
    .in('user_id', userIds);
  const nameMap = new Map<string, string>(
    (profiles ?? []).map(p => [p.user_id as string, p.display_name as string]),
  );

  // 各ユーザーに自分宛て通知を送る
  let totalSent = 0;
  let totalRemoved = 0;
  const errors: { userId: string; message: string }[] = [];

  for (const [userId, memberSet] of perUser) {
    const count = memberSet.size;
    if (count === 0) continue;

    const targets = await getSubscriptionsForUsers([userId]);
    if (targets.length === 0) continue;

    const userName = nameMap.get(userId) ?? 'あなた';
    const result = await sendPushTo(targets, {
      title: '家庭訪問アプリ',
      body: `${userName}さんが今週 ${count} 人 訪問しました。`,
      url: `/visits/by-user/${userId}?range=week`,
      tag: `weekly-${userId}-${weekStart}`,
    });
    totalSent += result.succeeded;
    totalRemoved += result.removed;
    if (result.errors.length > 0) {
      errors.push(...result.errors.map(e => ({ userId, message: `${e.status ?? '?'} ${e.message}` })));
    }
  }

  return NextResponse.json({
    usersProcessed: perUser.size,
    sent: totalSent,
    removed: totalRemoved,
    errors,
  });
}
