-- ──────────────────────────────────────────────────────────────
-- 2026-05-04  Phase 1.5  招待トークン消費 RPC + 表示用ヘルパー
--
-- 目的:
--   Phase 1 で作った invite_tokens / team_memberships を
--   アプリ UI から安全に使うための SECURITY DEFINER 関数群。
--
--   - redeem_invite_token(token)         招待リンクを使ってチームに参加
--   - get_owner_display_names()          画面に出すオーナー名(メアドの @ 前)
--   - list_team_members_for_owner()      自分のデータを共有してる人の一覧
--
-- いずれも auth.uid() ベースで権限チェック済。authenticated にだけ EXECUTE 付与。
-- 既存テーブル/データには触らない (CREATE OR REPLACE のみ)。
-- ──────────────────────────────────────────────────────────────


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ 1. redeem_invite_token — 招待トークンを消費してチーム参加   ║
-- ╠═════════════════════════════════════════════════════════════╣
-- ║ 戻り値 (JSONB):                                              ║
-- ║   { ok: true,  owner_id: UUID, role: TEXT }                  ║
-- ║   { ok: false, reason: 'unauthenticated' }                   ║
-- ║   { ok: false, reason: 'not_found' }                         ║
-- ║   { ok: false, reason: 'expired' }                           ║
-- ║   { ok: false, reason: 'used' }                              ║
-- ║   { ok: false, reason: 'self' }   ← 自分用リンクは弾く        ║
-- ║                                                              ║
-- ║ 既存 team_membership があったら role を上書き(再招待で昇格).  ║
-- ║ 成功時 invite_tokens.used_at, used_by を埋める.              ║
-- ╚═════════════════════════════════════════════════════════════╝
CREATE OR REPLACE FUNCTION redeem_invite_token(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       UUID;
  v_token_row invite_tokens%ROWTYPE;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  END IF;

  SELECT * INTO v_token_row FROM invite_tokens WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF v_token_row.owner_id = v_uid THEN
    -- 自分が発行した自分用リンクは「使えない」扱い (UI 上もそう案内)
    RETURN jsonb_build_object('ok', false, 'reason', 'self');
  END IF;

  IF v_token_row.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'used');
  END IF;

  IF v_token_row.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  -- team_memberships に upsert (再招待で role 昇格できるように上書き)
  INSERT INTO team_memberships (owner_id, member_id, role, invited_at)
  VALUES (v_token_row.owner_id, v_uid, v_token_row.role, now())
  ON CONFLICT (owner_id, member_id)
  DO UPDATE SET role = EXCLUDED.role, invited_at = EXCLUDED.invited_at;

  -- トークンを「使用済み」に
  UPDATE invite_tokens
     SET used_at = now(), used_by = v_uid
   WHERE token = p_token;

  RETURN jsonb_build_object(
    'ok',       true,
    'owner_id', v_token_row.owner_id,
    'role',     v_token_row.role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION redeem_invite_token(UUID) TO authenticated;


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ 2. get_owner_display_names — オーナー名(メアド @ 前)         ║
-- ╠═════════════════════════════════════════════════════════════╣
-- ║ accessible_owner_ids() で自分が見られる owner_id について、 ║
-- ║ auth.users.email の '@' より前の文字列を display_name で返す.║
-- ║ 招待された側がバナー等で「○○さんのデータ」と表示するため.    ║
-- ║                                                              ║
-- ║ ※ auth.users への直接 SELECT を避け、SECURITY DEFINER で安全 ║
-- ║   に email を取り出す (auth.users は anon に直接アクセス不可) ║
-- ╚═════════════════════════════════════════════════════════════╝
CREATE OR REPLACE FUNCTION get_owner_display_names()
RETURNS TABLE(owner_id UUID, display_name TEXT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id AS owner_id,
         split_part(u.email, '@', 1) AS display_name
    FROM auth.users u
   WHERE u.id IN (SELECT accessible_owner_ids());
$$;

GRANT EXECUTE ON FUNCTION get_owner_display_names() TO authenticated;


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ 3. list_team_members_for_owner — 自分のチームメンバー一覧   ║
-- ╠═════════════════════════════════════════════════════════════╣
-- ║ auth.uid() がオーナーである team_memberships を email 付きで ║
-- ║ 返す. 共有設定画面で「共有してる人」一覧表示に使う.           ║
-- ╚═════════════════════════════════════════════════════════════╝
CREATE OR REPLACE FUNCTION list_team_members_for_owner()
RETURNS TABLE(
  member_id  UUID,
  email      TEXT,
  role       TEXT,
  invited_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tm.member_id,
         u.email,
         tm.role,
         tm.invited_at
    FROM team_memberships tm
    JOIN auth.users u ON u.id = tm.member_id
   WHERE tm.owner_id = auth.uid()
   ORDER BY tm.invited_at DESC;
$$;

GRANT EXECUTE ON FUNCTION list_team_members_for_owner() TO authenticated;


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ 動作確認スニペット (Supabase SQL Editor で任意に実行)        ║
-- ╚═════════════════════════════════════════════════════════════╝
-- SELECT * FROM get_owner_display_names();
-- SELECT * FROM list_team_members_for_owner();
-- SELECT redeem_invite_token('00000000-0000-0000-0000-000000000000'::uuid);
