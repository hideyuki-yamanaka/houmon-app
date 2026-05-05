// ========================================
// 既存メンバーの district を 3 カラム (honbu / bu / district) に分解する
//
// 旧:
//   district='豊岡部英雄地区' (本部+部+地区が連結), honbu='' (空のことも)
//
// 新:
//   honbu='豊岡本部', bu='豊岡部', district='英雄地区'
//
// 使い方:
//   node scripts/normalize-org-fields.mjs           # dry-run (DBは触らない)
//   node scripts/normalize-org-fields.mjs --apply   # 実際に UPDATE する
//
// 前提:
//   先に sql/2026-05-05-add-bu-column.sql を Supabase で実行して
//   bu カラムを追加しておく。
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
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が .env.local にありません');
  process.exit(1);
}

// ── パース ロジック ─────────────────────────────
// 例:
//   "豊岡部英雄地区"            → bu="豊岡部",         district="英雄地区"
//   "豊岡中央支部歓喜地区"       → bu="豊岡中央支部",   district="歓喜地区"
//   "光陽部光輝地区"            → bu="光陽部",         district="光輝地区"
//   "東栄本部"                 → honbu="東栄本部" のみ (bu=null, district=null)
// honbu の推定:
//   bu が「豊岡部」「光陽部」「豊岡中央支部」 → honbu="豊岡本部"
//   それ以外で 自分自身が「○○本部」 → honbu=自分自身, bu/district=null

function parseOldDistrict(oldDistrict) {
  if (!oldDistrict || oldDistrict.trim() === '') {
    return { honbu: null, bu: null, district: null };
  }
  // 「○○本部」だけのパターン (bu/district なし)
  const honbuOnly = oldDistrict.match(/^(.+本部)$/);
  if (honbuOnly) {
    return { honbu: honbuOnly[1], bu: null, district: null };
  }
  // 「○○部」or「○○支部」+「○○地区」 のパターン
  const buDist = oldDistrict.match(/^(.+?(?:支部|部))(.+地区)$/);
  if (buDist) {
    const bu = buDist[1];
    const district = buDist[2];
    // bu から honbu を推定
    let honbu = null;
    if (bu === '豊岡部' || bu === '光陽部' || bu === '豊岡中央支部') {
      honbu = '豊岡本部';
    }
    return { honbu, bu, district };
  }
  // どちらでも無い → district だけそのまま、honbu/bu は不明
  return { honbu: null, bu: null, district: oldDistrict };
}

// ── 取得 ─────────────────────────────────────
// dry-run のときは bu カラム未追加でも動かしたいので select に含めない。
// apply のときは bu の現在値を見て差分判定したいので含める。
const selectCols = apply ? 'id,name,district,honbu,bu' : 'id,name,district,honbu';
const fetchRes = await fetch(
  `${SUPABASE_URL}/rest/v1/members?select=${selectCols}&order=id`,
  { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
);
if (!fetchRes.ok) {
  console.error(`fetch 失敗: ${fetchRes.status} ${await fetchRes.text()}`);
  process.exit(1);
}
const members = await fetchRes.json();
console.log(`${members.length} 名のメンバーを処理します (mode=${apply ? 'APPLY' : 'DRY-RUN'})`);
console.log('');

// ── 各メンバーを処理 ───────────────────────────
const changes = [];
for (const m of members) {
  const parsed = parseOldDistrict(m.district);
  // honbu の優先順: 既存 honbu (入力済) > パース推定
  const finalHonbu = (m.honbu && m.honbu.trim()) ? m.honbu.trim() : parsed.honbu;
  const finalBu = parsed.bu;
  const finalDistrict = parsed.district;

  const changed =
    (m.honbu ?? null) !== (finalHonbu ?? null) ||
    (m.bu ?? null) !== (finalBu ?? null) ||
    (m.district ?? null) !== (finalDistrict ?? null);

  if (changed) {
    changes.push({
      id: m.id,
      name: m.name,
      from: { honbu: m.honbu ?? null, bu: m.bu ?? null, district: m.district },
      to: { honbu: finalHonbu, bu: finalBu, district: finalDistrict },
    });
  }
}

console.log(`変更が必要なメンバー: ${changes.length} 名`);
console.log('');
for (const c of changes.slice(0, 100)) {
  console.log(`${c.name} (${c.id})`);
  console.log(`  before: honbu=${JSON.stringify(c.from.honbu)} bu=${JSON.stringify(c.from.bu)} district=${JSON.stringify(c.from.district)}`);
  console.log(`  after:  honbu=${JSON.stringify(c.to.honbu)}   bu=${JSON.stringify(c.to.bu)}   district=${JSON.stringify(c.to.district)}`);
}
if (changes.length > 100) console.log(`  ... and ${changes.length - 100} more`);

if (!apply) {
  console.log('');
  console.log('--- DRY-RUN モードのため DB は変更してません ---');
  console.log('実際に反映するには: node scripts/normalize-org-fields.mjs --apply');
  process.exit(0);
}

// ── APPLY ────────────────────────────────────
console.log('');
console.log('=== APPLY モード: DB を更新します ===');
let ok = 0;
let ng = 0;
for (const c of changes) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/members?id=eq.${c.id}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      honbu: c.to.honbu,
      bu: c.to.bu,
      district: c.to.district,
      updated_at: new Date().toISOString(),
    }),
  });
  if (res.ok) {
    ok++;
  } else {
    ng++;
    console.error(`  NG ${c.name}: ${res.status} ${await res.text()}`);
  }
}
console.log(`完了: 成功 ${ok} 名 / 失敗 ${ng} 名`);
