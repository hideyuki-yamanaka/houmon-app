// 組織情報「--」のメンバーを抽出して、address/honbu/隣接情報から
// 推測できそうな手がかりを一覧化する (dry-run only, 書き込みしない)
//
// 使い方: node scripts/audit-org-gaps.mjs

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envText = readFileSync(join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: rows, error } = await supabase
  .from('members')
  .select('id, name, address, honbu, bu, district, lat, lng')
  .order('name');
if (error) { console.error(error); process.exit(1); }

const totalRows = rows.length;
const missingBu = rows.filter(r => !r.bu || !r.bu.trim());
const missingDistrict = rows.filter(r => !r.district || !r.district.trim());

console.log(`総メンバー: ${totalRows}`);
console.log(`bu 未設定: ${missingBu.length}`);
console.log(`district 未設定: ${missingDistrict.length}\n`);

console.log('========== bu未設定 + 住所有り (推測の最有力候補) ==========');
const buGapsWithAddress = missingBu.filter(r => r.address && r.address.trim());
console.log(`該当: ${buGapsWithAddress.length} 名\n`);
for (const r of buGapsWithAddress) {
  console.log(`- ${r.name}  honbu=${r.honbu ?? '(なし)'}  address=${r.address}  lat=${r.lat ?? '?'}, lng=${r.lng ?? '?'}`);
}

console.log('\n========== bu未設定 + 住所無し ==========');
const buGapsNoAddress = missingBu.filter(r => !r.address || !r.address.trim());
for (const r of buGapsNoAddress) {
  console.log(`- ${r.name}  honbu=${r.honbu ?? '(なし)'}`);
}

// 既存の bu/district が分かってるメンバーを「住所キーワード→bu」の学習データにする
console.log('\n========== 既知 bu+address の住所サンプル（bu 別） ==========');
const buToAddrs = new Map();
for (const r of rows) {
  if (!r.bu || !r.address) continue;
  if (!buToAddrs.has(r.bu)) buToAddrs.set(r.bu, []);
  buToAddrs.get(r.bu).push({ name: r.name, district: r.district, address: r.address });
}
for (const [bu, list] of buToAddrs) {
  console.log(`\n[${bu}]  ${list.length} 名`);
  for (const m of list.slice(0, 8)) {
    console.log(`  ${m.name} (${m.district ?? '-'}): ${m.address}`);
  }
  if (list.length > 8) console.log(`  ... +${list.length - 8} 名`);
}
