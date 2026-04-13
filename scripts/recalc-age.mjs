// ========================================
// 年齢一括再計算スクリプト
// 使い方: node scripts/recalc-age.mjs
//
// やること:
//   全メンバーの birthday から現在の年齢を算出し、age カラムを更新する。
//   birthday が空 or 不正のメンバーはスキップ。
//   supabase-js 不要（REST API を直接叩く）。
// ========================================

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env.local 読み込み
const envPath = join(__dirname, '..', '.env.local');
const envText = readFileSync(envPath, 'utf8');
const env = {};
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '').replace(/\\n$/g, '').trim();
}
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が .env.local にありません');
  process.exit(1);
}

async function supabaseGet(table, select) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`GET ${table} 失敗: ${res.status}`);
  return res.json();
}

async function supabaseUpdate(table, id, data) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`PATCH ${id} 失敗: ${res.status} ${await res.text()}`);
}

function calcAge(birthday) {
  if (!birthday) return null;
  const parts = birthday.replace(/\//g, '-').split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [y, m, d] = parts;
  const today = new Date();
  let age = today.getFullYear() - y;
  const monthDiff = today.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) age--;
  return age >= 0 ? age : null;
}

async function main() {
  console.log('全メンバーの年齢を生年月日から再計算します...\n');

  const members = await supabaseGet('members', 'id,name,birthday,age');
  console.log(`対象メンバー: ${members.length}人\n`);

  let updated = 0;
  let skipped = 0;
  let unchanged = 0;

  for (const m of members) {
    const newAge = calcAge(m.birthday);
    if (newAge == null) {
      skipped++;
      continue;
    }
    if (m.age === newAge) {
      unchanged++;
      continue;
    }
    try {
      await supabaseUpdate('members', m.id, {
        age: newAge,
        updated_at: new Date().toISOString(),
      });
      console.log(`  ✓ ${m.name}: ${m.age ?? '未設定'} → ${newAge}歳`);
      updated++;
    } catch (e) {
      console.error(`  × ${m.name}: ${e.message}`);
    }
  }

  console.log(`\n完了！ 更新: ${updated}件 / 変更なし: ${unchanged}件 / スキップ(生年月日なし): ${skipped}件`);
}

main();
