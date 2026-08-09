// ──────────────────────────────────────────────────────────────
// POST /api/ai-extract
//
// 喋った(or 打った)ダラダラした文章を、フォームの項目ごとに振り分ける。
// ヒデさん指示 2026-08-09:「入力補助と整理の意味合いが強い。言った内容を
// 振り分けてくれるイメージ」。DB には一切書かない — 返すのは「フォームに
// 入れる候補」だけで、確認画面を通してからユーザーが反映する。
//
//   - 入力: { mode: 'member' | 'visit', text: string, today?: 'YYYY-MM-DD',
//             memberName?: string }
//   - 出力: { fields: {...}, leftover: string }
//       fields   … 振り分けできた項目 (値が取れなかった項目は入らない)
//       leftover … どの項目にも振り分けられなかった内容 (備考/メモ行き候補)
//
// 構造化出力は tool use (input_schema) で強制する。JSON パース事故が起きない。
//
// 環境変数: ANTHROPIC_API_KEY (既存の校正機能と共用)
// ──────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { ORG_TREE } from '../../../lib/constants';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Mode = 'member' | 'visit' | 'auto';

interface RequestBody {
  mode?: Mode;
  text?: string;
  today?: string;
  /** visit モードのとき「今どのメンバーの記録を書いているか」。
   *  喋った内容に別人の名前が出てきた時の警告に使う。 */
  memberName?: string;
}

// ── 組織の選択肢をプロンプトに埋め込む用の一覧 ──
function orgOptionsText(): string {
  return ORG_TREE.map(h => {
    const bus = h.bus.map(b => {
      const ds = b.districts.map(d => d.key);
      return ds.length > 0 ? `${b.key}(${ds.join('/')})` : b.key;
    });
    return `- ${h.key}: ${bus.join('、')}`;
  }).join('\n');
}

const MEMBER_TOOL: Anthropic.Tool = {
  name: 'fill_member_form',
  description: 'メンバー新規登録フォームの各項目に、聞き取った内容を振り分ける',
  input_schema: {
    type: 'object',
    properties: {
      sei: { type: 'string', description: '名字。例「山田」' },
      mei: { type: 'string', description: '下の名前。例「太郎」' },
      kana: { type: 'string', description: '読み仮名(ひらがな)。はっきり言及された時だけ' },
      category: { type: 'string', enum: ['general', 'young'], description: '一般=general、ヤング(青年部/ヤング世代)=young' },
      honbu: { type: 'string', description: '本部名。下の一覧の表記に正規化する' },
      bu: { type: 'string', description: '部・支部名。下の一覧の表記に正規化する' },
      district: { type: 'string', description: '地区名。下の一覧の表記に正規化する' },
      address: { type: 'string', description: '住所。喋られた通りに書く。市区町村名などを補完してはいけない' },
      phone: { type: 'string', description: '自宅の固定電話' },
      mobile: { type: 'string', description: '携帯電話' },
      birthday: { type: 'string', description: '生年月日 YYYY-MM-DD' },
      enrollmentDate: { type: 'string', description: '入会月日 YYYY-MM-DD' },
      role: { type: 'string', description: '学会の役職。例「地区リーダー」' },
      family: { type: 'string', description: '同居している家族。例「親」' },
      educationLevel: { type: 'string', description: '教学の級。1級/2級/3級/任用試験 のいずれか' },
      workplace: { type: 'string', description: '職場・勤務先' },
      notes: { type: 'string', description: '一言で済む短い備考。訪問時の注意など' },
      info: { type: 'string', description: '人物像・家族構成・活動状況などの詳しいメモ。複数行可' },
      leftover: { type: 'string', description: 'どの項目にも振り分けられなかった内容。無ければ空文字' },
    },
    required: ['leftover'],
  },
};

const VISIT_TOOL: Anthropic.Tool = {
  name: 'fill_visit_form',
  description: '訪問ログフォームの各項目に、聞き取った内容を振り分ける',
  input_schema: {
    type: 'object',
    properties: {
      visitedAt: { type: 'string', description: '訪問日 YYYY-MM-DD。「今日」「昨日」「一昨日」「先週の水曜」等は今日の日付から計算する' },
      visitedHour: { type: 'integer', minimum: 0, maximum: 23, description: '訪問した時刻(0-23の整数)。「夕方」なら17、「昼」なら12 のように常識的に丸める' },
      status: {
        type: 'string',
        enum: ['met_self', 'met_family', 'absent', 'refused', 'unknown_address', 'moved'],
        description: '本人に会えた=met_self / 家族に会えた=met_family / 不在=absent / 断られた=refused / 住所が分からない=unknown_address / 転居していた=moved',
      },
      respondents: {
        type: 'array',
        items: { type: 'string', enum: ['father', 'mother', 'wife', 'son', 'sibling'] },
        description: '本人以外で対応してくれた人。父=father 母=mother 妻=wife 息子=son 兄弟姉妹=sibling',
      },
      memo: { type: 'string', description: '訪問メモ本文。ですます調に整えて、段落は改行で区切る。事実は足さない' },
      mentionedName: { type: 'string', description: '文中に出てきた訪問相手の名前。出てこなければ空文字' },
      leftover: { type: 'string', description: 'どの項目にも振り分けられなかった内容。無ければ空文字' },
    },
    required: ['leftover'],
  },
};

