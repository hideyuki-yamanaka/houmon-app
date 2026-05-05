// ========================================
// bu 修復スクリプト
//
// normalize-org-fields.mjs を 2 回流したことで bu が null に戻ってしまった。
// 既存の (短縮された) district 値から 正しい bu を逆引きして UPDATE する。
//
// 使い方:
//   node scripts/repair-bu-from-district.mjs           # dry-run
//   node scripts/repair-bu-from-district.mjs --apply   # 実際に UPDATE
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

// 既知の地区 → 部 マッピング (constants.ts と同期)
const DISTRICT_TO_BU = {
  // 豊岡部
  '香城地区': '豊岡部',
  '英雄地区': '豊岡部',
  '正義地区': '豊岡部',
  // 光陽部
  '光陽地区': '光陽部',
  '光輝地区': '光陽部',
  '黄金地区': '光陽部',
  // 豊岡中央支部
  '歓喜地区': '豊岡中央支部',
  'ナポレオン地区': '豊岡中央支部',
  '幸福地区': '豊岡中央支部',
};

const fetchRes = await fetch(
  `${SUPABASE_URL}/rest/v1/members?select=id,name,district,bu&order=id`,
  { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
);
const members = await fetchRes.json();

const changes = [];
for (const m of members) {
  const want = DISTRICT_TO_BU[m.district] ?? null;
  if ((m.bu ?? null) !== (want ?? null) && want != null) {
    changes.push({ id: m.id, name: m.name, district: m.district, fromBu: m.bu, toBu: want });
  }
}

console.log(`mode=${apply ? 'APPLY' : 'DRY-RUN'} / 修正対象: ${changes.length} 名`);
for (const c of changes) {
  console.log(`  ${c.name}: district=${c.district} bu: ${c.fromBu} → ${c.toBu}`);
}

if (!apply) {
  console.log('--- dry-run のみ。--apply で実行 ---');
  process.exit(0);
}

let ok = 0, ng = 0;
for (const c of changes) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/members?id=eq.${c.id}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ bu: c.toBu, updated_at: new Date().toISOString() }),
  });
  if (res.ok) ok++;
  else { ng++; console.error(`  NG ${c.name}: ${res.status}`); }
}
console.log(`完了: 成功 ${ok} / 失敗 ${ng}`);
