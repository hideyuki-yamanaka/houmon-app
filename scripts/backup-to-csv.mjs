// ───────────────────────────────────────────────────────────────
// Supabase のデータを CSV にエクスポートするスクリプト。
//
// - members / visits を全件取得して、backups/YYYY-MM-DD/ 配下に CSV 生成
// - GitHub Actions から毎日呼ばれる。手元でも実行可(node --env-file=.env.local)
// - 既に同日の CSV があれば上書き
// - 空のテーブルでも落ちない(ヘッダー行だけ書く)
// ───────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('[backup] SUPABASE_URL / SUPABASE_ANON_KEY が設定されてへん');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// JST で今日の日付を YYYY-MM-DD で返す
function todayJST() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

// CSVエスケープ: "" を含む / 改行 / カンマ を含むセルはダブルクオートで括る
function csvEscape(v) {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCSV(rows) {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  return lines.join('\n') + '\n';
}

async function fetchAll(table, orderBy) {
  const { data, error } = await supabase.from(table).select('*').order(orderBy);
  if (error) throw new Error(`[backup] ${table} の取得失敗: ${error.message}`);
  return data || [];
}

async function main() {
  const date = todayJST();
  const outDir = join('backups', date);
  mkdirSync(outDir, { recursive: true });

  const members = await fetchAll('members', 'district');
  const visits = await fetchAll('visits', 'visited_at');

  writeFileSync(join(outDir, 'members.csv'), toCSV(members));
  writeFileSync(join(outDir, 'visits.csv'), toCSV(visits));

  // 最新版を固定パスにも置く(人が「いつでも最新見たい」とき用)
  writeFileSync(join('backups', 'latest_members.csv'), toCSV(members));
  writeFileSync(join('backups', 'latest_visits.csv'), toCSV(visits));

  console.log(`[backup] ${date} 完了: members=${members.length}件 visits=${visits.length}件`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