// ── 「言ってないことを勝手に入れる」対策の共通ツール定義 ──
// ヒデさん指示 2026-08-09:「住所など言っていないことは勝手に推測して入れないで
// ください。困るので。」 → プロンプトで強く縛ったうえで、住所・電話・生年月日
// のような "後から確認しづらい事実項目" は特に念押しする。
const MEMBER_PROPS: Record<string, unknown> = {
  category: { type: 'string', enum: ['general', 'young'], description: '一般=general、ヤング(青年部/ヤング世代)=young。言及が無ければ入れない' },
  age: { type: 'integer', minimum: 0, maximum: 120, description: '年齢。「38歳」のように具体的な数字が言われた時だけ入れる' },
  ageRange: { type: 'string', description: '「30代」「20代後半」のように年代でしか言われていない場合はここに原文のまま入れる。具体的な年齢が言われているなら空にする' },
  honbu: { type: 'string', description: '本部名。下の一覧の表記に正規化する' },
  bu: { type: 'string', description: '部・支部名。下の一覧の表記に正規化する' },
  district: { type: 'string', description: '地区名。下の一覧の表記に正規化する' },
  address: { type: 'string', description: '住所。喋られた通りに書く。市区町村名などを補完してはいけない' },
  phone: { type: 'string', description: '自宅の固定電話' },
  mobile: { type: 'string', description: '携帯電話' },
  birthday: { type: 'string', description: '生年月日 YYYY-MM-DD。年が言われていなければ入れない' },
  enrollmentDate: { type: 'string', description: '入会月日 YYYY-MM-DD。年が言われていなければ入れない' },
  role: { type: 'string', description: '学会の役職。例「地区リーダー」' },
  family: { type: 'string', description: '同居している家族。例「親」' },
  educationLevel: { type: 'string', description: '教学の級。1級/2級/3級/任用試験 のいずれか' },
  workplace: { type: 'string', description: '職場・勤務先' },
  // ステータスグリッドの項目。専用の欄があるものは info/memo に書かず必ずここへ。
  altarStatus: { type: 'string', description: 'ご本尊の御安置状況。「お形木御本尊」「お守り御本尊」など言われた通りに' },
  dailyPractice: { type: 'string', description: '勤行の実践状況。している=○ / していない=× のどちらかで入れる' },
  newspaper: { type: 'string', description: '聖教新聞の購読状況。「マイ聖教」「家族で購読」「未購読」など' },
  financialContribution: { type: 'string', description: '広布(財務)の状況。している=○ / していない=未' },
  activityStatus: { type: 'string', description: '学会活動の状況。「会合に参加」「会えるが未活動」「未活動」など言われた通りに' },
  youthGroup: { type: 'string', description: '創価青年部(創牙)などの所属。所属が言われた時だけ' },
  info: { type: 'string', description: 'その人についての一般的な情報のうち、他のどの項目にも当てはまらないもの。専用の項目がある内容 (同居家族・職場・役職・教学・勤行など) はここに書かず、それぞれの項目に入れること' },
};

const VISIT_PROPS: Record<string, unknown> = {
  visitedAt: { type: 'string', description: '訪問日 YYYY-MM-DD。「今日」「昨日」「一昨日」等は今日の日付から計算する。日付の言及が無ければ入れない' },
  visitedHour: { type: 'integer', minimum: 0, maximum: 23, description: '訪問した時刻(0-23の整数)。「夕方」なら17、「昼」なら12 のように丸めてよい。時間の言及が無ければ入れない' },
  status: {
    type: 'string',
    enum: ['met_self', 'met_family', 'absent', 'refused', 'unknown_address', 'moved'],
    description: '本人に会えた=met_self / 家族に会えた=met_family / 不在=absent / 断られた=refused / 住所が分からない=unknown_address / 転居していた=moved。判断できなければ入れない',
  },
  respondents: {
    type: 'array',
    items: { type: 'string', enum: ['father', 'mother', 'wife', 'son', 'sibling'] },
    description: '本人以外で対応してくれた人。父=father 母=mother 妻=wife 息子=son 兄弟姉妹=sibling',
  },
  memo: { type: 'string', description: '今回の訪問での出来事・様子・話した内容。ですます調に整えて、段落は改行で区切る。事実は足さない' },
};

