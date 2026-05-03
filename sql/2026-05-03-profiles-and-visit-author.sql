-- ──────────────────────────────────────────────────────────────
-- 2026-05-03  プロフィール + 訪問ログ作成者トラッキング
--
-- 共有機能の表示名問題を解決:
--   - 今は get_owner_display_names が email の @ 前を出すだけ
--   - profiles テーブルで「自分の表示名」を編集できるようにする
--   - visits.created_by で「誰が記入したか」を記録
--   - UI 側で 自動算出した色 + 名前 のチップを表示できるようにする
--
-- 設計:
--   - profiles.user_id (PK) → display_name のみ持つ。色は app 側で
--     user_id を hash して 8 色パレットから自動算出する (DB に色は持たない)
--   - visits.created_by → 訪問記録を実際に書いた人 (=auth.uid())。
--     編集はしない前提なので「最終編集者」概念は不要 (ヒデさん指示)
--   - 既存 visits は backfill で user_id をそのまま created_by にコピー
--   - 新規ユーザー登録時 trigger で profiles 行 自動作成
--
-- 実行は順番通り、上から下に流すだけ。冪等。
-- ──────────────────────────────────────────────────────────────


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ STEP 1: profiles テーブル作成                                ║
-- ╚═════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS profiles (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ STEP 2: 既存ユーザーの profiles をバックフィル                ║
-- ╚═════════════════════════════════════════════════════════════╝
-- メアドの @ 前を初期表示名として入れる。ユーザーは後でアプリ側で編集可能。

INSERT INTO profiles (user_id, display_name)
SELECT id, split_part(email, '@', 1)
  FROM auth.users
ON CONFLICT (user_id) DO NOTHING;


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ STEP 3: 新規ユーザー登録時に profiles 自動作成 trigger        ║
-- ╚═════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (user_id, display_name)
  VALUES (NEW.id, split_part(NEW.email, '@', 1))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ STEP 4: visits.created_by カラム追加 + バックフィル          ║
-- ╚═════════════════════════════════════════════════════════════╝

ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 既存データは「user_id (=オーナー)」がそのまま作成者と見なす
UPDATE visits SET created_by = user_id WHERE created_by IS NULL;

CREATE INDEX IF NOT EXISTS idx_visits_created_by ON visits(created_by);


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ STEP 5: profiles RLS                                         ║
-- ╚═════════════════════════════════════════════════════════════╝
-- 自分の profile + 同じチームのメンバー全員 を SELECT 可能。
-- 編集は自分だけ。

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_team" ON profiles;
CREATE POLICY "profiles_select_team" ON profiles
  FOR SELECT USING (
    -- 自分自身
    user_id = auth.uid()
    -- 自分が見られるオーナー
    OR user_id IN (SELECT accessible_owner_ids())
    -- 自分のオーナーが招待してる仲間
    OR user_id IN (
      SELECT member_id FROM team_memberships
       WHERE owner_id IN (SELECT accessible_owner_ids())
    )
  );

DROP POLICY IF EXISTS "profiles_upsert_own" ON profiles;
CREATE POLICY "profiles_upsert_own" ON profiles
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ STEP 6: チーム全員のプロフィールを取得する RPC               ║
-- ╚═════════════════════════════════════════════════════════════╝
-- アプリ起動時に1回叩いて、user_id → display_name のマップを作る。
-- created_by の表示はこのマップ参照で行う。

CREATE OR REPLACE FUNCTION get_team_profiles()
RETURNS TABLE(user_id UUID, display_name TEXT)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.display_name
    FROM profiles p
   WHERE
     -- 自分自身
     p.user_id = auth.uid()
     -- 自分が見られるオーナー
     OR p.user_id IN (SELECT accessible_owner_ids())
     -- 自分のオーナーが招待してる仲間 (= 同じチームの編集者/閲覧者)
     OR p.user_id IN (
       SELECT member_id FROM team_memberships
        WHERE owner_id IN (SELECT accessible_owner_ids())
     )
$$;

GRANT EXECUTE ON FUNCTION get_team_profiles() TO authenticated;


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ 動作確認                                                    ║
-- ╚═════════════════════════════════════════════════════════════╝
-- 全員 profile 入った? ↓ 0 ならOK
-- SELECT COUNT(*) FROM auth.users u
--   LEFT JOIN profiles p ON p.user_id = u.id
--  WHERE p.user_id IS NULL;
--
-- 全 visits に created_by 入った? ↓ 0 ならOK
-- SELECT COUNT(*) FROM visits WHERE created_by IS NULL;
--
-- 自分のチーム profiles 取れる? ↓ アプリログイン状態で
-- SELECT * FROM get_team_profiles();
