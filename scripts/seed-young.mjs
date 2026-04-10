// ========================================
// ヤング名簿シードスクリプト
// 使い方: cd houmon-app && node scripts/seed-young.mjs
//
// - 住所を 国土地理院(GSI) Address Search API で番地レベルにジオコーディング
//   失敗時は Nominatim (OSM) → 条丁目グリッド推定の順でフォールバック
// - Supabase に upsert 挿入（id は ym-XXX 形式で固定）
// - 既存レコードがあれば更新される
//
// 注: 過去に Nominatim+グリッドで投入された42件の座標は、最大5km
// ズレていたため GSI で再ジオコーディングして DB を直接更新済み
// (2026-04 対応)。以後はこのスクリプトを再実行すれば GSI が使われる。
// ========================================

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env.local を手動で読み込み
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

// ========================================
// データ：画像から起こしたヤング名簿
// honbu = 本部、district = 地区（役職と条数で推測）
// ========================================

/** @typedef {{
 *   id: string;
 *   name: string;
 *   district: string;
 *   honbu: string;
 *   address: string;
 *   phone?: string;
 *   mobile?: string;
 *   birthday?: string;
 *   enrollment_date?: string;
 *   age?: number;
 *   workplace?: string;
 *   role?: string;
 *   education_level?: string;
 *   family?: string;
 *   altar_status?: string;
 *   daily_practice?: string;
 *   newspaper?: string;
 *   financial_contribution?: string;
 *   activity_status?: string;
 *   youth_group?: string;
 *   notes?: string;
 * }} YoungRow */