const AUTO_TOOL: Anthropic.Tool = {
  name: 'sort_into_forms',
  description: '喋った内容を「メンバー情報」と「訪問ログ」に振り分ける',
  input_schema: {
    type: 'object',
    properties: {
      hasVisit: {
        type: 'boolean',
        description: '「訪問した/行った/会えた/留守だった」など、実際の訪問の出来事が語られているなら true。人の紹介だけなら false',
      },
      person: {
        type: 'object',
        description: '話に出てくる対象者の名前。言われた分だけ入れる',
        properties: {
          sei: { type: 'string', description: '名字。例「山田」' },
          mei: { type: 'string', description: '下の名前。例「太郎」' },
          kana: { type: 'string', description: '読み仮名(ひらがな)。はっきり言及された時だけ' },
        },
      },
      member: { type: 'object', description: 'メンバーの属性情報。言われた項目だけ入れる', properties: MEMBER_PROPS },
      visit: { type: 'object', description: '訪問ログの情報。hasVisit=false なら空オブジェクト', properties: VISIT_PROPS },
      leftover: { type: 'string', description: 'どの項目にも振り分けられなかった内容。無ければ空文字' },
    },
    required: ['hasVisit', 'leftover'],
  },
};

function buildSystem(mode: Mode, today: string, memberName?: string): string {
  const common = `あなたは家庭訪問アプリの入力アシスタントです。
ユーザーが音声入力や手打ちで書き殴った日本語の文章を読んで、フォームの項目ごとに振り分けます。

# 最重要ルール — 言われていないことは絶対に入れない
- ユーザーが口に出していない情報は、どんなに「ありそう」でも入れてはいけない。
- 特に 住所・電話番号・生年月日・所属組織(本部/部/地区) は、一言でも言及が
  無ければ絶対に値を入れない。一般常識や過去の文脈からの補完も禁止。
- 「旭川市」のような市区町村名すら、言われていなければ足さない。
  「豊岡3条4丁目」と言われたら "豊岡3条4丁目" とだけ入れる。
- 迷ったら「入れない」を選ぶ。空欄はユーザーが後から手で足せるが、
  間違った値が入るのは取り返しがつかない。

# その他のルール
- 事実を足したり盛ったりしない。言い換えの範囲に留める。
- 音声入力の誤字 (同音異義語の変換ミスなど) は文脈から自然に直してよい。
- どの項目にも当てはまらなかった内容は leftover にそのまま残す。捨てない。
- 今日の日付は ${today} です。相対的な日付表現はこれを基準に計算してください。`;

  if (mode === 'auto') {
    return `${common}

# 組織の選択肢 (この表記に正規化すること。一覧に無い組織名は入れない)
${orgOptionsText()}

# 振り分けの考え方
- 「誰の話か」を person に入れる。名字だけ、下の名前だけの時は分かる方だけ。
- 訪問の出来事 (行った/会えた/留守だった/断られた 等) が語られていれば hasVisit=true。
  人の紹介や名簿情報を伝えているだけなら hasVisit=false。
- 「ヤング」「青年部」「男子部」等の言及があれば member.category=young。

# 専用の項目があるものは 必ず そちらへ (ヒデさん指示)
「親と同居している」のように 専用の欄が用意されている内容は、その欄に入れる。
info や memo に文章として書いてはいけない (二重に持つことになる)。
  例) 「お母さんと二人暮らし」        → family = "親"
      「ユニクロで働いてる」          → workplace = "ユニクロ"
      「地区リーダーやってる」        → role = "地区リーダー"
      「勤行はしてる」                → dailyPractice = "○"
      「聖教はマイ聖教で取ってる」    → newspaper = "マイ聖教"
      「会合には出てへん」            → activityStatus = "未活動"
      「教学は2級まで取ってる」      → educationLevel = "2級"
専用の欄に入れた内容を、さらに info や memo に書き足さないこと。

# 「情報」と「メモ」の振り分け (ヒデさん指示)
上のどの欄にも当てはまらなかった文章は、必ず この 2 つのどちらかに入れる。
両方に同じ話を重複させない。
- member.info (情報) … その人についての一般的な情報。
    いつ訪問しても当てはまる性質のもの。
    例) 人物像・見た目・性格 / 家族構成 / 仕事や勤務先 / 学会活動の状況 /
        普段の生活リズム / 連絡の付きやすさ
- visit.memo (メモ) … 今回の訪問に紐づく話。
    その日その時に起きたこと。
    例) 誰が出てきたか / どんな様子だったか / 何を話したか /
        次はいつ来てほしいと言われたか / 渡したもの・預かったもの

迷ったら「来月また訪問した時にも同じことが言えるか?」で判断する。
言えるなら情報、その日限りの話ならメモ。`;
  }

  if (mode === 'member') {
    return `${common}

# 組織の選択肢 (この表記に正規化すること。一覧に無い組織名は入れない)
${orgOptionsText()}

# 補足
- 「ヤング」「青年部」「男子部」等の言及があれば category=young。
- 名前が「山田太郎」のように続けて言われた場合は sei=山田 / mei=太郎 に分ける。
  名字だけ、下の名前だけの時は分かる方だけ入れる。
- 人物像・エピソード・家族構成・活動状況のような長めの話は info に入れる。
  「次回は夕方以降が良い」のような一言メモは notes に入れる。`;
  }

  return `${common}

# 補足
${memberName ? `- 今ユーザーが書いているのは「${memberName}」さんの訪問ログです。\n` : ''}- memo は訪問時の様子・話した内容をですます調で整えて入れる。日付や対応者など、
  他の項目に振り分けた情報も、文章として自然なら memo に残してよい。
- 「会えなかった」「留守だった」→ status=absent。
  「お母さんが出てきた」→ status=met_family かつ respondents=["mother"]。`;
}

