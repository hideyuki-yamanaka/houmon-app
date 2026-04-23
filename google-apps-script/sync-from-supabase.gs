/**
 * =============================================================
 * houmon-app Supabase → Google Sheets 自動同期 (GAS)
 * =============================================================
 *
 * 2つのレイアウトが選べる:
 *   1.【表形式】全件を1枚のシートに一覧表示 … syncAll()
 *   2.【プロフィール形式】人ごとにA4 1ページ使う … buildProfileSheets()
 *      - 本部(エリア)ごとにタブが分かれる
 *      - 1人あたり46行 = A4縦1ページに収まる設計
 *      - 坂本さんヒアリング情報も大きく表示
 *
 * 使い方:
 *   - 上部メニュー「houmon-app」から該当のメニューを選ぶ
 *   - まず「サンプル: 東栄本部だけ作成」でレイアウト確認
 *   - OKなら「全本部のプロフィール作成」で本番実行
 * =============================================================
 */

// ───────── 設定(ここだけ編集) ─────────
const SUPABASE_URL = 'https://zzkhmocwscuyydyzqpof.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fdMTZaUmwQ9Aj4GMiD3y_A_zs4oLJtV';

const TABLES = [
  { table: 'members', sheet: 'メンバー', orderBy: 'district.asc,name.asc' },
  { table: 'visits',  sheet: '訪問ログ', orderBy: 'visited_at.desc' },
];

// プロフィールカード方式で使う設定
const PROFILE_COLS = 6;           // A〜F の6列レイアウト
const PROFILE_ROWS_PER_PERSON = 46; // 1人あたり固定46行(A4縦1枚)
const SAMPLE_HONBU = '東栄本部';   // サンプル実行時の対象本部
// ────────────────────────────────────


function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('houmon-app')
    .addItem('🌟 サンプル: 東栄本部だけプロフィール作成', 'buildSampleProfileSheet')
    .addItem('📋 全本部のプロフィール作成', 'buildProfileSheets')
    .addSeparator()
    .addItem('📊 表形式で全件同期(従来版)', 'syncAll')
    .addSeparator()
    .addItem('⏰ 30分おき自動同期をON', 'installTrigger')
    .addItem('⏹ 自動同期をOFF', 'removeTriggers')
    .addToUi();
}


// ════════════════════════════════════════════════════════
//  プロフィールカード方式(人ごとに1ページ)
// ════════════════════════════════════════════════════════

/**
 * サンプル実行: 東栄本部だけプロフィールシートを作る
 * ↑これでレイアウトOKか確認してから buildProfileSheets() を叩く想定
 */
function buildSampleProfileSheet() {
  const startedAt = new Date();
  const members = fetchAll_('members', 'district.asc,name.asc');
  const visits  = fetchAll_('visits',  'visited_at.desc');

  const targetMembers = members.filter((m) => m.honbu === SAMPLE_HONBU);
  if (targetMembers.length === 0) {
    SpreadsheetApp.getUi().alert(`「${SAMPLE_HONBU}」のメンバーが見つからへんかった。本部名が合ってるか確認して!`);
    return;
  }

  const sheetName = `【サンプル】${SAMPLE_HONBU}`;
  const sheet = recreateSheet_(sheetName);
  renderProfileSheet_(sheet, targetMembers, visits);

  writeLastSyncedAt_(startedAt);
  SpreadsheetApp.getUi().alert(
    `サンプル完成!\n「${sheetName}」タブを開いて確認してな。\n\n` +
    `【確認ポイント】\n` +
    `・ファイル > 印刷 で A4縦プレビューしてみる\n` +
    `・1人分のカードが1ページに収まってるか\n` +
    `・見づらい部分あったら教えて`
  );
}

/**
 * 本番実行: 全本部分のプロフィールシートを作る
 * 本部ごとにタブが分かれる
 */
function buildProfileSheets() {
  const startedAt = new Date();
  const members = fetchAll_('members', 'district.asc,name.asc');
  const visits  = fetchAll_('visits',  'visited_at.desc');

  // 本部(honbu)でグルーピング
  const byHonbu = {};
  for (const m of members) {
    const key = m.honbu || '(本部未設定)';
    if (!byHonbu[key]) byHonbu[key] = [];
    byHonbu[key].push(m);
  }

  // 本部ごとにシート作成
  const honbuKeys = Object.keys(byHonbu).sort();
  for (const honbu of honbuKeys) {
    const sheet = recreateSheet_(honbu);
    renderProfileSheet_(sheet, byHonbu[honbu], visits);
  }

  writeLastSyncedAt_(startedAt);
  SpreadsheetApp.getUi().alert(
    `全本部のプロフィール作成完了!\n本部ごとにタブができてるで。\n\n` +
    `作成した本部: ${honbuKeys.join(' / ')}`
  );
}


