// ========================================
// ヤング名簿 Excel 同期スクリプト
// 使い方:
//   cp /Users/hideyuki/Downloads/栄光県*.xlsx /tmp/young_list.xlsx
//   cp /Users/hideyuki/Library/Mobile*/com~apple*/Private/SGI/名簿/*.xlsx /tmp/general_list.xlsx
//   cd houmon-app && node scripts/sync-young-from-excel.mjs
//
// やってること:
//   1) /tmp/young_list.xlsx の4本部シートからヤング名簿を読む
//   2) /tmp/general_list.xlsx の9地区シートで男子部名簿を読む
//   3) 名前(空白除去)+生年月日 で完全一致したヤングは「男子部地区」を確定
//      → district = "豊岡部英雄地区" のような男子部キーをそのまま使う
//   4) マッチしないヤングは district = 本部名（例: "東栄本部"）にして
//      備考(notes)の先頭に「※地区情報：仮（本部のみの情報）」を入れる
//   5) 既存ヤングは Supabase の name 一致で id を引き継ぐ（visit を孤立させない）
//   6) 住所を国土地理院 (GSI) でジオコーディング
//   7) members テーブルに upsert
//
// xlsx は node_modules に無いので /tmp/xlsx_pkg/xlsx.js から require する。
// （npm pack xlsx → tar -xzf → /tmp/xlsx_pkg/ 配下に展開済み）
// ========================================

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const XLSX = require('/tmp/xlsx_pkg/xlsx.js');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env.local
const envPath = join(__dirname, '..', '.env.local');
const envText = readFileSync(envPath, 'utf8');
const env = {};
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が .env.local にありません');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const YOUNG_XLSX = '/tmp/young_list.xlsx';
const GENERAL_XLSX = '/tmp/general_list.xlsx';
const PROVISIONAL_TAG = '※地区情報：仮（本部のみの情報）';

// ========================================
// 共通ユーティリティ
// ========================================

function normalizeName(s) {
  if (!s) return '';
  // 全角/半角スペース、タブ、改行を除去
  return String(s).replace(/[\s\u3000]+/g, '');
}

