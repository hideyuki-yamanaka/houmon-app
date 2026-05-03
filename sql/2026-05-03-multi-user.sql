-- ──────────────────────────────────────────────────────────────
-- 2026-05-03  マルチユーザー化 (Phase 1) — B型 (オーナー+招待)
--
-- 設計方針:
--   - ヒデさん = データの "オーナー" (固定)
--   - 招待された人 = 'viewer'(閲覧のみ) or 'editor'(編集も可)
--   - 招待は "招待リンク" で行う (Phase 1.5 で UI 化、当面は SQL 手動)
--   - 招待される人は権限の概念を意識しない (ただリンクを踏むだけ)
--
-- テーブル構成:
--   members.user_id    → オーナーの auth.users.id (= ヒデさんの ID)
--   visits.user_id     → オーナーの auth.users.id (= ヒデさんの ID)
--   team_memberships   → 「誰が誰のデータを見られるか」マッピング
--   invite_tokens      → 「招待リンク発行履歴」
--
-- 実行は 4 フェーズに分かれる:
--   PHASE A: Supabase Dashboard 操作 (済)
--   PHASE B: カラム追加 + 自分の UUID 確認 + 既存データのバックフィル
--   PHASE C: 共有関連テーブル作成 (team_memberships + invite_tokens)
--   PHASE D: NOT NULL + RLS ポリシー (オーナー/招待者対応)
-- ──────────────────────────────────────────────────────────────


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ PHASE A: Supabase Dashboard 操作 (SQL じゃない) — 済         ║
-- ╠═════════════════════════════════════════════════════════════╣
-- ║ ✅ Authentication > Providers > Email を Enable             ║
-- ║ ✅ URL Configuration の Site URL / Redirect URLs を設定     ║
-- ║ ✅ /login で 1 回ログイン (auth.users にヒデさん登録済)      ║
-- ╚═════════════════════════════════════════════════════════════╝


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ PHASE B: カラム追加 + 既存データのバックフィル              ║
-- ╚═════════════════════════════════════════════════════════════╝

-- ─── STEP 1: user_id カラム追加 (済) ────────────────────────────
-- 既に実行済。冪等なので再実行しても安全。
ALTER TABLE members ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE visits  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_user_id  ON visits(user_id);


-- ─── STEP 2: 自分の user_id を確認 ──────────────────────────────
-- 下のクエリを実行して、結果から dosanko.design@gmail.com の id (UUID) をコピー。
-- 例: '12345678-abcd-...'
SELECT id, email, created_at FROM auth.users ORDER BY created_at;


