/**
 * =============================================================
 * houmon-app Supabase → Google Sheets 自動同期 (GAS)
 * =============================================================
 *
 * 仕組み:
 *   - Supabase REST API で members / visits を全件取得
 *   - 対応する Sheet にまるごと上書き(シートが無ければ自動作成)
 *   - 30分おきにトリガーで自動実行(セットアップ手順は README 参照)
 *
 * セキュリティ:
 *   - 匿名キーは「公開前提」の anon key。Supabase のRLSポリシーに守られてる。
 *   - ただしこの Sheet 自体を「リンク共有」で公開する場合、中身は
 *     メンバーの個人情報の塊なので共有範囲は慎重に。
 *
 * 運用メモ:
 *   - メンバー編集は houmon-app 側で。Sheets 側は読み取りビュー。
 *   - Sheets に手書きした内容は次回の同期で上書きされる(メモは別シートに書こう)。
 * =============================================================
 */

// ───────── 設定(ここだけ編集) ─────────
const SUPABASE_URL = 'https://zzkhmocwscuyydyzqpof.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fdMTZaUmwQ9Aj4GMiD3y_A_zs4oLJtV';

// どのテーブルをどのシート名にマップするか
const TABLES = [
  { table: 'members', sheet: 'メンバー', orderBy: 'district.asc,name.asc' },
  { table: 'visits',  sheet: '訪問ログ', orderBy: 'visited_at.desc' },
];
// ────────────────────────────────────


/**
 * メニュー「houmon-app」を Sheets UI に追加。
 * 初回開いたときに自動で呼ばれる。
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('houmon-app')
    .addItem('今すぐ同期する', 'syncAll')
    .addItem('30分おき自動同期をON', 'installTrigger')
    .addItem('自動同期をOFF', 'removeTriggers')
    .addToUi();
}


/**
 * 全テーブルを同期。手動/トリガー両方から呼ばれるメインエントリ。
 */
function syncAll() {
  const startedAt = new Date();
  for (const t of TABLES) {
    syncTable_(t.table, t.sheet, t.orderBy);
  }
  writeLastSyncedAt_(startedAt);
  Logger.log('[syncAll] done in %dms', new Date() - startedAt);
}


/**
 * 1テーブルぶん Supabase → Sheet に反映。
 */
function syncTable_(table, sheetName, orderBy) {
  const rows = fetchAll_(table, orderBy);
  const sheet = getOrCreateSheet_(sheetName);
  sheet.clear();

  if (rows.length === 0) {
    sheet.getRange(1, 1).setValue('(データなし)');
    return;
  }

  // カラム順を固定(先頭に並べたい列を前に)
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

  sheet.getRange(1, 1, values.length, headers.length).setValues(values);

  // 見た目を少し整える
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#F3F4F6');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, Math.min(headers.length, 10)); // 最初の10列だけ自動幅調整
}


/**
 * テーブルごとに「先頭に並べたい列」を返す。
 */
function getPreferredColumns_(table) {
  if (table === 'members') {
    return [
      'id', 'name', 'name_kana', 'honbu', 'district', 'category',
      'age', 'address', 'phone', 'mobile', 'role',
      'info', 'notes',
    ];
  }
  if (table === 'visits') {
    return ['id', 'member_id', 'visited_at', 'status', 'respondent', 'summary'];
  }
  return [];
}


/**
 * Supabase REST API でテーブル全件取得(ページング対応)。
 */
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


/**
 * 「最終同期」シートに最終同期時刻を書く。
 */
function writeLastSyncedAt_(date) {
  const sheet = getOrCreateSheet_('最終同期');
  sheet.clear();
  sheet.getRange(1, 1, 2, 2).setValues([
    ['最終同期', Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss')],
    ['タイムゾーン', 'Asia/Tokyo (JST)'],
  ]);
  sheet.getRange(1, 1, 2, 1).setFontWeight('bold');
}


/**
 * 30分おきに syncAll を走らせるトリガーを仕掛ける。
 * 既存のトリガーがあれば一度全部消してから作り直し(多重起動防止)。
 */
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
