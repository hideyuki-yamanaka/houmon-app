// ──────────────────────────────────────────────────────────────
// POST /api/proofread/apply
//
// 校正済み本文を visits.notes に書き戻す。
//   - 入力: { items: [{ id, proposed }] }
//   - 出力: { applied: number, errors: { id, message }[] }
//
// RLS: Bearer auth で 自分のチームのデータだけ更新可。
// ──────────────────────────────────────────────────────────────

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function makeUserScopedSupabase(accessToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Supabase env が未設定');
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// 改行で paragraph 区切り → Tiptap doc
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

interface ApplyItem {
  id: string;
  proposed: string;
}

interface RequestBody {
  items?: ApplyItem[];
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const accessToken = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!accessToken) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let body: RequestBody = {};
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }

  const items = (body.items ?? []).filter(
    (it): it is ApplyItem =>
      typeof it?.id === 'string' && typeof it?.proposed === 'string' && it.proposed.trim().length > 0,
  );

  if (items.length === 0) {
    return NextResponse.json({ applied: 0, errors: [] });
  }

  const supabase = makeUserScopedSupabase(accessToken);
  const errors: { id: string; message: string }[] = [];
  let applied = 0;

  // 1 件ずつ UPDATE (バルク更新だと部分失敗の検知が難しいため)
  for (const it of items) {
    const notes = textToTiptap(it.proposed.trim());
    const { error } = await supabase
      .from('visits')
      .update({ notes, updated_at: new Date().toISOString() })
      .eq('id', it.id);
    if (error) {
      errors.push({ id: it.id, message: error.message });
    } else {
      applied++;
    }
  }

  return NextResponse.json({ applied, errors });
}
