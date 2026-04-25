'use client';

// ──────────────────────────────────────────────────────────────
// 訪問ログ詳細などで「メモ(Tiptap JSON)」を読み取り専用で表示するためのビュー。
// TiptapEditor とほぼ同じだが、editable: false / ツールバーなし / 余白を詰めた
// 軽量レイアウトにしてある。
//
// 入力が空(undefined / 空ノード)なら何も描画しない。
// ──────────────────────────────────────────────────────────────

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface Props {
  content?: Record<string, unknown> | null;
}

/** Tiptap JSON が「実質的に空」かどうか判定。
 *  type=doc / content=[] や、空段落だけのケースを true 扱いにする。 */
function isEmpty(content?: Record<string, unknown> | null): boolean {
  if (!content) return true;
  const c = content as { content?: { content?: unknown[]; text?: string }[] };
  if (!Array.isArray(c.content) || c.content.length === 0) return true;
  return c.content.every((node) => {
    if (Array.isArray(node.content) && node.content.length > 0) return false;
    if (typeof node.text === 'string' && node.text.trim().length > 0) return false;
    return true;
  });
}

export default function TiptapViewer({ content }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
    ],
    content: content ?? '',
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        // TiptapEditor と同じ class を当てておけば globals.css のスタイルが共通で効く
        class: 'tiptap-editor tiptap-viewer',
      },
    },
  });

  if (isEmpty(content)) return null;
  if (!editor) return null;

  return <EditorContent editor={editor} />;
}
