'use client';

// ───────────────────────────────────────────────────────────────
// メンバー詳細ページの「情報」セクション。
//
// 設計方針:
// - 基本は読み取り専用。うっかりタップで書き換わらないように、
//   右上の鉛筆アイコンを押した時だけ編集モードに入る。
// - 編集モードでは textarea + 「保存 / キャンセル」ボタン。
// - 保存時のみ Supabase の members.info を更新する。
// - 本文は改行をそのまま表示（whitespace-pre-wrap）。
// ───────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import type { Member, MemberRow } from '../lib/types';
import { updateMember } from '../lib/storage';

interface Props {
  member: Member;
  onUpdate?: (updated: Partial<Member>) => void;
}

export default function InfoSection({ member, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(member.info ?? '');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // メンバーが切り替わった時はドラフトを捨てる
  useEffect(() => {
    setDraft(member.info ?? '');
    setEditing(false);
  }, [member.id, member.info]);

  // 編集モード突入時にフォーカス＆末尾にキャレット
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      const v = textareaRef.current.value;
      textareaRef.current.setSelectionRange(v.length, v.length);
    }
  }, [editing]);

  const startEdit = () => {
    setDraft(member.info ?? '');
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(member.info ?? '');
    setEditing(false);
  };

  const save = async () => {
    const trimmed = draft.trimEnd();
    if (trimmed === (member.info ?? '')) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await updateMember(member.id, { info: trimmed || null } as Partial<MemberRow>);
      onUpdate?.({ info: trimmed || undefined });
      setEditing(false);
    } catch {
      // 失敗時は編集状態のまま(ユーザーがやり直せる)
    } finally {
      setSaving(false);
    }
  };

  const hasInfo = !!(member.info && member.info.trim());

  return (
    <div className="ios-card hover:!opacity-100 overflow-hidden">
      {/* ヘッダー行 */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <h3 className="text-sm font-semibold text-[var(--color-subtext)] flex-1">情報</h3>

        {editing ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-subtext)] active:bg-[#F0F0F0] disabled:opacity-40"
              aria-label="キャンセル"
            >
              <X size={18} />
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white bg-[var(--color-primary)] active:opacity-70 disabled:opacity-40"
              aria-label="保存"
            >
              <Check size={18} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-subtext)] active:bg-[#F0F0F0]"
            aria-label="情報を編集"
            title="情報を編集"
          >
            <Pencil size={16} />
          </button>
        )}
      </div>

      {/* 本文 */}
      <div className="px-4 pb-4">
        {editing ? (
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="例：&#10;・ユニクロ永山店で働いている&#10;・〇〇大学出身"
            className="w-full min-h-[160px] text-sm bg-[#FAFAFA] border border-[#E5E7EB] rounded-lg p-3 outline-none focus:border-[var(--color-primary)] resize-y whitespace-pre-wrap leading-relaxed"
          />
        ) : hasInfo ? (
          <div className="text-sm text-[var(--color-text)] whitespace-pre-wrap leading-relaxed break-words">
            {member.info}
          </div>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className="w-full text-left text-sm text-[#CCC] italic active:opacity-60 py-2"
          >
            情報未登録 — 鉛筆アイコンから追加
          </button>
        )}
      </div>
    </div>
  );
}
