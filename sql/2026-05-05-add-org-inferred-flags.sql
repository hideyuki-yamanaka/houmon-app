-- ──────────────────────────────────────────────────────────────
-- 2026-05-05 組織情報 (本部/部/地区) の "推測フラグ" を追加
--
-- ヒデさん指示:
--   ・確定済みの値 (名簿エクセルから取った値) と
--     住所から推測した値 を UI で区別したい
--   ・推測値は表示時に「英雄(仮)地区」のように "(仮)" を
--     値の中に挿入する。確定値はそのまま表示。
--
-- 既存行は全て false (= 確定扱い) で開始。
-- 後段で reconcile-org-from-excel スクリプトを走らせて、
-- 推測判定したフィールドだけ true に更新する。
--
-- 使い方:
--   Supabase Dashboard > SQL Editor で全文貼り付け → Run
--   IF NOT EXISTS 付きで何度実行しても安全。
-- ──────────────────────────────────────────────────────────────

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS honbu_inferred BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bu_inferred BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS district_inferred BOOLEAN NOT NULL DEFAULT false;

-- 動作確認用:
-- SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--   WHERE table_name = 'members'
--     AND column_name IN ('honbu_inferred', 'bu_inferred', 'district_inferred');
