// ========================================
// 名簿エクセルと Supabase の組織情報を突合し、
// 確定/推測 を仕分けして DB を更新するスクリプト
//
// 使い方:
//   cd houmon-app
//   node scripts/reconcile-org-from-excel.mjs            # dry-run (差分のみ表示)
//   node scripts/reconcile-org-from-excel.mjs --apply    # 実 DB へ書き込み
//
// 入力:
//   1. 最新豊岡本部統監名簿.xlsx
//      → シート名 = "豊岡部英雄地区" のような bu+district。
//        honbu="豊岡本部" 固定。bu/district を確定値として扱う。
//   2. 栄光県　ヤング男子部名簿.xlsx
//      → シート名 = "東栄本部" 等の honbu。bu/district は不明。
//        この時点では honbu のみ確定 として扱う。
//   3. 牙城会名簿 (画像から手起こし) ─ 限定リスト
//      → 氏名と (honbu, bu) のセットがハードコード済。
//
// 突合ロジック:
//   - 氏名 (空白除去) で完全一致を見る。
//   - 一致した行の honbu/bu/district を Excel 由来の値で上書き候補にする。
//   - 元 DB の値が Excel と違う場合は警告表示 (人手判断が必要)。
//
// 出力:
//   - dry-run: 差分プレビュー (markdown 風)
//   - --apply: Supabase へ直接 update
// ========================================

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const APPLY = process.argv.includes('--apply');

// ── 入力ファイルパス (固定: ヒデさんの iCloud 配下) ──
const ROSTER_BASE = '/Users/hideyuki/Library/Mobile Documents/com~apple~CloudDocs/Private/SGI/名簿';
const FILE_TOYOOKA = join(ROSTER_BASE, '最新豊岡本部統監名簿.xlsx');
const FILE_YOUNG = join(ROSTER_BASE, '栄光県　ヤング男子部名簿.xlsx');

// ── 牙城会画像から手起こしした (本部, 部, 氏名) リスト ──
//   File1/2 で bu が分からない人について、画像から確認できた bu を補完するため。
//   bu は確定値として扱う (画像を直接見て転記しているため)。
const GAJO_OVERRIDES = [
  { name: '上野 雅昭',   honbu: '東旭川本部', bu: '東旭川部' },
  { name: '鈴木 雅俊',   honbu: '東旭川本部', bu: '千代田部' },
  { name: '木下 陽介',   honbu: '東旭川本部', bu: '東旭川部' },
  { name: '千葉 賢隆',   honbu: '東旭川本部', bu: '東旭川部' },
  { name: '高田 裕之',   honbu: '豊岡本部',   bu: '光陽部' },
  { name: '山中 秀幸',   honbu: '豊岡本部',   bu: '豊岡部', district: '香城地区' },
  { name: '川口 雄一',   honbu: '豊岡本部',   bu: '豊岡部', district: '香城地区' },
  { name: '川口 史也',   honbu: '豊岡本部',   bu: '豊岡部', district: '香城地区' },
  { name: '新屋敷 拓',   honbu: '豊岡本部',   bu: '豊岡中央支部' },
  { name: '堂田 雅之',   honbu: '豊岡本部',   bu: '豊岡中央支部' },
  { name: '小野島 守男', honbu: '東栄本部',   bu: '東栄部' },
  { name: '坂 幸夫',     honbu: '東栄本部',   bu: '緑東部' },
  { name: '塚原 柊',     honbu: '東栄本部',   bu: '東栄部' },
  { name: '沼畑 裕一',   honbu: '東栄本部',   bu: '緑東部' },
  { name: '我部山 翼',   honbu: '旭創価本部', bu: '東川部' },
  { name: '佐藤 波之',   honbu: '旭創価本部', bu: '空港部' },
];

// ── 文字列正規化 (姓名スペース・全角半角の揺れ吸収) ──
function normName(s) {
  if (!s) return '';
  return String(s)
    .replace(/[　\s]+/g, '') // 全/半角スペース除去
    .replace(/　/g, '')
    .trim();
}

// ── Excel 読み込み ──
function readSheet(file, sheetName) {
  const wb = XLSX.readFile(file);
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
}

function listSheets(file) {
  return XLSX.readFile(file).SheetNames;
}

// 統監名簿の行構造 (R3 がヘッダー):
//   [No, 役職, 氏名, 生年月日, 年齢, 住所, 自宅TEL, 職場, 教学, 同居家族,
//    御安置, 勤行, 聖教購読, 広布部員, 活動状況, 創牙, 備考]
//   各メンバーは 2 行構成 (上段・下段)。
const COL = {
  no: 0, role: 1, name: 2, birthEnroll: 3, age: 4,
  address: 5, phone: 6, workplace: 7, education: 8, family: 9,
  altar: 10, prac: 11, news: 12, distr: 13, activity: 14, youth: 15, notes: 16,
};

