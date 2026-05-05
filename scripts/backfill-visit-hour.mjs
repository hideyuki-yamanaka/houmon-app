// ========================================
// 訪問記録の visited_hour を created_at から backfill
//
// ロジック:
//   visited_hour が NULL のもののみ対象。
//   created_at(UTC) を JST(+9) に変換して hour を取り出し、ただし
//   visited_at と created_at の日付が一致する時だけ backfill する
//   (一致しない場合は 後日入力なので訪問時刻と無関係)。
//
// 使い方:
//   node scripts/backfill-visit-hour.mjs            # dry-run
//   node scripts/backfill-visit-hour.mjs --apply    # 反映
// ========================================

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const apply = process.argv.includes('--apply');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envText = readFileSync(join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '').replace(/\\n$/g, '').trim();
}
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const fetchRes = await fetch(
  `${SUPABASE_URL}/rest/v1/visits?select=id,visited_at,visited_hour,created_at&deleted_at=is.null`,
  { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
);
const visits = await fetchRes.json();

const changes = [];
for (const v of visits) {
  if (v.visited_hour != null) continue; // 既に値があるなら触らない
  const created = new Date(v.created_at);
  // JST に変換
  const jst = new Date(created.getTime() + 9 * 60 * 60 * 1000);
  const jstDate = jst.toISOString().slice(0, 10);
  if (jstDate !== v.visited_at) continue; // 後日入力は除外
  changes.push({
    id: v.id,
    visited_at: v.visited_at,
    hour: jst.getUTCHours(), // JST 化したオブジェクトの UTC hour = 実際の JST hour
  });
}

console.log(`mode=${apply ? 'APPLY' : 'DRY-RUN'} / 対象: ${changes.length} / 全 ${visits.length} 件`);
for (const c of changes.slice(0, 30)) {
  console.log(`  visit ${c.id}: visited_at=${c.visited_at} → visited_hour=${c.hour}`);
}
if (changes.length > 30) console.log(`  ... and ${changes.length - 30} more`);

if (!apply) {
  console.log('--- dry-run のみ。--apply で実行 ---');
  process.exit(0);
}

console.log('=== APPLY ===');
let ok = 0, ng = 0;
for (const c of changes) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/visits?id=eq.${c.id}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ visited_hour: c.hour, updated_at: new Date().toISOString() }),
  });
  if (res.ok) ok++;
  else { ng++; console.error(`  NG ${c.id}: ${res.status}`); }
}
console.log(`完了: 成功 ${ok} / 失敗 ${ng}`);
