'use client';

// ──────────────────────────────────────────────────────────────
// push — Web Push 通知の subscribe / unsubscribe ヘルパー
//
// 仕様:
//   - subscribeToPush(): 権限要求 → SW.PushManager.subscribe → Supabase に保存
//   - unsubscribeFromPush(): SW から unsubscribe → Supabase 行を削除
//   - getPushSubscriptionStatus(): 現在の状態を返す ('granted' / 'denied' /
//     'default' / 'unsupported' / 'subscribed')
//
// VAPID キー:
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY 環境変数で配信。
//   未設定だと subscribe は失敗する (Phase 2 で正式設定)。
// ──────────────────────────────────────────────────────────────

import { isMockMode, supabase } from './supabase';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

export type PushStatus =
  | 'unsupported'   // ブラウザが Push API 非対応 (iOS Safari < 16.4 等)
  | 'denied'        // ユーザーが過去に拒否
  | 'default'       // 未許可 (まだ確認してない)
  | 'granted'       // 許可済 だが subscribe してない
  | 'subscribed';   // subscribe 済み

/** 現在のプッシュ通知 状態を取得 */
export async function getPushSubscriptionStatus(): Promise<PushStatus> {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('serviceWorker' in navigator)) return 'unsupported';
  if (!('PushManager' in window)) return 'unsupported';
  if (!('Notification' in window)) return 'unsupported';

  const perm = Notification.permission;
  if (perm === 'denied') return 'denied';

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) return 'subscribed';
  } catch {
    // ignore
  }
  return perm === 'granted' ? 'granted' : 'default';
}

/** プッシュ通知に subscribe (権限要求 → 購読 → Supabase 保存) */
export async function subscribeToPush(): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (typeof window === 'undefined') return { ok: false, reason: 'no window' };
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'このブラウザはプッシュ通知に対応してないで' };
  }
  if (isMockMode) {
    return { ok: false, reason: 'mock mode: Supabase 接続が無いから保存できへん' };
  }
  if (!VAPID_PUBLIC_KEY) {
    return {
      ok: false,
      reason: 'VAPID 公開鍵が未設定や (NEXT_PUBLIC_VAPID_PUBLIC_KEY)',
    };
  }

  // 1. 通知 権限を要求
  let perm: NotificationPermission = Notification.permission;
  if (perm === 'default') {
    perm = await Notification.requestPermission();
  }
  if (perm !== 'granted') {
    return { ok: false, reason: '通知の権限がもらえへんかった' };
  }

  // 2. SW 経由で PushManager に subscribe
  const reg = await navigator.serviceWorker.ready;
  let sub: PushSubscription;
  try {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      // Uint8Array.buffer は ArrayBufferLike 扱いで TS strict と衝突するので、
      // BufferSource として明示キャストして渡す。
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });
  } catch (err) {
    return { ok: false, reason: `subscribe 失敗: ${(err as Error).message}` };
  }

  // 3. Supabase に保存 (RLS で auth.uid() = user_id 必須)
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) {
    return { ok: false, reason: 'ログイン状態が確認できひん' };
  }

  const json = sub.toJSON();
  const endpoint = json.endpoint ?? sub.endpoint;
  const p256dh = json.keys?.p256dh ?? '';
  const authKey = json.keys?.auth ?? '';

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        endpoint,
        p256dh,
        auth: authKey,
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' },
    );
  if (error) {
    return { ok: false, reason: `Supabase 保存エラー: ${error.message}` };
  }
  return { ok: true };
}

/** unsubscribe して Supabase からも削除 */
export async function unsubscribeFromPush(): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (typeof window === 'undefined') return { ok: false, reason: 'no window' };
  if (!('serviceWorker' in navigator)) return { ok: false, reason: 'no SW' };

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return { ok: true };

  const endpoint = sub.endpoint;
  try {
    await sub.unsubscribe();
  } catch (err) {
    return { ok: false, reason: `unsubscribe 失敗: ${(err as Error).message}` };
  }

  if (!isMockMode) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  }
  return { ok: true };
}

// ─── helper: VAPID 公開鍵 (Base64URL) を Uint8Array に変換 ─────
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
