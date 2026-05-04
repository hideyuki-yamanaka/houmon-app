-- ──────────────────────────────────────────────────────────────
-- 2026-05-04  招待リンクの「宛先 / 受け入れた人」情報拡張
--
-- 目的:
--   発行中の招待リンク 一覧 UI で、ヒデさんが
--   「このリンクは誰宛に送ったか」「誰が受け入れたか」を
--   一目で確認できるようにする。
--
-- 変更点:
--   1. invite_tokens.invited_email カラム追加
--      → メアド招待時に保存。リンクだけ発行は NULL のまま。
--   2. 新 RPC list_invite_tokens_with_recipients() を作成
--      → token + 受け入れた人の email / display_name を 1 発で返す
--      (auth.users への直接 SELECT を避けるため SECURITY DEFINER)
--
-- 実行: Supabase SQL Editor で上から下に流すだけ。冪等。
-- ──────────────────────────────────────────────────────────────


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ STEP 1: invited_email カラム追加 (冪等)                     ║
-- ╚═════════════════════════════════════════════════════════════╝
ALTER TABLE invite_tokens
  ADD COLUMN IF NOT EXISTS invited_email TEXT;


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ STEP 2: list_invite_tokens_with_recipients RPC              ║
-- ╠═════════════════════════════════════════════════════════════╣
-- ║ 自分が発行した invite_tokens を、受け入れた人(used_by)の     ║
-- ║ email / display_name 付きで返す。新しい順。                  ║
-- ║                                                              ║
-- ║ 既存 listInviteTokens (テーブル直 SELECT) はそのまま残し、    ║
-- ║ 一覧表示専用にこっちを使う想定。                              ║
-- ╚═════════════════════════════════════════════════════════════╝
CREATE OR REPLACE FUNCTION list_invite_tokens_with_recipients()
RETURNS TABLE(
  token              UUID,
  role               TEXT,
  created_at         TIMESTAMPTZ,
  expires_at         TIMESTAMPTZ,
  used_at            TIMESTAMPTZ,
  used_by            UUID,
  invited_email      TEXT,
  recipient_email    TEXT,
  recipient_name     TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.token,
    t.role,
    t.created_at,
    t.expires_at,
    t.used_at,
    t.used_by,
    t.invited_email,
    u.email          AS recipient_email,
    p.display_name   AS recipient_name
  FROM invite_tokens t
  LEFT JOIN auth.users u ON u.id = t.used_by
  LEFT JOIN profiles   p ON p.user_id = t.used_by
  WHERE t.owner_id = auth.uid()
  ORDER BY t.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION list_invite_tokens_with_recipients() TO authenticated;


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ 動作確認スニペット                                           ║
-- ╚═════════════════════════════════════════════════════════════╝
-- SELECT * FROM list_invite_tokens_with_recipients();
