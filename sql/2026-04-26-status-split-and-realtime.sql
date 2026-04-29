-- ──────────────────────────────────────────────────────────────
-- 2026-04-26
--   ① 訪問ステータス met → met_self / met_family の分割
--   ② 既存ログの再仕分け(不在 + 対応者あり → 家族に会えた に格上げ)
--   ③ Supabase Realtime publication に visits / members を登録
--      → iPhone/iPad で書いた瞬間、もう片方の端末が自動更新される
--
-- 使い方:
--   Supabase Dashboard > SQL Editor で全文貼り付け → Run
--   (何度実行しても安全な書き方になっとる)
-- ──────────────────────────────────────────────────────────────

-- ─── ① + ② 既存ログの仕分け修正 ───
-- 「会えた」を 対応者の有無で 2 分割
UPDATE visits SET status = 'met_family'
  WHERE status = 'met' AND respondent IS NOT NULL;
UPDATE visits SET status = 'met_self'
  WHERE status = 'met' AND respondent IS NULL;

-- 「不在」やけど家族と話せた → 家族に会えた に格上げ
UPDATE visits SET status = 'met_family'
  WHERE status = 'absent' AND respondent IS NOT NULL;

-- ─── ③ Supabase Realtime publication 設定 ───
-- 既に追加済みでもエラーにならんよう、エラーは無視する書き方
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE visits';
  EXCEPTION WHEN duplicate_object THEN
    -- 既に追加済みなら何もしない
    NULL;
  END;
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE members';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- ─── 確認用クエリ(任意) ───
-- 仕分け後の status 分布をチェックしたい時はコメントアウト解除して実行:
-- SELECT status, COUNT(*) FROM visits WHERE deleted_at IS NULL GROUP BY status;
