'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Heading1, Heading2, List } from 'lucide-react';

interface Props {
  content?: Record<string, unknown>;
  onChange: (json: Record<string, unknown>) => void;
}

export default function TiptapEditor({ content, onChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
      }),
      Placeholder.configure({
        placeholder: '訪問メモを入力...',
      }),
    ],
    content: content ?? '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON() as Record<string, unknown>);
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="rounded-xl overflow-hidden bg-white">
      {/* ツールバー */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[var(--color-separator)] bg-[var(--color-card-bg)]">
        <ToolbarButton
          active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          icon={<Heading1 size={18} />}
          label="見出し1"
        />
        <ToolbarButton
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          icon={<Heading2 size={18} />}
          label="見出し2"
        />
        <div className="w-px h-5 bg-[var(--color-separator)] mx-1" />
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          icon={<Bold size={18} />}
          label="太字"
        />
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          icon={<Italic size={18} />}
          label="斜体"
        />
        <div className="w-px h-5 bg-[var(--color-separator)] mx-1" />
        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          icon={<List size={18} />}
          label="リスト"
        />
      </div>

      {/* エディタ本体 */}
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({ active, onClick, icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`p-1.5 rounded-md transition-colors ${
        active
          ? 'bg-[var(--color-primary)] text-white'
          : 'text-[var(--color-icon-gray)] hover:bg-gray-100'
      }`}
    >
      {icon}
    </button>
  );
}
