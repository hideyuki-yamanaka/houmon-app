// ========================================
// 3 階層化 (honbu/bu/district) 後の メンバーデータ整地スクリプト
//
// やること:
//   A. 木田さんの住所「東光5条目4-22」→「東光5条4-22」に修正 (誤表記)
//   B. info / notes から 「※地区情報：仮（本部のみの情報）」のメモを削除。
//      3 階層化で本部情報は honbu / bu に正規化済のため もう不要。
//
// 使い方:
//   node scripts/cleanup-after-3tier.mjs            # dry-run
//   node scripts/cleanup-after-3tier.mjs --apply    # 反映
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

async function rest(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

const members = await rest(`members?select=id,name,address,info,notes&order=id`);
console.log(`mode=${apply ? 'APPLY' : 'DRY-RUN'} / total=${members.length}`);

const changes = [];

// A. 木田さん住所修正
const kida = members.find(m => m.id === 'ym-toei-09');
if (kida && kida.address && kida.address.includes('5条目')) {
  changes.push({
    id: kida.id,
    name: kida.name,
    field: 'address',
    from: kida.address,
    to: kida.address.replace('5条目', '5条'),
  });
}

// B. info / notes から「※地区情報：仮（本部のみの情報）」を削除
const TAG_RE = /※地区情報：仮（本部のみの情報）/g;
for (const m of members) {
  for (const f of ['info', 'notes']) {
    const v = m[f];
    if (typeof v === 'string' && TAG_RE.test(v)) {
      // 区切り「 / 」やスペース、改行も合わせて掃除
      let cleaned = v
        .replace(/[ \t]*\/[ \t]*※地区情報：仮（本部のみの情報）/g, '')
        .replace(/※地区情報：仮（本部のみの情報）[ \t]*\/[ \t]*/g, '')
        .replace(/※地区情報：仮（本部のみの情報）/g, '')
        .replace(/^\s+|\s+$/g, '')
        .replace(/\n{3,}/g, '\n\n');
      if (cleaned !== v) {
        changes.push({ id: m.id, name: m.name, field: f, from: v, to: cleaned });
      }
    }
  }
}

console.log(`\n変更対象: ${changes.length} 件`);
for (const c of changes) {
  console.log(`\n  ${c.name} (${c.id}) [${c.field}]`);
  console.log(`    from: ${JSON.stringify(c.from).slice(0, 200)}`);
  console.log(`    to:   ${JSON.stringify(c.to).slice(0, 200)}`);
}

if (!apply) {
  console.log('\n--- dry-run のみ。--apply で実行 ---');
  process.exit(0);
}

console.log('\n=== APPLY ===');
let ok = 0, ng = 0;
// id ごとに変更を集約
const byId = new Map();
for (const c of changes) {
  if (!byId.has(c.id)) byId.set(c.id, { name: c.name, patch: {} });
  byId.get(c.id).patch[c.field] = c.to;
}
for (const [id, { name, patch }] of byId) {
  try {
    await rest(`members?id=eq.${id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    });
    ok++;
    console.log(`  OK ${name}`);
  } catch (e) {
    ng++;
    console.error(`  NG ${name}: ${e.message}`);
  }
}
console.log(`完了: 成功 ${ok} / 失敗 ${ng}`);
