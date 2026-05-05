-- ──────────────────────────────────────────────────────────────
-- 2026-05-05 訪問時刻 (時間単位、24時間表記) を追加
--
-- ヒデさん指示:
--   訪問記録に「何時に訪問したか」を残せるようにしたい。
--   分単位までは要らない。1時間単位 (0-23) で十分。
--
-- 使い方:
--   Supabase ダッシュボード > SQL Editor で全文貼り付け → Run
--   IF NOT EXISTS / NULL 許容なので 何度実行しても安全。
--
-- 既存行: visited_hour は NULL (未設定) のままで OK。
--   アプリ側は NULL を「時刻未設定」として 日付だけ表示する。
-- ──────────────────────────────────────────────────────────────

ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS visited_hour SMALLINT NULL
    CHECK (visited_hour IS NULL OR visited_hour BETWEEN 0 AND 23);

-- 動作確認用: マイグ後に実行すると 列の存在 と CHECK 制約を確認できる
-- SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'visits' AND column_name = 'visited_hour';
