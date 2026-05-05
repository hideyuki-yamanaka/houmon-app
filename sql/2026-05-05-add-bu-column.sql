-- ──────────────────────────────────────────────────────────────
-- 2026-05-05 部/支部 (中間階層) を保持する bu カラムを追加
--
-- ヒデさん指示:
--   組織は「本部 → 部/支部 → 地区」の3階層なのに、 これまで
--   district フィールドに 「本部」 と 「部+地区」 が混在してた。
--   これを正しく 3 カラム (honbu / bu / district) に分離する。
--
-- 構造:
--   honbu    : 本部名 (例「豊岡本部」「東栄本部」「東旭川本部」「旭創価本部」)
--   bu       : 部/支部名 (例「豊岡部」「光陽部」「豊岡中央支部」)。本部のみで
--              地区がない場合は NULL。
--   district : 地区名 (例「英雄地区」「光輝地区」「ナポレオン地区」)。
--              本部のみで地区が無い場合や、不明な場合は NULL。
--   ※ NULL を使う代わりに 値として「不明」「仮」を許容する運用とする
--      (ヒデさん指示: 仮入力時は「仮」、未確定時は「不明」を入れる)。
--
-- 既存データは scripts/normalize-org-fields.mjs で 旧 district を
-- パースして 3 カラムに振り分ける。
--
-- 使い方:
--   Supabase Dashboard > SQL Editor で全文貼り付け → Run
--   IF NOT EXISTS 付きで何度実行しても安全。
-- ──────────────────────────────────────────────────────────────

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS bu TEXT NULL;

-- 動作確認用:
-- SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'members' AND column_name = 'bu';
