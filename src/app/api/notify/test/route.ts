// ──────────────────────────────────────────────────────────────
// POST /api/notify/test
//
// 自分の subscription に テスト Push を 1 通送る (動作確認用)。
// 設定画面の「テスト送信」ボタンから呼ぶ。
// ──────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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

  const userClient = makeUserScopedSupabase(accessToken);
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const targets = await getSubscriptionsForUsers([user.id]);
  if (targets.length === 0) {
    return NextResponse.json({ error: '通知購読が見つかりません。「通知を受け取る」を先に ON にしてください' }, { status: 404 });
  }

  const result = await sendPushTo(targets, {
    title: '🔔 テスト通知',
    body: '通知の動作確認です。これが見えていれば成功 ✅',
    url: '/',
    tag: 'test',
  });

  return NextResponse.json(result);
}