/**
 * 指定メンバーのプロフィールを1枚のシートに並べて描画する。
 * 1人あたり PROFILE_ROWS_PER_PERSON 行でページ区切り済みになる。
 */
function renderProfileSheet_(sheet, members, allVisits) {
  // バンディング剥がし & クリーンアップ
  for (const b of sheet.getBandings()) b.remove();
  sheet.clear();
  sheet.showColumns(1, sheet.getMaxColumns());

  // 列幅を A4 縦に収まるように設定(合計 ≒ 690px)
  const colWidths = [90, 140, 90, 140, 90, 140];
  for (let i = 0; i < PROFILE_COLS; i++) {
    sheet.setColumnWidth(i + 1, colWidths[i]);
  }

  // 地区(district) でソート → ダブりエリアが固まる
  const sorted = members.slice().sort((a, b) => {
    const ak = `${a.district || ''}_${a.name_kana || ''}`;
    const bk = `${b.district || ''}_${b.name_kana || ''}`;
    return ak.localeCompare(bk, 'ja');
  });

  let currentRow = 1;
  for (const m of sorted) {
    const memberVisits = allVisits.filter((v) => v.member_id === m.id);
    renderOneMember_(sheet, currentRow, m, memberVisits);
    currentRow += PROFILE_ROWS_PER_PERSON;
  }

  // 最後に余計な列(G列以降)を隠す
  if (sheet.getMaxColumns() > PROFILE_COLS) {
    sheet.hideColumns(PROFILE_COLS + 1, sheet.getMaxColumns() - PROFILE_COLS);
  }
}


/**
 * 1人分のプロフィールカードを指定の行から描画する。
 * 必ず PROFILE_ROWS_PER_PERSON 行(= 46行)を使い切るように調整する。
 *
 * レイアウト(行番号は startRow からの相対):
 *   0      : 氏名ヘッダー(黒背景白文字)
 *   1      : 本部/地区/役職
 *   2      : 空行
 *   3      : ■ 基本情報 セクション見出し
 *   4-10   : 基本情報の各行(住所/電話/職場/家族/誕生日/入会日/備考)
 *   11     : 空行
 *   12     : ■ ヒアリング情報 セクション見出し
 *   13-28  : info 本文(16行分、折り返し)
 *   29     : 空行
 *   30     : ■ 訪問ログ セクション見出し
 *   31     : 訪問ログのヘッダー行
 *   32-44  : 訪問ログ本文(最大13件)
 *   45     : ページ区切り(太線)
 */
