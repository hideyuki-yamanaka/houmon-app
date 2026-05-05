// ========================================
// 堀内 希夢 (ym-toyo-15) の district を修正
// 旧: "豊岡中央支部ナポレオン地区"
// 新: "豊岡中央支部"
// 使い方: node scripts/fix-horiuchi-district.mjs
// ========================================

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が .env.local にありません');
  process.exit(1);
}

const id = 'ym-toyo-15';
const newDistrict = '豊岡中央支部';

// before の確認
const beforeRes = await fetch(`${SUPABASE_URL}/rest/v1/members?id=eq.${id}&select=id,name,district`, {
  headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
});
const before = await beforeRes.json();
if (!Array.isArray(before) || before.length === 0) {
  console.error(`id=${id} のメンバーが見つかりません`);
  process.exit(1);
}
console.log('変更前:', JSON.stringify(before[0], null, 2));

// UPDATE 実行
const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/members?id=eq.${id}`, {
  method: 'PATCH',
  headers: {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  },
  body: JSON.stringify({
    district: newDistrict,
    updated_at: new Date().toISOString(),
  }),
});
if (!updateRes.ok) {
  console.error(`UPDATE 失敗: ${updateRes.status} ${await updateRes.text()}`);
  process.exit(1);
}
const after = await updateRes.json();
console.log('変更後:', JSON.stringify(after[0], null, 2));
console.log('✅ 完了');