/** @type {YoungRow[]} */
const YOUNG_MEMBERS = [
  // ── 東栄本部（10名） ──
  // 下山地区：16条〜20条（北側）
  { id: 'ym-toei-01', name: '下山 夢斗', honbu: '東栄本部', district: '下山地区',
    address: '旭川市東光16条5丁目2-12',
    phone: '0166-33-1276', mobile: '080-6068-7270',
    birthday: 'H14.7.27', enrollment_date: 'H14.11.18', age: 23,
    role: '地区リーダー', education_level: '助師', family: '親同居',
    altar_status: 'お形木', daily_practice: '○', newspaper: '家族購読',
    activity_status: '対話実践', notes: '創価大経済部' },
  { id: 'ym-toei-02', name: '塚原 柊', honbu: '東栄本部', district: '下山地区',
    address: '旭川市東光20条5丁目1-12',
    mobile: '080-9614-3565',
    birthday: 'H13.1.20', enrollment_date: 'H13.5.3', age: 25,
    workplace: '土地改良区', family: '単身', altar_status: 'お形木',
    activity_status: '会合参加', youth_group: '新4期G',
    notes: 'マディソン102' },
  { id: 'ym-toei-03', name: '光永 瀬世', honbu: '東栄本部', district: '下山地区',
    address: '旭川市東光15条4丁目',
    birthday: 'H14.12.25', enrollment_date: 'H16.6.16', age: 23,
    family: '親同居', altar_status: 'お形木', newspaper: '家族購読',
    financial_contribution: '未', activity_status: '会える',
    notes: '光生コーポ204号' },

  // 沼畑地区：9〜11条（中央）
  { id: 'ym-toei-04', name: '沼畑 裕一', honbu: '東栄本部', district: '沼畑地区',
    address: '旭川市東光10条3丁目4-8',
    phone: '76-6865', mobile: '080-3291-0931',
    birthday: 'H12.11.22', enrollment_date: 'H13.5.3', age: 26,
    role: '地区リーダー', education_level: '助師', family: '親同居',
    altar_status: 'お形木', daily_practice: '○', newspaper: '家族購読',
    activity_status: '対話実践', notes: '市住5056 / 拓殖大学北海道短期大学' },
  { id: 'ym-toei-05', name: '渡辺 蓮', honbu: '東栄本部', district: '沼畑地区',
    address: '旭川市東光11条5丁目2-20',
    phone: '73-8227',
    birthday: 'H13.4.16', enrollment_date: 'H13.5.3', age: 24 },
  { id: 'ym-toei-06', name: '高橋 一哉', honbu: '東栄本部', district: '沼畑地区',
    address: '旭川市東光9条5丁目3-2',
    phone: '74-9644',
    birthday: 'H9.6.13', enrollment_date: 'H12.1.2', age: 28 },

  // 山本地区：5〜7条＋11条2丁目（南西）
  { id: 'ym-toei-07', name: '山本 悠人', honbu: '東栄本部', district: '山本地区',
    address: '旭川市東光11条2丁目4-1',
    mobile: '090-2691-1657',
    birthday: 'H8.12.11', age: 29,
    role: '地区リーダー', workplace: '医療道具販売',
    notes: 'こまちⅡ203' },
  { id: 'ym-toei-08', name: '曳地 真治', honbu: '東栄本部', district: '山本地区',
    address: '旭川市東光7条3丁目3-15',
    phone: '35-8282',
    birthday: 'H9.3.17', enrollment_date: 'H10.9.15', age: 29,
    education_level: '未教学', family: '親同居',
    altar_status: 'お形木', newspaper: '家族購読',
    activity_status: '会える',
    notes: 'エスティパレス / 父：常勝地区地区部長' },
  { id: 'ym-toei-09', name: '木田 洋一', honbu: '東栄本部', district: '山本地区',
    address: '旭川市東光5条4丁目22',
    mobile: '080-1978-4391',
    birthday: 'H13.12.8', enrollment_date: 'H13.1.2', age: 25,
    notes: 'エスティアルモニー301' },

  // ── 旭創価本部（5名）→ 東川地区 ──
  { id: 'ym-asahi-01', name: '坂本 亮', honbu: '旭創価本部', district: '東川地区',
    address: '上川郡東川町西町1-19-3-13',
    phone: '82-4572', mobile: '080-4044-0936',
    birthday: 'H12.1.26', enrollment_date: 'H12.5.3', age: 26,
    role: '地区リーダー', workplace: 'ツルハドラック',
    education_level: '助師', family: '親同居',
    altar_status: 'お形木', daily_practice: '○', newspaper: '家族購読',
    activity_status: '会合参加', notes: '第2期 男子部大学校生' },
  { id: 'ym-asahi-02', name: '坂本 健', honbu: '旭創価本部', district: '東川地区',
    address: '上川郡東川町西町1-19-3-13',
    phone: '82-4572', mobile: '080-4509-647',
    birthday: 'H13.3.23', enrollment_date: 'H13.11.18', age: 25,
    role: 'NL', workplace: '東川汎用機(株)',
    education_level: '助師', family: '親同居',
    altar_status: 'お形木', daily_practice: '○', newspaper: '家族購読',
    activity_status: '会合参加', notes: '男子部大学校4期生' },
  { id: 'ym-asahi-03', name: '我部山 翼', honbu: '旭創価本部', district: '東川地区',
    address: '上川郡東川町西町9丁目',
    phone: '82-5316', mobile: '090-6873-3534',
    birthday: 'H11.1.7', enrollment_date: 'H12.1.2', age: 27,
    workplace: '介護施設', education_level: '助師', family: '親同居',
    altar_status: 'お形木', daily_practice: '△', newspaper: '家族購読',
    activity_status: '会合参加' },
  { id: 'ym-asahi-04', name: '下田 一輝', honbu: '旭創価本部', district: '東川地区',
    address: '上川郡東川町西町4-5-15',
    phone: '82-5080',
    birthday: 'H12.10.24', enrollment_date: 'H13.5.3', age: 26,
    family: '親同居', altar_status: '（不明）', daily_practice: '△',
    newspaper: '家族購読', activity_status: '会合参加' },
  { id: 'ym-asahi-05', name: '森島 正樹', honbu: '旭創価本部', district: '東川地区',
    address: '上川郡美瑛町旭町3丁目6番2号',
    phone: '92-3763', mobile: '080-6084-0072',
    birthday: 'H8.5.9', enrollment_date: 'H8.11.18', age: 29,
    role: '副地区リーダー', education_level: '青年3級', family: '親同居',
    altar_status: 'お形木', daily_practice: '△', newspaper: 'マイ聖教',
    activity_status: '会合参加', youth_group: '創価班(40期)' },

  // ── 豊岡本部（20〜22名） ──
  // 豊岡北地区：12条以上
  { id: 'ym-toyo-01', name: '三浦 史也', honbu: '豊岡本部', district: '豊岡北地区',
    address: '旭川市豊岡14条5丁目',
    mobile: '080-9005-0428',
    birthday: 'H12.1.5', enrollment_date: 'H12.4.28', age: 26,
    education_level: '助師', notes: 'タウンズ9001-102' },
  { id: 'ym-toyo-02', name: '旗谷 侑磨', honbu: '豊岡本部', district: '豊岡北地区',
    address: '旭川市豊岡13条2丁目3-9',
    birthday: 'H10.8.4', enrollment_date: 'H18.2.16', age: 28,
    notes: 'パインヒルズ豊田102' },
  { id: 'ym-toyo-03', name: '高桑 秀都', honbu: '豊岡本部', district: '豊岡北地区',
    address: '旭川市豊岡13条5丁目1-7',
    birthday: 'H13.11.29', enrollment_date: 'H14.5.3', age: 24,
    notes: 'グランドテラス豊岡301号' },
  { id: 'ym-toyo-04', name: '川口 雄一', honbu: '豊岡本部', district: '豊岡北地区',
    address: '旭川市豊岡15条6丁目',
    phone: '32-0037', mobile: '080-8625-0462',
    birthday: 'H8.8.4', enrollment_date: 'H8.11.18', age: 29,
    role: 'NL', workplace: '健成舎',
    education_level: '青年3級', family: '親同居',
    altar_status: 'お形木', daily_practice: '○', newspaper: '家族購読',
    financial_contribution: '○', activity_status: '会合参加',
    youth_group: 'G', notes: '市住2号棟223 / 大学校6期生' },
  { id: 'ym-toyo-05', name: '川口 史也', honbu: '豊岡本部', district: '豊岡北地区',
    address: '旭川市豊岡15条6丁目',
    phone: '32-0037',
    birthday: 'H12.5.12', enrollment_date: 'H12.12.5', age: 25,
    role: 'NL', education_level: '青年3級', family: '親同居',
    altar_status: 'お形木', daily_practice: '○', newspaper: '家族購読',
    activity_status: '会合参加', youth_group: 'G', notes: '大学校6期生' },
  { id: 'ym-toyo-06', name: '加藤 寿希也', honbu: '豊岡本部', district: '豊岡北地区',
    address: '旭川市豊岡14条6丁目',
    phone: '38-0031',
    birthday: 'H11.10.26', enrollment_date: 'H12.12.5', age: 27 },
  { id: 'ym-toyo-07', name: '加藤 龍我', honbu: '豊岡本部', district: '豊岡北地区',
    address: '旭川市豊岡14条6丁目',
    phone: '38-0031',
    birthday: 'H12.11.6', enrollment_date: 'H22.2.26', age: 25 },
  { id: 'ym-toyo-08', name: '藤崎 勇輝', honbu: '豊岡本部', district: '豊岡北地区',
    address: '旭川市豊岡12条5丁目1-18',
    birthday: 'H9.11.18', enrollment_date: 'H12.1.2', age: 28,
    family: '単身', altar_status: 'お形木', newspaper: '未購読' },

  // 豊岡中央地区：6〜11条
  { id: 'ym-toyo-09', name: '波多 優介', honbu: '豊岡本部', district: '豊岡中央地区',
    address: '旭川市豊岡8条3丁目',
    mobile: '090-2050-7947',
    birthday: 'S61.4.1', enrollment_date: 'H27.1.2', age: 35,
    education_level: '助師', activity_status: '不在',
    notes: 'リオグランデ205 / 実家緑が丘、連絡取れず' },
  { id: 'ym-toyo-10', name: '堂田 雅之', honbu: '豊岡本部', district: '豊岡中央地区',
    address: '旭川市豊岡6条2丁目',
    phone: '0166-56-2314', mobile: '090-6875-4420',
    birthday: 'H10.1.6', enrollment_date: 'H21.5.10', age: 28,
    role: '副地区リーダー', education_level: '青年3級', family: '親同居',
    altar_status: 'お形木', daily_practice: '○', newspaper: '家族購読',
    activity_status: '対話実践', youth_group: '牙' },
  { id: 'ym-toyo-11', name: '遊佐 悠喜', honbu: '豊岡本部', district: '豊岡中央地区',
    address: '旭川市豊岡6条3丁目2-15',
    birthday: 'H9.6.17', enrollment_date: 'H9.9.20', age: 28,
    workplace: '引っ越しのサカイ アルバイト', family: '親同居',
    activity_status: '会える', notes: '会合参加まれに。家族未活動' },
  { id: 'ym-toyo-12', name: '千葉 健太', honbu: '豊岡本部', district: '豊岡中央地区',
    address: '旭川市豊岡8条3丁目5-8',
    mobile: '090-7646-0630',
    birthday: 'H11.10.25', enrollment_date: 'H17.4.24', age: 26 },
  { id: 'ym-toyo-13', name: '朝日 涼太', honbu: '豊岡本部', district: '豊岡中央地区',
    address: '旭川市豊岡6条2丁目3-20',
    birthday: 'H13.1.21', enrollment_date: 'H27.9.11', age: 25 },
  { id: 'ym-toyo-14', name: '柳嶋 隼', honbu: '豊岡本部', district: '豊岡中央地区',
    address: '旭川市豊岡6条2丁目4-17',
    age: 22, workplace: '水道局',
    notes: 'メゾンシカ101号 / 仕事で21時ぐらい、土日休み' },
  { id: 'ym-toyo-15', name: '堀内 希夢', honbu: '豊岡本部', district: '豊岡中央地区',
    address: '旭川市豊岡8条4丁目4-11',
    phone: '56-3620',
    birthday: 'H12.5.16', enrollment_date: 'H12.12.17', age: 25 },
  { id: 'ym-toyo-16', name: '飛騨野 広樹', honbu: '豊岡本部', district: '豊岡中央地区',
    address: '旭川市豊岡7条4丁目3-20',
    phone: '33-0260',
    birthday: 'H13.4.6', enrollment_date: 'H15.8.24', age: 26 },

  // 豊岡南地区：1〜5条
  { id: 'ym-toyo-17', name: '戸坂 教彦', honbu: '豊岡本部', district: '豊岡南地区',
    address: '旭川市豊岡2条2丁目',
    phone: '35-3726',
    birthday: 'H12.12.27', enrollment_date: 'H13.5.3', age: 25,
    notes: '第3桜井ハイツE' },
  { id: 'ym-toyo-18', name: '川合 開也', honbu: '豊岡本部', district: '豊岡南地区',
    address: '旭川市豊岡2条2丁目2-10',
    phone: '35-9917',
    birthday: 'H12.1.18', enrollment_date: 'H16.11.23', age: 26 },
  { id: 'ym-toyo-19', name: '塚本 拓実', honbu: '豊岡本部', district: '豊岡南地区',
    address: '旭川市豊岡2条4丁目3-8',
    phone: '0166-34-1724',
    birthday: 'H8.12.5', enrollment_date: 'H9.1.1', age: 29,
    family: '親同居', notes: '第5豊岡マンション2F3号' },
  { id: 'ym-toyo-20', name: '武田 拓実', honbu: '豊岡本部', district: '豊岡南地区',
    address: '旭川市豊岡2条4丁目3-8',
    phone: '0166-34-1724',
    birthday: 'H8.12.5', enrollment_date: 'H9.3.23', age: 29,
    family: '親同居', notes: '第5豊岡マンション2F5号 / 姉も同居？' },
  { id: 'ym-toyo-21', name: '佐藤 省吾', honbu: '豊岡本部', district: '豊岡南地区',
    address: '旭川市豊岡2条5丁目4-16',
    birthday: 'H8.12.16', enrollment_date: 'H15.10.19', age: 29,
    workplace: 'きたのまち（清掃）', education_level: '未教学',
    family: '親同居', altar_status: 'お形木', newspaper: '未購読',
    financial_contribution: '未', activity_status: '会えない',
    notes: 'ファンネル102号 / 訪問拒否ではないが、父母からインターホンの際お断りを受ける' },
  { id: 'ym-toyo-22', name: '盛岡 竜馬', honbu: '豊岡本部', district: '豊岡南地区',
    address: '旭川市豊岡4条5丁目11-9',
    mobile: '090-9436-0604',
    birthday: 'H8.11.8', enrollment_date: 'H16.4.23', age: 29,
    workplace: 'エア・ウォーター営業', family: '単身',
    altar_status: 'お形木', newspaper: 'マイ聖教',
    activity_status: '会合参加', youth_group: 'S4期',
    notes: 'YOUトピアA棟205 / 土日は札幌に帰ってる' },

  // ── 東旭川本部（実在5名→画像では6名） ──
  { id: 'ym-hga-01', name: '中澤 孝一', honbu: '東旭川本部', district: '東旭川地区',
    address: '旭川市東旭川北1条5丁目3-26',
    birthday: 'H13.12.10', enrollment_date: 'H14.3.16', age: 24,
    family: '親同居', altar_status: 'お形木' },
  { id: 'ym-hga-02', name: '田中 翔', honbu: '東旭川本部', district: '東旭川地区',
    address: '旭川市東旭川北2条6丁目5-18',
    phone: '64-6456',
    birthday: 'H9.5.13', enrollment_date: 'H25.3.9', age: 28,
    activity_status: '不在', notes: '札幌在住？' },
  { id: 'ym-hga-03', name: '永田 駿吾', honbu: '東旭川本部', district: '東旭川地区',
    address: '旭川市豊岡5条7丁目1-10',
    phone: '32-9727',
    birthday: 'H10.1.28', enrollment_date: 'H10.11.18', age: 28,
    family: '【不在】', activity_status: '不在',
    notes: '海上自衛隊、横須賀基地勤務' },
  { id: 'ym-hga-04', name: '菅原 遥斗', honbu: '東旭川本部', district: '東旭川地区',
    address: '旭川市豊岡12条7丁目6-22',
    phone: '35-3528',
    birthday: 'H13.4.2', enrollment_date: 'H14.3.24', age: 25,
    notes: '個人カード' },
  { id: 'ym-hga-05', name: '伊藤 直樹', honbu: '東旭川本部', district: '東旭川地区',
    address: '旭川市東光6条8丁目',
    mobile: '080-3260-1480',
    birthday: 'H10.6.12', enrollment_date: 'H16.11.10', age: 27 },
  { id: 'ym-hga-06', name: '山田 孝一', honbu: '東旭川本部', district: '東旭川地区',
    address: '旭川市東光6条6丁目2',
    phone: '35-2248',
    birthday: 'H10.4.18', enrollment_date: 'H10.8.24', age: 27,
    workplace: '荒井建設', family: '親同居',
    altar_status: 'お形木', newspaper: '家族購読',
    activity_status: '会える',
    notes: '父、地区部長。土日帰ってきているが家にいない。' },
];