function renderOneMember_(sheet, startRow, m, visits) {
  let r = startRow;

  // ─── 0: 氏名ヘッダー ───
  const nameLine = `${m.name || ''}  ${m.name_kana ? '(' + m.name_kana + ')' : ''}  ${m.age != null ? m.age + '歳' : ''}`;
  sheet.getRange(r, 1, 1, PROFILE_COLS).merge()
    .setValue(nameLine)
    .setFontFamily('Noto Sans JP')
    .setFontSize(18)
    .setFontWeight('bold')
    .setBackground('#1F2937')
    .setFontColor('#FFFFFF')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(r, 38);
  r++;

  // ─── 1: 本部/地区/役職 ───
  const subLine = [
    m.honbu ? `本部: ${m.honbu}` : '',
    m.district ? `地区: ${m.district}` : '',
    m.role ? `役職: ${m.role}` : '',
  ].filter(Boolean).join('  /  ');
  sheet.getRange(r, 1, 1, PROFILE_COLS).merge()
    .setValue(subLine)
    .setFontFamily('Noto Sans JP')
    .setFontSize(10)
    .setBackground('#F3F4F6')
    .setHorizontalAlignment('center');
  sheet.setRowHeight(r, 22);
  r++;

  // ─── 2: 空行 ───
  sheet.setRowHeight(r, 8);
  r++;

  // ─── 3: 基本情報 見出し ───
  sheet.getRange(r, 1, 1, PROFILE_COLS).merge()
    .setValue('■ 基本情報')
    .setFontFamily('Noto Sans JP')
    .setFontSize(11)
    .setFontWeight('bold')
    .setBackground('#DBEAFE')
    .setHorizontalAlignment('left');
  sheet.setRowHeight(r, 20);
  r++;

  // ─── 4-10: 基本情報 中身 ───
  // 住所(フル幅)
  putLabeledFull_(sheet, r, '住所', m.address || '');
  r++;
  // 自宅電話 / 携帯
  putLabeledPair_(sheet, r, '自宅TEL', m.phone || '', '携帯', m.mobile || '');
  r++;
  // 職場 / 家族
  putLabeledPair_(sheet, r, '職場', m.workplace || '', '家族', m.family || '');
  r++;
  // 誕生日 / 入会日
  putLabeledPair_(sheet, r, '誕生日', formatDate_(m.birthday), '入会日', formatDate_(m.enrollment_date));
  r++;
  // 唱題/仏壇/聖教
  const practice = [
    m.daily_practice ? `唱題: ${m.daily_practice}` : '',
    m.altar_status ? `仏壇: ${m.altar_status}` : '',
    m.newspaper ? `聖教: ${m.newspaper}` : '',
    m.financial_contribution ? `財務: ${m.financial_contribution}` : '',
  ].filter(Boolean).join('  /  ');
  putLabeledFull_(sheet, r, '信心関連', practice || '(未記入)');
  r++;
  // 備考(notes) 2行分
  putLabeledFull_(sheet, r, '備考', m.notes || '');
  sheet.getRange(r, 2, 1, 5).setWrap(true);
  sheet.setRowHeight(r, 36);
  r++;
  // 活動状況
  putLabeledFull_(sheet, r, '活動状況', m.activity_status || '(未記入)');
  r++;

  // ─── 11: 空行 ───
  sheet.setRowHeight(r, 8);
  r++;

  // ─── 12: ヒアリング情報 見出し ───
  sheet.getRange(r, 1, 1, PROFILE_COLS).merge()
    .setValue('■ ヒアリング情報(坂本さん聞き取り)')
    .setFontFamily('Noto Sans JP')
    .setFontSize(11)
    .setFontWeight('bold')
    .setBackground('#FEF3C7')
    .setHorizontalAlignment('left');
  sheet.setRowHeight(r, 20);
  r++;

  // ─── 13-28: info 本文(16行分を1セルに) ───
  const infoRange = sheet.getRange(r, 1, 16, PROFILE_COLS);
  infoRange.merge()
    .setValue(m.info || '(ヒアリング情報なし)')
    .setFontFamily('Noto Sans JP')
    .setFontSize(10)
    .setWrap(true)
    .setVerticalAlignment('top')
    .setHorizontalAlignment('left')
    .setBackground('#FFFBEB')
    .setBorder(true, true, true, true, false, false, '#D1D5DB', SpreadsheetApp.BorderStyle.SOLID);
  // info行は少し詰めて表示
  for (let i = 0; i < 16; i++) sheet.setRowHeight(r + i, 18);
  r += 16;

  // ─── 29: 空行 ───
  sheet.setRowHeight(r, 8);
  r++;

  // ─── 30: 訪問ログ 見出し ───
  sheet.getRange(r, 1, 1, PROFILE_COLS).merge()
    .setValue(`■ 訪問ログ (全${visits.length}件)`)
    .setFontFamily('Noto Sans JP')
    .setFontSize(11)
    .setFontWeight('bold')
    .setBackground('#D1FAE5')
    .setHorizontalAlignment('left');
  sheet.setRowHeight(r, 20);
  r++;

  // ─── 31: 訪問ログ ヘッダー行 ───
  const vHeaderRow = r;
  sheet.getRange(r, 1).setValue('日付');
  sheet.getRange(r, 2).setValue('応対');
  sheet.getRange(r, 3).setValue('状態');
  sheet.getRange(r, 4, 1, 3).merge().setValue('内容・要約');
  sheet.getRange(r, 1, 1, PROFILE_COLS)
    .setFontFamily('Noto Sans JP')
    .setFontSize(9)
    .setFontWeight('bold')
    .setBackground('#F3F4F6')
    .setHorizontalAlignment('center');
  sheet.setRowHeight(r, 20);
  r++;

  // ─── 32-44: 訪問ログ 中身(最大13件) ───
  const MAX_VISITS = 13;
  const shown = visits.slice(0, MAX_VISITS);
  for (let i = 0; i < MAX_VISITS; i++) {
    const v = shown[i];
    if (v) {
      sheet.getRange(r, 1).setValue(formatDate_(v.visited_at));
      sheet.getRange(r, 2).setValue(v.respondent || '');
      sheet.getRange(r, 3).setValue(v.status || '');
      sheet.getRange(r, 4, 1, 3).merge().setValue(v.summary || '').setWrap(true);
      sheet.getRange(r, 1, 1, PROFILE_COLS)
        .setFontFamily('Noto Sans JP')
        .setFontSize(9)
        .setVerticalAlignment('top');
    } else if (i === 0) {
      // 訪問ログゼロのとき一言だけ入れる
      sheet.getRange(r, 1, 1, PROFILE_COLS).merge()
        .setValue('(まだ訪問記録なし)')
        .setFontFamily('Noto Sans JP')
        .setFontSize(9)
        .setFontColor('#9CA3AF')
        .setHorizontalAlignment('center');
    }
    sheet.setRowHeight(r, 18);
    r++;
  }

  // ─── 45: ページ区切り(太線) ───
  sheet.getRange(r, 1, 1, PROFILE_COLS).merge()
    .setBorder(null, null, true, null, null, null, '#111827', SpreadsheetApp.BorderStyle.SOLID_THICK);
  sheet.setRowHeight(r, 6);

  // 全体に薄い罫線
  sheet.getRange(startRow, 1, PROFILE_ROWS_PER_PERSON, PROFILE_COLS)
    .setBorder(true, true, true, true, false, false, '#9CA3AF', SpreadsheetApp.BorderStyle.SOLID);
}


