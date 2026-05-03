-- ──────────────────────────────────────────────────────────────
-- 2026-05-03  マルチユーザー化 (Phase 1)
--
-- 目的:
--   1 つの Supabase プロジェクトを複数ユーザーで共有しても
--   「自分のメンバー / 自分の訪問記録だけ」が見える状態を作る。
--
-- ⚠️ 実行は 3 つのフェーズに分かれてる。順番厳守！
--   PHASE A: Supabase Dashboard で Email Provider 有効化 + 1 回ログイン
--   PHASE B: SQL の "STEP 1〜3" を実行 (カラム追加 + 既存データに user_id を埋める)
--   PHASE C: SQL の "STEP 4〜5" を実行 (RLS 有効化 + ポリシー作成)
--
--   ※ B と C を一気にやると、RLS が ON になった後で UPDATE が拒否される。
--      必ず B(バックフィル)を先に終わらせてから C を流すこと。
-- ──────────────────────────────────────────────────────────────


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ PHASE A: Supabase Dashboard 操作 (SQL じゃない)             ║
-- ╠═════════════════════════════════════════════════════════════╣
-- ║ 1. Authentication > Providers > Email を Enable             ║
-- ║    "Confirm email" は OFF でもいい(マジックリンクは別経路)   ║
-- ║ 2. Authentication > URL Configuration > Site URL に          ║
-- ║    https://houmon-app-lilac.vercel.app を設定                ║
-- ║    Redirect URLs に同じ URL + /auth/callback を追加          ║
-- ║ 3. https://houmon-app-lilac.vercel.app/login で 1 回ログイン  ║
-- ║    (メアド入力 → リンク受信 → クリック → ログイン)           ║
-- ║    → これで auth.users にヒデさんのレコードが作られる        ║
-- ╚═════════════════════════════════════════════════════════════╝


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ PHASE B: カラム追加 + 既存データのバックフィル              ║
-- ║ Supabase Dashboard > SQL Editor で 下記を順に流す           ║
-- ╚═════════════════════════════════════════════════════════════╝

-- ─── STEP 1: user_id カラム追加 (NULL 許可) ─────────────────────
-- いきなり NOT NULL にすると既存行が引っかかるので、まずは NULL OK で追加。
ALTER TABLE members ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE visits  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- インデックス(検索を速くする)
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_user_id  ON visits(user_id);


-- ─── STEP 2: 自分の user_id を確認 ─────────────────────────────
-- 下のクエリを実行して、結果から dosanko.design@gmail.com の id (UUID) をコピー。
-- 例: '12345678-abcd-...'
SELECT id, email, created_at FROM auth.users ORDER BY created_at;


-- ─── STEP 3: 既存データに ヒデさんの user_id を埋める ──────────
-- ⬇️ 下の '<HIDEYUKI-USER-ID-HERE>' を STEP 2 でコピーした UUID に置き換えて実行。
-- (シングルクォート ' は残すこと)

-- UPDATE members SET user_id = '<HIDEYUKI-USER-ID-HERE>' WHERE user_id IS NULL;
-- UPDATE visits  SET user_id = '<HIDEYUKI-USER-ID-HERE>' WHERE user_id IS NULL;

-- 全部埋まったか確認:
-- SELECT COUNT(*) FROM members WHERE user_id IS NULL;  -- 0 ならOK
-- SELECT COUNT(*) FROM visits  WHERE user_id IS NULL;  -- 0 ならOK


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ PHASE C: RLS 有効化 + ポリシー作成                          ║
-- ║ ⚠️ STEP 3 のバックフィルを完全に終わらせてから実行すること   ║
-- ╚═════════════════════════════════════════════════════════════╝

-- ─── STEP 4: NOT NULL に締めて漏れを今後防ぐ ───────────────────
-- (この時点で user_id NULL の行があるとエラーになる。STEP 3 をやり残してたら戻る)
ALTER TABLE members ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE visits  ALTER COLUMN user_id SET NOT NULL;


-- ─── STEP 5: 古い "全員 OK" ポリシーを削除 + RLS + 新ポリシー ──
-- 既存の何でも OK ポリシー名は環境によってバラバラなので、見つかれば全部消す。
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

-- members の ポリシー: 自分の行だけ
CREATE POLICY "members_select_own" ON members
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "members_insert_own" ON members
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "members_update_own" ON members
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "members_delete_own" ON members
  FOR DELETE USING (auth.uid() = user_id);

-- visits の ポリシー: 自分の行だけ
CREATE POLICY "visits_select_own" ON visits
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "visits_insert_own" ON visits
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "visits_update_own" ON visits
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "visits_delete_own" ON visits
  FOR DELETE USING (auth.uid() = user_id);


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ 動作確認(任意)                                              ║
-- ╚═════════════════════════════════════════════════════════════╝
-- ヒデさんがログイン状態で本番アプリを開いて、メンバー一覧 / 訪問履歴が
-- 全部見えてれば成功。何も見えなくなってたら STEP 3 が不完全。

-- 別ユーザーが追加された時(将来):
--   そのユーザーが自分のアカウントでログイン → 新規メンバー登録
--   → user_id が auth.uid() で自動セットされ、本人だけが見える状態になる


-- ╔═════════════════════════════════════════════════════════════╗
-- ║ Storage (画像) の保護 — Phase 1.5 以降の課題                ║
-- ╠═════════════════════════════════════════════════════════════╣
-- ║ visit-images バケットは publicUrl で全公開のまま。           ║
-- ║ 将来 ユーザー数が増えたら、バケットポリシーで                ║
-- ║ "auth.uid()/<filename>" のフォルダ分離をするのが定番パターン ║
-- ╚═════════════════════════════════════════════════════════════╝