-- ─── STEP 3: 既存データに ヒデさんの user_id を埋める ───────────
-- ⬇️ 下の '<HIDEYUKI-USER-ID-HERE>' を STEP 2 でコピーした UUID に置き換えて実行。
-- (シングルクォート ' は残すこと)

-- UPDATE members SET user_id = '<HIDEYUKI-USER-ID-HERE>' WHERE user_id IS NULL;
-- UPDATE visits  SET user_id = '<HIDEYUKI-USER-ID-HERE>' WHERE user_id IS NULL;

-- 全部埋まったか確認:
-- SELECT COUNT(*) FROM members WHERE user_id IS NULL;  -- 0 ならOK
-- SELECT COUNT(*) FROM visits  WHERE user_id IS NULL;  -- 0 ならOK


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ PHASE C: 共有関連テーブル作成                                ║
-- ║ ⚠️ STEP 3 のバックフィルを完了してから実行                    ║
-- ╚═════════════════════════════════════════════════════════════╝

-- ─── STEP 4: team_memberships テーブル作成 ──────────────────────
-- 「オーナー X のデータを、ユーザー Y が role 権限で見られる」というマッピング。
CREATE TABLE IF NOT EXISTS team_memberships (
  owner_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('viewer', 'editor')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_team_memberships_member ON team_memberships(member_id);


-- ─── STEP 5: invite_tokens テーブル作成 ─────────────────────────
-- 「招待リンク」の発行履歴。Phase 1.5 で UI から発行する時に使う。
-- token は URL の一部になるので、推測されにくい uuid をデフォルトにする。
CREATE TABLE IF NOT EXISTS invite_tokens (
  token       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('viewer', 'editor')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  used_at     TIMESTAMPTZ,
  used_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note        TEXT
);

CREATE INDEX IF NOT EXISTS idx_invite_tokens_owner ON invite_tokens(owner_id);


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ PHASE D: NOT NULL + RLS ポリシー                            ║
-- ║ ⚠️ STEP 3 のバックフィルが完全に完了してから実行             ║
-- ╚═════════════════════════════════════════════════════════════╝

-- ─── STEP 6: NOT NULL に締めて漏れを今後防ぐ ────────────────────
ALTER TABLE members ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE visits  ALTER COLUMN user_id SET NOT NULL;


-- ─── STEP 7: 古いポリシーを削除 + RLS 有効化 ────────────────────
-- 既存の何でも OK ポリシー名はバラバラなので、全部消す。
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

ALTER TABLE members           ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits            ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_memberships  ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_tokens     ENABLE ROW LEVEL SECURITY;


-- ─── STEP 8: ヘルパー関数 — auth.uid() がアクセス権を持つ owner_id 集合 ─
-- 「自分がオーナー」or「招待された側」を 1 関数で返す。
-- SECURITY DEFINER でポリシー内の自己参照を回避(RLS 無限ループ防止)。
CREATE OR REPLACE FUNCTION accessible_owner_ids()
RETURNS SETOF UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid()
  UNION
  SELECT owner_id FROM team_memberships WHERE member_id = auth.uid()
$$;

-- editor 権限を持つ owner_id 集合
CREATE OR REPLACE FUNCTION editable_owner_ids()
RETURNS SETOF UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid()
  UNION
  SELECT owner_id FROM team_memberships
   WHERE member_id = auth.uid() AND role = 'editor'
$$;


-- ─── STEP 9: members ポリシー ───────────────────────────────────
-- SELECT: オーナー or 招待された人 (viewer / editor 問わず)
CREATE POLICY "members_select" ON members
  FOR SELECT USING (user_id IN (SELECT accessible_owner_ids()));

-- INSERT: 自分のデータ追加 (user_id = auth.uid()) or editor 権限ある人
CREATE POLICY "members_insert" ON members
  FOR INSERT WITH CHECK (user_id IN (SELECT editable_owner_ids()));

-- UPDATE: オーナー or editor のみ
CREATE POLICY "members_update" ON members
  FOR UPDATE
  USING (user_id IN (SELECT editable_owner_ids()))
  WITH CHECK (user_id IN (SELECT editable_owner_ids()));

-- DELETE: オーナーのみ (editor でも削除は させない)
CREATE POLICY "members_delete" ON members
  FOR DELETE USING (user_id = auth.uid());


-- ─── STEP 10: visits ポリシー ───────────────────────────────────
CREATE POLICY "visits_select" ON visits
  FOR SELECT USING (user_id IN (SELECT accessible_owner_ids()));

CREATE POLICY "visits_insert" ON visits
  FOR INSERT WITH CHECK (user_id IN (SELECT editable_owner_ids()));

CREATE POLICY "visits_update" ON visits
  FOR UPDATE
  USING (user_id IN (SELECT editable_owner_ids()))
  WITH CHECK (user_id IN (SELECT editable_owner_ids()));

CREATE POLICY "visits_delete" ON visits
  FOR DELETE USING (user_id = auth.uid());


-- ─── STEP 11: team_memberships ポリシー ─────────────────────────
-- SELECT: 自分が関わる行 (owner or member)
CREATE POLICY "memberships_select" ON team_memberships
  FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = member_id);

-- INSERT/UPDATE/DELETE: オーナーのみ
CREATE POLICY "memberships_owner_write" ON team_memberships
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);


-- ─── STEP 12: invite_tokens ポリシー ────────────────────────────
-- 自分が発行したトークンだけ見える/操作できる
CREATE POLICY "invite_tokens_owner" ON invite_tokens
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- ※ 招待される側は token を URL で受け取る → アプリ側で
--    特殊な API (Supabase の RPC) で消費する想定 (Phase 1.5)。


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ 動作確認 (任意)                                              ║
-- ╚═════════════════════════════════════════════════════════════╝
-- ヒデさんがログイン状態でアプリを開いて、メンバー一覧 / 訪問履歴が
-- 全部見えてれば成功。

-- 当面の招待方法 (Phase 1.5 で UI 化):
--   1. 招待したい人に /login でログインしてもらう (1 回必要)
--   2. ヒデさんが SQL Editor で下記を実行:
--      INSERT INTO team_memberships (owner_id, member_id, role)
--      VALUES (
--        '<HIDEYUKI-USER-ID>',
--        (SELECT id FROM auth.users WHERE email = '<招待相手のメアド>'),
--        'editor'   -- or 'viewer'
--      );
--   3. 招待相手が次にアプリを開いたら、ヒデさんのデータが見える状態に。
