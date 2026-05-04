// ──────────────────────────────────────────────────────────────
// sendPush — Web Push 配信ユーティリティ
//
// 1. VAPID 鍵を初期化
// 2. push_subscriptions の指定行に notification を送信
// 3. 失敗 (410 Gone 等) した subscription は DB から削除して掃除
//
// 環境変数:
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY  ← 必須
//   VAPID_PRIVATE_KEY              ← 必須 (server-side only)
//   VAPID_SUBJECT                  ← 必須 (mailto: 連絡先)
//   SUPABASE_SERVICE_ROLE_KEY      ← 失効した subscription を削除するため必要
// ──────────────────────────────────────────────────────────────

import webpush, { type PushSubscription } from 'web-push';
import { getSupabaseAdmin } from './supabaseAdmin';

let initialized = false;

function initVapid() {
  if (initialized) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:noreply@example.com';
  if (!publicKey || !privateKey) {
    throw new Error('VAPID キーが未設定です (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)');
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  initialized = true;
}

export interface NotificationPayload {
  title: string;
  body: string;
  /** タップで開く URL (PWA 内のパス)。デフォルト '/' */
  url?: string;
  /** 同種の通知をまとめるための tag */
  tag?: string;
  /** カスタムアイコン URL。デフォルト /icon-192x192.png */
  icon?: string;
}

export interface PushTarget {
  id: string;        // push_subscriptions.id
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface SendResult {
  total: number;
  succeeded: number;
  removed: number;  // 失効で削除した数
  errors: { endpoint: string; status?: number; message: string }[];
}

/** 複数 subscription にまとめて送信。失効してたら DB から消す。 */
export async function sendPushTo(
  targets: PushTarget[],
  payload: NotificationPayload,
): Promise<SendResult> {
  initVapid();
  const result: SendResult = { total: targets.length, succeeded: 0, removed: 0, errors: [] };
  if (targets.length === 0) return result;

  const removeIds: string[] = [];
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/',
    tag: payload.tag,
    icon: payload.icon,
  });

  await Promise.allSettled(
    targets.map(async t => {
      const sub: PushSubscription = {
        endpoint: t.endpoint,
        keys: { p256dh: t.p256dh, auth: t.auth },
      };
      try {
        await webpush.sendNotification(sub, body);
        result.succeeded++;
      } catch (e) {
        const err = e as { statusCode?: number; message?: string };
        const status = err.statusCode;
        const message = err.message ?? String(e);
        result.errors.push({ endpoint: t.endpoint, status, message });
        // 410 Gone / 404 Not Found = subscription 失効 → DB から削除
        if (status === 410 || status === 404) {
          removeIds.push(t.id);
        }
      }
    }),
  );

  if (removeIds.length > 0) {
    try {
      const admin = getSupabaseAdmin();
      const { error } = await admin.from('push_subscriptions').delete().in('id', removeIds);
      if (!error) result.removed = removeIds.length;
    } catch (e) {
      // 失効掃除の失敗は致命的やない、ログだけ
      console.warn('[sendPush] 失効 subscription の削除失敗:', e);
    }
  }

  return result;
}

/** auth.users の指定 user_id 群の subscription を全部取得 */
export async function getSubscriptionsForUsers(userIds: string[]): Promise<PushTarget[]> {
  if (userIds.length === 0) return [];
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', userIds);
  if (error) {
    console.error('[sendPush] subscription 取得失敗:', error);
    return [];
  }
  return (data ?? []) as PushTarget[];
}