export async function POST(req: NextRequest) {
  // ── 認証 ────────────────────────────────────────
  // このルートは DB を触らないぶん、トークンを「持ってるだけ」で通すと
  // 誰でも Claude API を叩けてしまう。Supabase に実際に照会して、有効な
  // ログインユーザーであることを確認する。
  const auth = req.headers.get('authorization');
  const accessToken = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!accessToken) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.json({ error: 'Supabase env が未設定です' }, { status: 500 });
  }
  {
    const sb = createClient(supabaseUrl, supabaseAnon, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await sb.auth.getUser(accessToken);
    if (error || !data?.user) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY が未設定です。Vercel の環境変数に追加してください。' },
      { status: 500 },
    );
  }

  let body: RequestBody = {};
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'リクエストが不正です' }, { status: 400 });
  }

  const mode: Mode = body.mode === 'visit' || body.mode === 'auto' ? body.mode : 'member';
  const text = (body.text ?? '').trim();
  if (!text) {
    return NextResponse.json({ error: '文章が空です' }, { status: 400 });
  }
  if (text.length > 8000) {
    return NextResponse.json({ error: '文章が長すぎます (8000文字まで)' }, { status: 400 });
  }
  const today = /^\d{4}-\d{2}-\d{2}$/.test(body.today ?? '')
    ? (body.today as string)
    : new Date().toISOString().slice(0, 10);

  const tool = mode === 'auto' ? AUTO_TOOL : mode === 'member' ? MEMBER_TOOL : VISIT_TOOL;
  const anthropic = new Anthropic({ apiKey });

  let input: Record<string, unknown>;
  try {
    const res = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 4000,
      system: buildSystem(mode, today, body.memberName),
      tools: [tool],
      tool_choice: { type: 'tool', name: tool.name },
      messages: [{ role: 'user', content: text }],
    });
    const block = res.content.find(b => b.type === 'tool_use');
    if (!block || block.type !== 'tool_use') {
      return NextResponse.json({ error: 'AI が結果を返しませんでした' }, { status: 502 });
    }
    input = block.input as Record<string, unknown>;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `AI の呼び出しに失敗しました: ${msg}` }, { status: 502 });
  }

  // leftover は fields から分離して返す
  const leftover = typeof input.leftover === 'string' ? input.leftover.trim() : '';
  delete input.leftover;

  // 空文字・空配列・空オブジェクトは「取れなかった」扱いにして落とす。
  // これをやらないと確認画面に空行が並び、「AI が何か入れた」ように見えてしまう。
  const clean = (obj: unknown): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    if (!obj || typeof obj !== 'object') return out;
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (v === null || v === undefined) continue;
      if (typeof v === 'string' && v.trim() === '') continue;
      if (Array.isArray(v) && v.length === 0) continue;
      out[k] = typeof v === 'string' ? v.trim() : v;
    }
    return out;
  };

  if (mode === 'auto') {
    return NextResponse.json({
      hasVisit: input.hasVisit === true,
      person: clean(input.person),
      member: clean(input.member),
      visit: clean(input.visit),
      leftover,
    });
  }

  return NextResponse.json({ fields: clean(input), leftover });
}
