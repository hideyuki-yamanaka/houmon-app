-- 2026-05-10 住所不明タスクをメンバー単位で管理するためのカラム追加。
--
-- 訪問ログで status='unknown_address' があったメンバーに対して、メンバー詳細
-- 画面の訪問ログ section 最下部に「住所不明」アコーディオンを表示する。
-- そこで対応メモ + 解決チェック を編集する。
--
-- - address_issue_note: 対応メモ (長文)。NULL = メモなし。
-- - address_issue_resolved: タスク完了フラグ。default false。
--
-- ヒデさん指示 (2026-05-09)。

alter table public.members
  add column if not exists address_issue_note text,
  add column if not exists address_issue_resolved boolean default false;

-- 既存データには影響なし (新カラムは NULL/false 初期値)。