// ========================================
// ジオコーディング
// ========================================

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * 住所を緯度経度に変換。
 *  1) 国土地理院 Address Search API（番地レベルまで対応）
 *     - 元住所でヒットしなければ末尾を段階的に削ってリトライ
 *  2) Nominatim (OpenStreetMap)
 *  3) 条丁目グリッド推定（最終フォールバック）
 */
async function geocode(address, hint) {
  // 1) GSI を順に試す（クエリのバリアント）
  const variants = buildGsiQueries(address);
  for (const q of variants) {
    const hit = await gsiGeocode(q);
    if (hit) return { ...hit, source: `gsi:${q === address ? 'full' : 'trim'}` };
    await sleep(120); // GSI に優しく
  }

  // 2) Nominatim フォールバック
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=jp&accept-language=ja&q=${encodeURIComponent(address)}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'houmon-app-seed/1.0 (dev)' },
    });
    if (res.ok) {
      const arr = await res.json();
      if (arr && arr.length > 0) {
        return { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon), source: 'nominatim' };
      }
    }
  } catch (e) {
    console.error(`  nominatim error for ${address}:`, e.message);
  }

  // 3) 最終フォールバック：条丁目グリッド推定
  return estimateByGrid(address, hint);
}

/**
 * 国土地理院 Address Search API 呼び出し。
 * 返り値: { lat, lng } または null
 * doc: https://msearch.gsi.go.jp/address-search/AddressSearch?q=...
 */