function parseRosterSheet(file, sheetName, honbu, bu, district) {
  const rows = readSheet(file, sheetName);
  const records = [];
  // ヘッダー後 (R5 以降) を 2 行ずつ走査
  for (let i = 4; i < rows.length; i += 2) {
    const r1 = rows[i] || [];
    const r2 = rows[i + 1] || [];
    const name = String(r1[COL.name] || '').trim();
    if (!name) continue;
    records.push({
      name,
      nameKey: normName(name),
      honbu, bu, district,
      role: String(r1[COL.role] || '').trim() || undefined,
      birthday: String(r1[COL.birthEnroll] || '').trim() || undefined,
      enrollment: String(r2[COL.birthEnroll] || '').trim() || undefined,
      age: r1[COL.age] ? Number(r1[COL.age]) : undefined,
      address: String(r1[COL.address] || '').trim() || undefined,
      phone: String(r1[COL.phone] || '').trim() || undefined,
      mobile: String(r2[COL.phone] || '').trim() || undefined,
      workplace: String(r1[COL.workplace] || '').trim() || undefined,
      educationLevel: String(r1[COL.education] || '').trim() || undefined,
      family: String(r1[COL.family] || '').trim() || undefined,
      altarStatus: String(r1[COL.altar] || '').trim() || undefined,
      dailyPractice: String(r1[COL.prac] || '').trim() || undefined,
      newspaper: String(r1[COL.news] || '').trim() || undefined,
      financialContribution: String(r1[COL.distr] || '').trim() || undefined,
      activityStatus: String(r1[COL.activity] || '').trim() || undefined,
      youthGroup: String(r1[COL.youth] || '').trim() || undefined,
      notes: String(r1[COL.notes] || '').trim() || undefined,
      source: `${file.split('/').pop()}!${sheetName}`,
    });
  }
  return records;
}

// シート名 "豊岡部英雄地区" → bu="豊岡部", district="英雄地区"
//        "豊岡中央支部歓喜地区" → bu="豊岡中央支部", district="歓喜地区"
//        "光陽部光陽地区" → bu="光陽部", district="光陽地区"
//   bu は「支部」 or 「部」で終わる(最小マッチ)。district は残りの「XX地区」。
function splitBuDistrict(sheetName) {
  const m = sheetName.match(/^(.+?(?:支部|部))(.+地区)$/);
  if (!m) return { bu: '', district: '' };
  return { bu: m[1], district: m[2] };
}

// ── 全レコード収集 ──
function collectAllExcelRecords() {
  const all = new Map(); // nameKey -> record

  // 1. 統監名簿 (確定: honbu+bu+district)
  if (existsSync(FILE_TOYOOKA)) {
    for (const sheet of listSheets(FILE_TOYOOKA)) {
      if (sheet === '見本' || sheet === 'Sheet1') continue;
      const { bu, district } = splitBuDistrict(sheet);
      if (!bu || !district) continue;
      for (const rec of parseRosterSheet(FILE_TOYOOKA, sheet, '豊岡本部', bu, district)) {
        rec.confirmed = { honbu: true, bu: true, district: true };
        all.set(rec.nameKey, rec);
      }
    }
  }

  // 2. ヤング男子部名簿 (honbu のみ確定)
  if (existsSync(FILE_YOUNG)) {
    for (const sheet of listSheets(FILE_YOUNG)) {
      const honbu = sheet.endsWith('本部') ? sheet : null;
      if (!honbu) continue;
      for (const rec of parseRosterSheet(FILE_YOUNG, sheet, honbu, undefined, undefined)) {
        // 既に統監名簿で確定済みならスキップ (上書きさせない)
        const existing = all.get(rec.nameKey);
        if (existing && existing.confirmed?.honbu) continue;
        rec.confirmed = { honbu: true, bu: false, district: false };
        all.set(rec.nameKey, rec);
      }
    }
  }

  // 3. 牙城会画像由来の override (honbu+bu 確定。district も指定があれば確定)
  for (const o of GAJO_OVERRIDES) {
    const key = normName(o.name);
    const rec = all.get(key) || { name: o.name, nameKey: key, source: '牙城会名簿(image)' };
    rec.honbu = o.honbu;
    rec.bu = o.bu;
    if (o.district) rec.district = o.district;
    rec.confirmed = {
      honbu: true,
      bu: true,
      district: o.district ? true : (rec.confirmed?.district ?? false),
    };
    all.set(key, rec);
  }

  return all;
}

