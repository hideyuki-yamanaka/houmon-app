// ──────────────────────────────────────────────────────────────
// POST /api/invite/send
//
// クライアント (sharing.ts の sendInviteByEmail) から呼ばれる Route Handler。
//
// 処理:
//   1. Authorization ヘッダ (Bearer <access_token>) からユーザー認証
//      → access_token は client が supabase.auth.getSession() で取得して送る
//   2. 認証 OK なら invite_tokens に owner_id=auth.uid() で INSERT
//      → token は DB の DEFAULT gen_random_uuid() で自動採番
//   3. Resend で 招待メール HTML を送信
//   4. 200 { token } を返す。失敗時は 4xx { error }
//
// 環境変数:
//   RESEND_API_KEY                 ← 必須
//   INVITE_FROM_EMAIL              ← 任意 (デフォ 'onboarding@resend.dev')
//   NEXT_PUBLIC_SUPABASE_URL       ← 既存
//   NEXT_PUBLIC_SUPABASE_ANON_KEY  ← 既存
//   INVITE_BASE_URL                ← 任意 (本番 URL を指定。未指定なら request の origin)
// ──────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { generateInviteEmail } from '../../../../lib/emails/invite-email';
import type { TeamRole } from '../../../../lib/types';

// Supabase に直接 INSERT するときの 「ログイン中ユーザーで動く」 client を都度作る。
// (Vercel Edge / Node どちらでも動くように Cookie じゃなく Bearer 方式)
function makeUserScopedSupabase(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error('Supabase env が未設定');
  }
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(req: NextRequest) {
  // ── 1. body パース ───────────────────────────────────────────
  let body: { email?: unknown; role?: unknown };
  try {
    body = (await req.json()) as { email?: unknown; role?: unknown };
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const role = body.role === 'editor' || body.role === 'viewer' ? (body.role as TeamRole) : null;
  if (!email || !role) {
    return NextResponse.json({ error: 'email / role が必要や' }, { status: 400 });
  }
  // 雑な email 妥当性チェック (server 側でも軽く)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'メールアドレスが正しくないで' }, { status: 400 });
  }

  // ── 2. Authorization ヘッダから access token 取得 ─────────────
  const auth = req.headers.get('authorization') ?? '';
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  if (!m) {
    return NextResponse.json({ error: 'ログインしてへんで' }, { status: 401 });
  }
  const accessToken = m[1];

  let userClient: ReturnType<typeof makeUserScopedSupabase>;
  try {
    userClient = makeUserScopedSupabase(accessToken);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'server config error' },
      { status: 500 },
    );
  }

  // 認証チェック
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes.user) {
    return NextResponse.json({ error: 'ログイン情報が無効や' }, { status: 401 });
  }
  const ownerId = userRes.user.id;

  // ── 3. invite_tokens に INSERT (token は DEFAULT で生成) ─────
  const { data: tokenRow, error: insertErr } = await userClient
    .from('invite_tokens')
    .insert({ owner_id: ownerId, role })
    .select('token')
    .single();
  if (insertErr || !tokenRow?.token) {
    return NextResponse.json(
      { error: insertErr?.message ?? 'token 発行に失敗' },
      { status: 500 },
    );
  }
  const token = tokenRow.token as string;

  // ── 4. Resend で メール送信 ───────────────────────────────────
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    // RLS では invite は出来てる。メール送信だけ失敗扱いで返す。
    return NextResponse.json(
      { error: 'RESEND_API_KEY 未設定。Vercel に登録してな', token },
      { status: 500 },
    );
  }

  const fromEmail = process.env.INVITE_FROM_EMAIL ?? 'onboarding@resend.dev';
  const baseUrl =
    process.env.INVITE_BASE_URL ?? new URL(req.url).origin;
  const inviteUrl = `${baseUrl.replace(/\/$/, '')}/invite/${token}`;
  const html = generateInviteEmail({ inviteUrl, role });

  const resend = new Resend(resendApiKey);
  const sendRes = await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: '家庭訪問アプリ にご招待',
    html,
  });

  if (sendRes.error) {
    // メール送信失敗。トークンは発行済みなので、UI 側でリンクコピーには使える。
    return NextResponse.json(
      { error: sendRes.error.message ?? 'メール送信に失敗', token },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, token }, { status: 200 });
}
