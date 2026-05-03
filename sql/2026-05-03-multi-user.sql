-- ──────────────────────────────────────────────────────────────
-- 2026-05-03  マルチユーザー化 (Phase 1)
--
-- 目的:
--   1 つの Supabase プロジェクトを複数ユーザーで共有しても
--   「自分のメンバー / 自分の訪問記録だけ」が見える状態を作る。
--
-- やること:
--   ① members / visits に user_id (auth.users) カラム追加
--   ② RLS (Row Level Security) を ON
--   ③ 「自分の行だけ SELECT/INSERT/UPDATE/DELETE」できるポリシー
--   ④ 既存データの user_id を埋める手順 (← ヒデさん用 ガイド)
--
-- 実行手順:
--   ❶ まず Supabase Dashboard > Authentication > Providers で
--      Email を有効化(マジックリンク)
--   ❷ 本番アプリ(https://houmon-app-lilac.vercel.app)で 1 回ログインする
--      → これでヒデさんの auth.users 行が作られる
--   ❸ 下記 SQL を Supabase Dashboard > SQL Editor で順に流す
--      (途中の "STEP" コメントを見ながら)
--   ❹ 最後の STEP 4 で 自分の user_id を確認し、既存データに紐付ける
-- ──────────────────────────────────────────────────────────────

-- ─── STEP 1: user_id カラム追加 (NULL 許可) ─────────────────────
-- いきなり NOT NULL にすると既存行が引っかかるので、まずは NULL OK で追加。
-- 後でヒデさんの user_id を埋めてから NOT NULL に締める。
ALTER TABLE members ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE visits  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- インデックス(検索を速くする)
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_user_id  ON visits(user_id);

-- ─── STEP 2: 古い "全員 OK" ポリシーを削除 ─────────────────────
-- 既存の何でも OK ポリシー名は環境によってバラバラなので、見つかれば消す。
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT polname, polrelid::regclass AS tbl
    FROM pg_policy
    WHERE polrelid IN ('members'::regclass, 'visits'::regclass)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', pol.polname, pol.tbl);
  END LOOP;
END $$;

-- RLS を有効化(これ以降、ポリシーで許可された行しか触れない)
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits  ENABLE ROW LEVEL SECURITY;

-- ─── STEP 3: 「自分の行だけ触れる」ポリシー ───────────────────
-- members
CREATE POLICY "members_select_own" ON members
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "members_insert_own" ON members
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "members_update_own" ON members
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "members_delete_own" ON members
  FOR DELETE USING (auth.uid() = user_id);

-- visits
CREATE POLICY "visits_select_own" ON visits
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "visits_insert_own" ON visits
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "visits_update_own" ON visits
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "visits_delete_own" ON visits
  FOR DELETE USING (auth.uid() = user_id);

-- ─── STEP 4: 既存データに ヒデさんの user_id を埋める ────────
-- ⚠️ 下記 SQL は ❷ で 1 回ログインしてから実行すること。
-- 自分の user_id を確認:
--   SELECT id, email FROM auth.users;
-- 結果のうち dosanko.design@gmail.com の id (UUID) をコピーして
-- 下の '<HIDEYUKI-USER-ID-HERE>' に貼り替えて実行。
--
-- UPDATE members SET user_id = '<HIDEYUKI-USER-ID-HERE>' WHERE user_id IS NULL;
-- UPDATE visits  SET user_id = '<HIDEYUKI-USER-ID-HERE>' WHERE user_id IS NULL;
--
-- 全部埋まってるか確認:
--   SELECT COUNT(*) FROM members WHERE user_id IS NULL; -- 0 になってればOK
--   SELECT COUNT(*) FROM visits  WHERE user_id IS NULL; -- 0 になってればOK
--
-- 全部埋まったら NOT NULL に締めて、漏れを今後防ぐ:
--   ALTER TABLE members ALTER COLUMN user_id SET NOT NULL;
--   ALTER TABLE visits  ALTER COLUMN user_id SET NOT NULL;

-- ─── STEP 5: Storage (画像) の保護 ─────────────────────────────
-- visit-images バケットも、ファイルパスにユーザー ID を含めて
-- 自分のフォルダだけアクセスできるようにする (今後の拡張用)。
-- 現状は publicUrl で全公開なので、必要に応じて後で締める。
-- (Phase 1 完了後に追加マイグレーションで対応)
