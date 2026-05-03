-- ──────────────────────────────────────────────────────────────
-- 2026-05-03  プッシュ通知 subscription 保存テーブル
--
-- 概要:
--   ユーザーが /settings で「通知を受け取る」を ON にしたら、
--   ブラウザの PushManager が発行する subscription を Supabase に保存する。
--   配信ロジック自体は Phase 2 (サーバー側 cron + web-push ライブラリ) で実装。
--
-- 安全:
--   - CREATE TABLE IF NOT EXISTS (冪等)
--   - DROP / TRUNCATE は無し
--   - RLS ON + 自分の subscription だけ操作できるポリシー
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  -- p256dh / auth は web-push の暗号化鍵 (公開してはいけない)
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 同じ endpoint を 2 回 INSERT しないよう unique 制約
  UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);


-- ─── RLS 有効化 + ポリシー ─────────────────────────────────────
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- SELECT: 自分の subscription のみ
DROP POLICY IF EXISTS "push_subscriptions_select_own" ON push_subscriptions;
CREATE POLICY "push_subscriptions_select_own" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT: 自分の user_id でのみ作成可
DROP POLICY IF EXISTS "push_subscriptions_insert_own" ON push_subscriptions;
CREATE POLICY "push_subscriptions_insert_own" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: 自分の subscription のみ
DROP POLICY IF EXISTS "push_subscriptions_update_own" ON push_subscriptions;
CREATE POLICY "push_subscriptions_update_own" ON push_subscriptions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: 自分の subscription のみ (通知 OFF 時に消す用)
DROP POLICY IF EXISTS "push_subscriptions_delete_own" ON push_subscriptions;
CREATE POLICY "push_subscriptions_delete_own" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);


-- ─── 配信時の参考メモ (Phase 2) ────────────────────────────────
-- サーバー側で web-push (Node) を使って下記のように送る想定:
--   import webpush from 'web-push';
--   webpush.setVapidDetails('mailto:...', VAPID_PUBLIC, VAPID_PRIVATE);
--   await webpush.sendNotification(
--     { endpoint, keys: { p256dh, auth } },
--     JSON.stringify({ title: '...', body: '...' })
--   );
-- ※ VAPID キーは別途生成し、PUBLIC は NEXT_PUBLIC_VAPID_PUBLIC_KEY、
--    PRIVATE は Vercel の Server-side env (VAPID_PRIVATE_KEY) に登録。
