// ──────────────────────────────────────────────────────────────
// POST /api/notify/visit-created
//
// 訪問ログが新規作成された後、同じチームの他のメンバーに
// 「○○さんが △△ さんの訪問を記録しました」と Web Push 通知を送る。
//
// 入力: { visitId: string }
//   - サーバー側で visit を取り、created_by = 自分か検証
//   - 同じチーム (= 自分が editor/owner として所属する team) の
//     他のメンバー (自分以外) の subscription に push
//
// 出力: { sent: number, removed: number }
//
// 認証: Bearer access_token (作成者本人だけ呼べる)
// ──────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '../../../../lib/server/supabaseAdmin';
import { sendPushTo, getSubscriptionsForUsers } from '../../../../lib/server/sendPush';

function makeUserScopedSupabase(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Supabase env が未設定');
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const accessToken = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!accessToken) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: { visitId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const visitId = body.visitId;
  if (!visitId) {
    return NextResponse.json({ error: 'visitId が必要です' }, { status: 400 });
  }

  // 認証ユーザー取得
  const userClient = makeUserScopedSupabase(accessToken);
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const callerId = user.id;

  // visit を取得 (member_id, user_id, created_by が必要)
  const admin = getSupabaseAdmin();
  const { data: visit, error: visitErr } = await admin
    .from('visits')
    .select('id, member_id, user_id, created_by')
    .eq('id', visitId)
    .maybeSingle();
  if (visitErr || !visit) {
    return NextResponse.json({ error: 'visit が見つかりません' }, { status: 404 });
  }

  // 作成者本人だけが叩ける (なりすまし通知防止)
  if (visit.created_by !== callerId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // メンバー名を取得 (通知本文用)
  const { data: member } = await admin
    .from('members')
    .select('name')
    .eq('id', visit.member_id)
    .maybeSingle();
  const memberName = member?.name ?? 'メンバー';

  // 作成者の表示名を profiles から取得
  const { data: profile } = await admin
    .from('profiles')
    .select('display_name')
    .eq('user_id', callerId)
    .maybeSingle();
  const callerName = profile?.display_name ?? 'チームの誰か';

  // 同じチームの「他の人」を集める:
  //   - visit.user_id (= データのオーナー) 本人
  //   - team_memberships で同じ owner_id の member_id 全員
  // から callerId を除外。
  const ownerId = visit.user_id;
  const teammateIds = new Set<string>();
  if (ownerId && ownerId !== callerId) teammateIds.add(ownerId);

  const { data: memberships } = await admin
    .from('team_memberships')
    .select('member_id')
    .eq('owner_id', ownerId);
  for (const m of memberships ?? []) {
    if (m.member_id && m.member_id !== callerId) teammateIds.add(m.member_id);
  }

  const targetUserIds = Array.from(teammateIds);
  if (targetUserIds.length === 0) {
    return NextResponse.json({ sent: 0, removed: 0, note: '通知先なし' });
  }

  const targets = await getSubscriptionsForUsers(targetUserIds);

  const result = await sendPushTo(targets, {
    title: `${callerName}さんが訪問記録`,
    body: `${memberName}さんの訪問ログを追加しました`,
    url: `/visits/${visitId}`,
    tag: `visit-${visitId}`,
  });

  return NextResponse.json({
    sent: result.succeeded,
    total: result.total,
    removed: result.removed,
  });
}