/**
 * 1行のうち左ラベル(A列) + 残り全部(B〜F列結合)のパターン。
 */
function putLabeledFull_(sheet, r, label, value) {
  sheet.getRange(r, 1).setValue(label)
    .setFontFamily('Noto Sans JP').setFontSize(9).setFontWeight('bold')
    .setBackground('#F9FAFB').setVerticalAlignment('top');
  sheet.getRange(r, 2, 1, 5).merge().setValue(value)
    .setFontFamily('Noto Sans JP').setFontSize(10)
    .setVerticalAlignment('top').setWrap(true);
  sheet.setRowHeight(r, 22);
}


/**
 * 1行に左右ペアで項目を並べるパターン。
 *   A: label1, B-C: value1 (merged), D: label2, E-F: value2 (merged)
 */
function putLabeledPair_(sheet, r, label1, value1, label2, value2) {
  sheet.getRange(r, 1).setValue(label1)
    .setFontFamily('Noto Sans JP').setFontSize(9).setFontWeight('bold')
    .setBackground('#F9FAFB');
  sheet.getRange(r, 2, 1, 2).merge().setValue(value1)
    .setFontFamily('Noto Sans JP').setFontSize(10);
  sheet.getRange(r, 4).setValue(label2)
    .setFontFamily('Noto Sans JP').setFontSize(9).setFontWeight('bold')
    .setBackground('#F9FAFB');
  sheet.getRange(r, 5, 1, 2).merge().setValue(value2)
    .setFontFamily('Noto Sans JP').setFontSize(10);
  sheet.setRowHeight(r, 22);
}


function formatDate_(v) {
  if (!v) return '';
  const s = String(v);
  // ISO 日付や timestamp の先頭10文字だけ拾う
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}


function recreateSheet_(name) {
  const ss = SpreadsheetApp.getActive();
  const existing = ss.getSheetByName(name);
  if (existing) ss.deleteSheet(existing);
  return ss.insertSheet(name);
}


// ════════════════════════════════════════════════════════
//  表形式(従来版) — バックアップ用に残してある
// ════════════════════════════════════════════════════════

function syncAll() {
  const startedAt = new Date();
  for (const t of TABLES) {
    syncTable_(t.table, t.sheet, t.orderBy);
  }
  writeLastSyncedAt_(startedAt);
  Logger.log('[syncAll] done in %dms', new Date() - startedAt);
}


function syncTable_(table, sheetName, orderBy) {
  const rows = fetchAll_(table, orderBy);
  const sheet = getOrCreateSheet_(sheetName);

  for (const b of sheet.getBandings()) b.remove();
  sheet.clear();
  sheet.showColumns(1, sheet.getMaxColumns());

  if (rows.length === 0) {
    sheet.getRange(1, 1).setValue('(データなし)');
    return;
  }

  const preferred = getPreferredColumns_(table);
  const allKeys = Object.keys(rows[0]);
  const headers = [
    ...preferred.filter((k) => allKeys.includes(k)),
    ...allKeys.filter((k) => !preferred.includes(k)),
  ];

  const values = [
    headers,
    ...rows.map((row) =>
      headers.map((h) => {
        const v = row[h];
        if (v === null || v === undefined) return '';
        if (typeof v === 'object') return JSON.stringify(v);
        return v;
      })
    ),
  ];

  const numRows = values.length;
  const numCols = headers.length;

  sheet.getRange(1, 1, numRows, numCols).setValues(values);
  formatForPrint_(sheet, table, headers, numRows, numCols);
}


