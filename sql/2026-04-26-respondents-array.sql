-- ──────────────────────────────────────────────────────────────
-- 2026-04-26 対応者を「複数選択可」に対応するためのカラム追加
--   - 旧: respondent TEXT (単一値)
--   - 新: respondents TEXT[] (配列、父+母 など複数入る)
--
-- 旧 respondent カラムは当面残す(保険・ロールバック用)。
-- アプリ側は respondents を最優先で読み、空なら respondent をフォールバック。
--
-- 使い方:
--   Supabase Dashboard > SQL Editor で全文貼り付け → Run
--   IF NOT EXISTS / WHERE で何度実行しても安全。
-- ──────────────────────────────────────────────────────────────

-- ① 配列カラムを追加(既にあればスキップ)
ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS respondents TEXT[];

-- ② 既存の respondent(単一値) を respondents 配列にコピー
--    まだ未コピー(respondents が NULL or 空)の行だけ対象
UPDATE visits
SET respondents = ARRAY[respondent]
WHERE respondent IS NOT NULL
  AND (respondents IS NULL OR cardinality(respondents) = 0);

-- ─── 確認用クエリ(任意) ───
-- 移行後の分布をチェックしたい時はコメント外して実行:
-- SELECT respondent, respondents, COUNT(*) FROM visits
--   WHERE deleted_at IS NULL
--   GROUP BY respondent, respondents
--   ORDER BY 1, 2;