// ── Supabase クライアント ──
function loadEnv() {
  const candidates = [
    join(__dirname, '..', '.env.local'),
    resolve(__dirname, '../../../../houmon-app/.env.local'),
    '/Users/hideyuki/Library/CloudStorage/Dropbox/Work/x_others/practice/Claude Code/houmon-app/.env.local',
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    const env = {};
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
    }
    if (env.NEXT_PUBLIC_SUPABASE_URL && (env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
      console.error(`(env loaded from ${p})`);
      return env;
    }
  }
  throw new Error('.env.local が見つからない、または NEXT_PUBLIC_SUPABASE_URL が無い');
}

async function main() {
  console.log(`■ Excel 取り込み開始 (apply=${APPLY})\n`);

  const excelMap = collectAllExcelRecords();
  console.log(`Excel 行数: ${excelMap.size}`);
  const counts = { both: 0, honbuOnly: 0, gajoOnly: 0 };
  for (const r of excelMap.values()) {
    if (r.confirmed?.bu && r.confirmed?.district) counts.both++;
    else if (r.confirmed?.honbu && !r.confirmed?.bu) counts.honbuOnly++;
    else counts.gajoOnly++;
  }
  console.log(`  (内訳: 統監名簿で全確定=${counts.both}, honbuのみ確定=${counts.honbuOnly}, 牙城会のみ=${counts.gajoOnly})\n`);

  const env = loadEnv();
  // Service role key を優先 (RLS バイパス)。無ければ anon key で公開ポリシー次第。
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const usingService = !!env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, key);
  console.error(`(認証: ${usingService ? 'service role' : 'anon key'})`);

  const { data, error } = await supabase
    .from('members')
    .select('id, name, honbu, bu, district, honbu_inferred, bu_inferred, district_inferred, address, phone, mobile, age, role')
    .order('name');
  if (error) { console.error('DB エラー:', error); process.exit(1); }
  console.log(`DB 行数: ${data.length}\n`);

  const updates = [];
  const unmatched = [];
  for (const dbRow of data) {
    const key = normName(dbRow.name);
    const ex = excelMap.get(key);
    if (!ex) { unmatched.push(dbRow); continue; }

    const patch = {};
    const explain = [];

    // 各 org 列を更新候補にする
    const updateField = (dbCol, dbInferredCol, exVal, isConfirmed) => {
      if (exVal === undefined || exVal === null) return;
      const want = exVal;
      const wantInferred = !isConfirmed;
      if (dbRow[dbCol] !== want) { patch[dbCol] = want; explain.push(`${dbCol}: "${dbRow[dbCol] ?? ''}" → "${want}"`); }
      if ((dbRow[dbInferredCol] ?? false) !== wantInferred) {
        patch[dbInferredCol] = wantInferred;
        explain.push(`${dbInferredCol}: ${dbRow[dbInferredCol] ?? false} → ${wantInferred}`);
      }
    };
    updateField('honbu',    'honbu_inferred',    ex.honbu,    ex.confirmed?.honbu);
    updateField('bu',       'bu_inferred',       ex.bu,       ex.confirmed?.bu);
    updateField('district', 'district_inferred', ex.district, ex.confirmed?.district);

    if (Object.keys(patch).length > 0) updates.push({ id: dbRow.id, name: dbRow.name, patch, explain, source: ex.source });
  }

  console.log(`◆ 差分: ${updates.length} 件 / DB 未マッチ: ${unmatched.length} 件\n`);
  console.log('--- 更新候補 (上位 30 件) ---');
  for (const u of updates.slice(0, 30)) {
    console.log(`\n${u.name} (${u.source})`);
    for (const line of u.explain) console.log(`  ${line}`);
  }
  if (updates.length > 30) console.log(`\n... 残り ${updates.length - 30} 件は --apply 時に処理`);

  console.log('\n--- 未マッチ DB メンバー (上位 20) ---');
  for (const r of unmatched.slice(0, 20)) console.log(`  ${r.name}  honbu=${r.honbu} bu=${r.bu} district=${r.district}`);
  if (unmatched.length > 20) console.log(`  ...残り ${unmatched.length - 20} 名`);

  if (!APPLY) {
    console.log('\n>>> dry-run のみ。--apply で実 DB 反映します。');
    return;
  }

  console.log(`\n■ DB 反映開始: ${updates.length} 件`);
  let ok = 0, ng = 0;
  for (const u of updates) {
    const { error: ue } = await supabase.from('members').update(u.patch).eq('id', u.id);
    if (ue) { ng++; console.error(`NG ${u.name}:`, ue.message); }
    else ok++;
  }
  console.log(`\n■ 完了: 成功 ${ok} / 失敗 ${ng}`);
}

main().catch(e => { console.error(e); process.exit(1); });