// Excel シリアル日付 → "YYYY-MM-DD" 文字列
// Lotus 1900 leap-year バグ補正は xlsx ライブラリの SSF.parse_date_code を使う
function excelSerialToISO(serial) {
  if (serial == null || serial === '') return null;
  const n = Number(serial);
  if (!Number.isFinite(n)) return null;
  // すでに文字列日付ぽいやつはそのまま返す
  if (typeof serial === 'string' && /\d{4}/.test(serial) && !/^\d+(\.\d+)?$/.test(serial)) {
    return serial;
  }
  const d = XLSX.SSF.parse_date_code(n);
  if (!d) return null;
  const yyyy = String(d.y).padStart(4, '0');
  const mm = String(d.m).padStart(2, '0');
  const dd = String(d.d).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// "旭川市豊岡8条3丁目..." → "旭川市豊岡8条3丁目..." (他市町村はそのまま)
// young/general 名簿は市の記載なしの「豊岡N条M丁目」フォーマットが多いので
// 旭川市プレフィクスを補完する
function normalizeAddress(raw) {
  if (!raw) return '';
  let s = String(raw).trim();
  // 既に都道府県/市区町村 が入ってたら触らない
  if (/旭川市|上川郡|美瑛町|東川町|札幌|札幌市/.test(s)) return s;
  // 「豊岡」「東光」「東旭川北」始まりは旭川市付与
  if (/^(豊岡|東光|東旭川|永山|神居|忠和|春光|大町|新富|宮前|青雲|曙|花咲|大雪通|住吉|近文)/.test(s)) {
    return '旭川市' + s;
  }
  return s;
}

function emptyToNull(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s;
}

// ========================================
// Excel 読み込み
// ========================================

/**
 * 1シートから名簿行を抽出。1メンバー = 2行（行a=表、行b=入会日/携帯）。
 * row 4 から 2 行ずつスキャンし、name 列(2)が埋まってる行をメンバー開始と見なす。
 */
function extractMembersFromSheet(sheet, sheetName, sourceLabel) {
  const arr = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const out = [];
  for (let i = 4; i < arr.length; i++) {
    const r1 = arr[i] ?? [];
    const r2 = arr[i + 1] ?? [];
    const name = String(r1[2] ?? '').trim();
    if (!name) continue;

    out.push({
      sheet: sheetName,
      sourceLabel,
      no: r1[0],
      role: emptyToNull(r1[1]),
      name,
      nameNorm: normalizeName(name),
      birthday: excelSerialToISO(r1[3]),
      enrollment_date: excelSerialToISO(r2[3]),
      age: emptyToNull(r1[4]),
      address: normalizeAddress(r1[5]),
      phone: emptyToNull(r1[6]),
      mobile: emptyToNull(r2[6]),
      workplace: emptyToNull(r1[7]),
      education_level: emptyToNull(r1[8]),
      family: emptyToNull(r1[9]),
      altar_status: emptyToNull(r1[10]),
      daily_practice: emptyToNull(r1[11]),
      newspaper: emptyToNull(r1[12]),
      financial_contribution: emptyToNull(r1[13]),
      activity_status: emptyToNull(r1[14]),
      youth_group: emptyToNull(r1[15]),
      notes: emptyToNull(r1[16]),
    });
    i++; // 2行目をスキップ
  }
  return out;
}

function loadYoungMembers() {
  const wb = XLSX.readFile(YOUNG_XLSX);
  const out = [];
  for (const honbu of wb.SheetNames) {
    const members = extractMembersFromSheet(wb.Sheets[honbu], honbu, 'young');
    members.forEach(m => { m.honbu = honbu; });
    out.push(...members);
  }
  return out;
}

function loadGeneralMembers() {
  const wb = XLSX.readFile(GENERAL_XLSX);
  const out = [];
  for (const sheetName of wb.SheetNames) {
    // '見本' / 'Sheet1' は飛ばす（地区シートだけ）
    if (!/地区$/.test(sheetName)) continue;
    const members = extractMembersFromSheet(wb.Sheets[sheetName], sheetName, 'general');
    // sheetName そのものを district キーとして使う（例: 豊岡部英雄地区）
    members.forEach(m => { m.district = sheetName; });
    out.push(...members);
  }
  return out;
}

// ========================================
// ジオコーディング (GSI)
// ========================================

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function buildGsiQueries(address) {
  const set = new Set();
  if (!address) return [];
  set.add(address);
  if (address.includes('号')) set.add(address.split('号')[0]);
  let cur = address;
  for (let i = 0; i < 3; i++) {
    const m = cur.match(/^(.*)[-－]\d+$/);
    if (!m) break;
    cur = m[1];
    set.add(cur);
  }
  const m1 = address.match(/^(.*?\d+条\d+丁目)/);
  if (m1) set.add(m1[1]);
  const m2 = address.match(/^(.*?町[^\d]*\d+丁目)/);
  if (m2) set.add(m2[1]);
  return Array.from(set);
}

async function gsiGeocode(q) {
  const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const c = arr[0]?.geometry?.coordinates;
    if (!Array.isArray(c) || c.length < 2) return null;
    return { lat: c[1], lng: c[0] };
  } catch {
    return null;
  }
}

function estimateByGrid(address) {
  const BASES = {
    '東光':     { lat: 43.770, lng: 142.430 },
    '豊岡':     { lat: 43.766, lng: 142.395 },
    '東旭川北': { lat: 43.780, lng: 142.475 },
    '東川町':   { lat: 43.722, lng: 142.528 },
    '美瑛町':   { lat: 43.587, lng: 142.465 },
  };
  let base = { lat: 43.766, lng: 142.404 };
  for (const [name, coord] of Object.entries(BASES)) {
    if (address.includes(name)) { base = coord; break; }
  }
  const m = address.match(/(\d+)条(\d+)丁目/);
  if (m) {
    const jou = parseInt(m[1], 10);
    const chome = parseInt(m[2], 10);
    return {
      lat: base.lat + (jou - 8) * 0.0009,
      lng: base.lng + (chome - 5) * 0.0011,
      source: 'grid',
    };
  }
  return { lat: base.lat, lng: base.lng, source: 'base' };
}