async function gsiGeocode(q) {
  const url = `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const c = arr[0]?.geometry?.coordinates;
    if (!Array.isArray(c) || c.length < 2) return null;
    // GSI は [lng, lat] の順で返す
    return { lat: c[1], lng: c[0] };
  } catch (e) {
    console.error(`  gsi error for ${q}:`, e.message);
    return null;
  }
}

/**
 * GSI 用クエリのバリエーションを段階的に作る。
 * 番地や号まで含めても当たらないことがあるので、徐々に粗くしていく。
 */
function buildGsiQueries(address) {
  const set = new Set();
  set.add(address);

  // 「X号」以降を落とす
  if (address.includes('号')) {
    set.add(address.split('号')[0]);
  }

  // 末尾の「-数字」を1段階ずつ落とす
  let cur = address;
  for (let i = 0; i < 3; i++) {
    const m = cur.match(/^(.*)[-－]\d+$/);
    if (!m) break;
    cur = m[1];
    set.add(cur);
  }

  // 「N条M丁目」までで切る
  const m1 = address.match(/^(.*?\d+条\d+丁目)/);
  if (m1) set.add(m1[1]);

  // 「○○町…N丁目」までで切る
  const m2 = address.match(/^(.*?町[^\d]*\d+丁目)/);
  if (m2) set.add(m2[1]);

  return Array.from(set);
}

// 旭川市の条丁目グリッド推定（ざっくり）
function estimateByGrid(address, hint) {
  // エリアごとのベース座標（概算）
  const BASES = {
    '東光':     { lat: 43.770, lng: 142.430 },
    '豊岡':     { lat: 43.766, lng: 142.395 },
    '東旭川北': { lat: 43.780, lng: 142.475 },
    '東川町':   { lat: 43.722, lng: 142.528 },
    '美瑛町':   { lat: 43.587, lng: 142.465 },
  };
  // 最初にマッチしたエリアを使う
  let base = { lat: 43.766, lng: 142.404 };
  for (const [name, coord] of Object.entries(BASES)) {
    if (address.includes(name)) { base = coord; break; }
  }
  // 条（南北）と丁目（東西）
  const m = address.match(/(\d+)条(\d+)丁目/);
  if (m) {
    const jou = parseInt(m[1], 10);
    const chome = parseInt(m[2], 10);
    // 1条 = 約 0.0009 lat, 1丁目 = 約 0.0011 lng（概算）
    return {
      lat: base.lat + (jou - 8) * 0.0009,
      lng: base.lng + (chome - 5) * 0.0011,
      source: 'grid',
    };
  }
  return { lat: base.lat, lng: base.lng, source: 'base' };
}

// ========================================
// メイン処理
// ========================================

async function main() {
  console.log(`🌱 ヤング名簿シード開始: ${YOUNG_MEMBERS.length} 名`);

  const results = [];
  for (let i = 0; i < YOUNG_MEMBERS.length; i++) {
    const m = YOUNG_MEMBERS[i];
    process.stdout.write(`[${i + 1}/${YOUNG_MEMBERS.length}] ${m.name} (${m.honbu}/${m.district}) … `);
    const coord = await geocode(m.address, m.honbu);
    console.log(`${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)} (${coord.source})`);
    results.push({ ...m, lat: coord.lat, lng: coord.lng });
    // Nominatim まで落ちた場合のみ 1秒以上空ける（規約）
    if (coord.source === 'nominatim') await sleep(1100);
  }

  console.log('\n💾 Supabase に upsert 中 …');
  const now = new Date().toISOString();
  const rows = results.map(r => ({
    id: r.id,
    name: r.name,
    name_kana: null,
    district: r.district,
    address: r.address,
    lat: r.lat,
    lng: r.lng,
    phone: r.phone ?? null,
    mobile: r.mobile ?? null,
    birthday: r.birthday ?? null,
    enrollment_date: r.enrollment_date ?? null,
    age: r.age ?? null,
    workplace: r.workplace ?? null,
    role: r.role ?? null,
    education_level: r.education_level ?? null,
    family: r.family ?? null,
    altar_status: r.altar_status ?? null,
    daily_practice: r.daily_practice ?? null,
    newspaper: r.newspaper ?? null,
    financial_contribution: r.financial_contribution ?? null,
    activity_status: r.activity_status ?? null,
    youth_group: r.youth_group ?? null,
    notes: r.notes ?? null,
    visit_cycle_days: 30,
    category: 'young',
    honbu: r.honbu,
    created_at: now,
    updated_at: now,
  }));

  const { error } = await supabase
    .from('members')
    .upsert(rows, { onConflict: 'id' });
  if (error) {
    console.error('❌ upsert 失敗:', error);
    process.exit(1);
  }
  console.log(`✅ ${rows.length} 件 upsert 完了`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
