// ──────────────────────────────────────────────────────────────
// POST /api/proofread/visits
//
// 訪問ログの本文を Claude API で校正する。
//   - 入力: { visitIds: string[] }  (省略すると 自分が見られる全 visit)
//   - 出力: { proposals: [{ id, original, proposed }] }
//
// 校正方針 (system prompt で固定):
//   - ですます調 (丁寧語) に統一
//   - 誤字脱字 / 音声入力ミスを修正
//   - 主旨は変えない
//
// 環境変数:
//   ANTHROPIC_API_KEY              ← 必須
//   NEXT_PUBLIC_SUPABASE_URL       ← 既存
//   NEXT_PUBLIC_SUPABASE_ANON_KEY  ← 既存
// ──────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

// Supabase ユーザースコープ client (Bearer 経由で auth.uid() が取れる)
function makeUserScopedSupabase(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Supabase env が未設定');
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Tiptap doc から平文を取り出す (改行で paragraph 区切り)
function tiptapToText(notes: unknown): string {
  if (!notes || typeof notes !== 'object') return '';
  const doc = notes as { type?: string; content?: unknown[] };
  if (doc.type !== 'doc' || !Array.isArray(doc.content)) return '';
  const lines: string[] = [];
  for (const node of doc.content) {
    if (typeof node !== 'object' || node === null) continue;
    const n = node as { type?: string; content?: unknown[] };
    if (n.type !== 'paragraph') continue;
    const parts: string[] = [];
    for (const child of n.content ?? []) {
      if (typeof child === 'object' && child !== null) {
        const c = child as { type?: string; text?: string };
        if (c.type === 'text' && typeof c.text === 'string') parts.push(c.text);
      }
    }
    lines.push(parts.join(''));
  }
  return lines.join('\n').trim();
}

// 平文 → Tiptap doc に戻す (UPDATE 用ではないが、API が後で必要なら)
function textToTiptap(text: string): unknown {
  const paragraphs = text.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed) return { type: 'paragraph' };
    return {
      type: 'paragraph',
      content: [{ type: 'text', text: trimmed }],
    };
  });
  return { type: 'doc', content: paragraphs };
}

const SYSTEM_PROMPT = `あなたは訪問記録の校正担当です。家庭訪問アプリで使われている訪問ログを、以下の方針で校正してください。

# 校正方針
- 文体は「ですます調 (丁寧語)」に統一する
- 音声入力の誤字脱字 (例: 「住宅車」→「住宅」、「言っているよう」→「されているよう」など) を修正する
- 主旨や事実は変えない
- 文の意図がはっきりしない場合も推測で書き換えない (元のまま残す)
- 「お家」「お部屋」「インターホン」「お土産」など、丁寧で読みやすい言葉を使う
- 段落区切りは改行 (\\n) で表現する

# 出力フォーマット
必ず JSON で返してください。説明や前置きは一切不要。
{
  "proposals": [
    {"id": "xxx", "proposed": "校正後の本文 (改行は \\n)"}
  ]
}`;

interface RequestBody {
  visitIds?: string[];
}

interface Proposal {
  id: string;
  original: string;
  proposed: string;
  unchanged: boolean;
}

export async function POST(req: NextRequest) {
  // ── 認証 ─────────────────────────────────────────
  const auth = req.headers.get('authorization');
  const accessToken = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!accessToken) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  // ── 環境変数 ──────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY が未設定です。Vercel 環境変数に追加してください。' },
      { status: 500 },
    );
  }

  // ── リクエストパース ──────────────────────────────
  let body: RequestBody = {};
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    /* 空ボディも OK */
  }
  const requestedIds = body.visitIds;

  // ── Supabase から該当 visit 取得 ──────────────────
  const supabase = makeUserScopedSupabase(accessToken);
  let query = supabase
    .from('visits')
    .select('id, notes, visited_at')
    .is('deleted_at', null);
  if (requestedIds && requestedIds.length > 0) {
    query = query.in('id', requestedIds);
  }
  const { data: visits, error } = await query;
  if (error) {
    return NextResponse.json({ error: `visits 取得失敗: ${error.message}` }, { status: 500 });
  }

  // ── 本文を抜き出し、空でないものだけ対象に ────────
  type VisitText = { id: string; original: string };
  const targets: VisitText[] = (visits ?? [])
    .map(v => ({ id: v.id as string, original: tiptapToText(v.notes) }))
    .filter(v => v.original.length > 0);

  if (targets.length === 0) {
    return NextResponse.json({ proposals: [] });
  }

  // ── Claude API に投げて校正案を取得 ───────────────
  const anthropic = new Anthropic({ apiKey });
  const userMessage = `以下の訪問ログを 1 件ずつ校正して、JSON で返してください。

${targets.map(t => `- id: ${t.id}\n  原文: ${JSON.stringify(t.original)}`).join('\n')}`;

  let aiText = '';
  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });
    const block = res.content.find(b => b.type === 'text');
    aiText = block && 'text' in block ? block.text : '';
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Claude API 失敗: ${msg}` }, { status: 502 });
  }

  // ── AI レスポンスのパース ─────────────────────────
  // JSON ブロック (場合によっては ```json ... ``` で囲まれてる) を取り出す
  const jsonMatch = aiText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json(
      { error: 'AI が JSON を返しませんでした', aiText },
      { status: 502 },
    );
  }
  let parsed: { proposals?: { id?: string; proposed?: string }[] };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    return NextResponse.json(
      { error: `AI レスポンスのパース失敗: ${e instanceof Error ? e.message : String(e)}`, aiText },
      { status: 502 },
    );
  }

  // ── id ごとに original を引いて proposal を組み立てる ─
  const originalMap = new Map(targets.map(t => [t.id, t.original]));
  const proposals: Proposal[] = (parsed.proposals ?? [])
    .filter((p): p is { id: string; proposed: string } => !!p.id && typeof p.proposed === 'string')
    .map(p => {
      const original = originalMap.get(p.id) ?? '';
      const proposed = p.proposed.trim();
      return {
        id: p.id,
        original,
        proposed,
        unchanged: original.trim() === proposed,
      };
    });

  return NextResponse.json({ proposals });
}

// クライアント側で使う型 export 用
export type { Proposal };

// 単発反映用に textToTiptap を re-export (別のクライアント API で使えるように)
export { textToTiptap };