function formatForPrint_(sheet, table, headers, numRows, numCols) {
  sheet.getRange(1, 1, numRows, numCols)
    .setFontFamily('Noto Sans JP')
    .setFontSize(9)
    .setVerticalAlignment('top');

  sheet.getRange(1, 1, 1, numCols)
    .setFontWeight('bold')
    .setFontSize(10)
    .setFontColor('#FFFFFF')
    .setBackground('#1F2937')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 32);

  sheet.setFrozenRows(1);

  if (numRows > 1) {
    sheet.getRange(2, 1, numRows - 1, numCols)
      .applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);
  }

  sheet.getRange(1, 1, numRows, numCols)
    .setBorder(true, true, true, true, true, true, '#D1D5DB', SpreadsheetApp.BorderStyle.SOLID);

  for (let i = 0; i < headers.length; i++) {
    const width = getColumnWidth_(headers[i]);
    if (width) sheet.setColumnWidth(i + 1, width);
  }

  const wrapCols = ['info', 'notes', 'address', 'workplace', 'summary', 'family'];
  for (const h of wrapCols) {
    const idx = headers.indexOf(h);
    if (idx >= 0) {
      sheet.getRange(2, idx + 1, Math.max(1, numRows - 1), 1).setWrap(true);
    }
  }

  const hideList = getHideColumns_(table);
  for (const h of hideList) {
    const idx = headers.indexOf(h);
    if (idx >= 0) sheet.hideColumns(idx + 1);
  }
}


function getPreferredColumns_(table) {
  if (table === 'members') {
    return [
      'name', 'name_kana', 'age', 'honbu', 'district', 'role',
      'phone', 'mobile', 'address',
      'info', 'notes',
      'birthday', 'enrollment_date', 'workplace', 'family',
      'education_level', 'altar_status', 'daily_practice',
      'newspaper', 'financial_contribution', 'activity_status', 'youth_group',
    ];
  }
  if (table === 'visits') {
    return ['visited_at', 'member_id', 'status', 'respondent', 'summary'];
  }
  return [];
}


function getHideColumns_(table) {
  if (table === 'members') {
    return ['id', 'lat', 'lng', 'category', 'visit_cycle_days', 'created_at', 'updated_at'];
  }
  if (table === 'visits') {
    return ['id', 'notes', 'keywords', 'images', 'deleted_at', 'created_at', 'updated_at'];
  }
  return [];
}


function getColumnWidth_(header) {
  const widths = {
    name: 100, name_kana: 90, age: 45, honbu: 80, district: 120, role: 90,
    phone: 110, mobile: 110, address: 200,
    info: 350, notes: 180,
    birthday: 85, enrollment_date: 85, workplace: 140, family: 80,
    education_level: 80, altar_status: 70, daily_practice: 70,
    newspaper: 70, financial_contribution: 80, activity_status: 80, youth_group: 80,
    visited_at: 95, member_id: 100, status: 80, respondent: 80, summary: 280,
  };
  return widths[header];
}


// ════════════════════════════════════════════════════════
//  共通ユーティリティ
// ════════════════════════════════════════════════════════

function fetchAll_(table, orderBy) {
  const PAGE = 1000;
  let offset = 0;
  const out = [];
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&order=${orderBy}&limit=${PAGE}&offset=${offset}`;
    const res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      muteHttpExceptions: true,
    });
    const code = res.getResponseCode();
    if (code !== 200) {
      throw new Error(`Supabase ${table} fetch failed: ${code} ${res.getContentText()}`);
    }
    const chunk = JSON.parse(res.getContentText());
    out.push(...chunk);
    if (chunk.length < PAGE) break;
    offset += PAGE;
  }
  return out;
}


function getOrCreateSheet_(name) {
  const ss = SpreadsheetApp.getActive();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}


function writeLastSyncedAt_(date) {
  const sheet = getOrCreateSheet_('最終同期');
  sheet.clear();
  sheet.getRange(1, 1, 2, 2).setValues([
    ['最終同期', Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss')],
    ['タイムゾーン', 'Asia/Tokyo (JST)'],
  ]);
  sheet.getRange(1, 1, 2, 1).setFontWeight('bold');
  sheet.setColumnWidth(1, 120);
  sheet.setColumnWidth(2, 220);
}


function installTrigger() {
  removeTriggers();
  ScriptApp.newTrigger('syncAll')
    .timeBased()
    .everyMinutes(30)
    .create();
  SpreadsheetApp.getUi().alert('30分おきの自動同期をONにしたで!');
}


function removeTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const t of triggers) {
    if (t.getHandlerFunction() === 'syncAll') ScriptApp.deleteTrigger(t);
  }
}
