-- 2026-05-13 メンバーに「スキップ」フラグを追加。
--
-- 行きたい★ と同じ可逆 ON/OFF ブックマーク。
-- skipped=true のメンバーは:
--   - マップピン 非表示
--   - メンバー一覧の「スキップ」タブに格納される (他タブには出ない)
--   - 詳細シートの ★ の隣の⏭ボタンで ON/OFF 切替 (復元可能)
--
-- 既存の wantToVisit と同じ「ALTER TABLE 未実行 DB でも壊れない」パターン。
-- TypeScript 側でも row.skipped ?? false で読むので、デプロイは:
--   1. このマイグレ実行 (Supabase ダッシュボード or supabase CLI)
--   2. アプリ自体は先にデプロイされていても OK (壊れない)
-- どちらの順でも安全。
--
-- ヒデさん指示 (2026-05-13)。

alter table public.members
  add column if not exists skipped boolean default false;

-- 既存データには影響なし (全員 skipped=false で開始)。