async function geocode(address) {
  if (!address) return { lat: 43.766, lng: 142.404, source: 'empty' };
  for (const q of buildGsiQueries(address)) {
    const hit = await gsiGeocode(q);
    if (hit) return { ...hit, source: `gsi:${q === address ? 'full' : 'trim'}` };
    await sleep(120);
  }
  return estimateByGrid(address);
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log('📖 Excel 読み込み中…');
  const youngs = loadYoungMembers();
  const generals = loadGeneralMembers();
  console.log(`  ヤング: ${youngs.length} 名 (${YOUNG_XLSX})`);
  console.log(`  男子部: ${generals.length} 名 (${GENERAL_XLSX})`);

  // 男子部インデックス: 名前(正規化)+生年月日 で引く
  const generalIndex = new Map();
  for (const g of generals) {
    const k = `${g.nameNorm}|${g.birthday ?? ''}`;
    generalIndex.set(k, g);
    // 生年月日が片方空でも名前だけで引けるようにフォールバックも入れとく
    if (!generalIndex.has(g.nameNorm)) generalIndex.set(g.nameNorm, g);
  }

  // 既存ヤング members を取得（id 引き継ぎ用）
  console.log('🔍 既存ヤングを取得中…');
  const { data: existing, error: exErr } = await supabase
    .from('members')
    .select('id, name, birthday')
    .eq('category', 'young');
  if (exErr) {
    console.error('既存取得失敗:', exErr);
    process.exit(1);
  }
  const idByName = new Map();
  const idByNameBday = new Map();
  for (const e of existing ?? []) {
    const nn = normalizeName(e.name);
    if (e.birthday) idByNameBday.set(`${nn}|${e.birthday}`, e.id);
    if (!idByName.has(nn)) idByName.set(nn, e.id);
  }
  console.log(`  既存ヤング: ${existing?.length ?? 0} 名`);

  // ── ヤングをマッチング & 仮マーキング ──
  const enriched = [];
  let confirmed = 0;
  let provisional = 0;
  const dupCheck = new Set();
  for (const y of youngs) {
    const key = `${y.nameNorm}|${y.birthday ?? ''}`;
    if (dupCheck.has(key)) {
      console.log(`  ⚠️  重複スキップ: ${y.name} (${y.honbu})`);
      continue;
    }
    dupCheck.add(key);

    const match = generalIndex.get(key) ?? generalIndex.get(y.nameNorm);
    let district;
    let isProvisional;
    if (match && match.district) {
      district = match.district;
      isProvisional = false;
      confirmed++;
    } else {
      district = y.honbu; // 本部名そのまま
      isProvisional = true;
      provisional++;
    }

    // 備考に仮マーカーを先頭に付加
    const baseNotes = y.notes ?? '';
    const notes = isProvisional
      ? (baseNotes ? `${PROVISIONAL_TAG} / ${baseNotes}` : PROVISIONAL_TAG)
      : baseNotes || null;

    // id 解決：name+生年月日 → name の順
    const existingId = idByNameBday.get(key) ?? idByName.get(y.nameNorm) ?? null;
    const id = existingId ?? `ym-x-${y.nameNorm.slice(0, 8)}-${(y.birthday ?? '').replace(/-/g, '')}`;

    enriched.push({ ...y, id, district, notes, isProvisional });
  }

  console.log(`\n📊 マッチング結果:`);
  console.log(`  ✅ 男子部マッチ確定: ${confirmed} 名`);
  console.log(`  📝 本部のみ(仮マーカー): ${provisional} 名`);
  console.log(`  合計: ${enriched.length} 名 (重複除去後)`);

  // ── ジオコーディング ──
  console.log('\n📍 ジオコーディング中…');
  for (let i = 0; i < enriched.length; i++) {
    const m = enriched[i];
    process.stdout.write(`  [${i + 1}/${enriched.length}] ${m.name} (${m.honbu}/${m.district}) … `);
    const coord = await geocode(m.address);
    m.lat = coord.lat;
    m.lng = coord.lng;
    console.log(`${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)} (${coord.source})`);
  }

  // ── upsert ──
  console.log('\n💾 Supabase に upsert 中…');
  const now = new Date().toISOString();
  const rows = enriched.map(r => ({
    id: r.id,
    name: r.name,
    name_kana: null,
    district: r.district,
    address: r.address,
    lat: r.lat,
    lng: r.lng,
    phone: r.phone,
    mobile: r.mobile,
    birthday: r.birthday,
    enrollment_date: r.enrollment_date,
    age: r.age != null ? Number(r.age) || null : null,
    workplace: r.workplace,
    role: r.role,
    education_level: r.education_level,
    family: r.family,
    altar_status: r.altar_status,
    daily_practice: r.daily_practice,
    newspaper: r.newspaper,
    financial_contribution: r.financial_contribution,
    activity_status: r.activity_status,
    youth_group: r.youth_group,
    notes: r.notes,
    visit_cycle_days: 30,
    category: 'young',
    honbu: r.honbu,
    updated_at: now,
  }));

  // 200件ずつバッチ
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from('members')
      .upsert(slice, { onConflict: 'id' });
    if (error) {
      console.error('❌ upsert 失敗:', error);
      process.exit(1);
    }
  }
  console.log(`✅ ${rows.length} 件 upsert 完了`);

  // 仮マーカー付きの一覧
  const provisionals = enriched.filter(e => e.isProvisional);
  if (provisionals.length > 0) {
    console.log(`\n📝 仮マーカー付きメンバー (${provisionals.length} 名):`);
    for (const p of provisionals) {
      console.log(`  - [${p.honbu}] ${p.name} / ${p.address}`);
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
