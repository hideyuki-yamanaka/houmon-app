'use client';

// ──────────────────────────────────────────────────────────────
// AiAssistSheet — 「AIにおまかせ」入力補助シート (2026-08-09 ヒデさん指示)
//
// 使い方は 2 ステップ:
//   1) 大きい入力欄にダラダラ喋る / 打つ
//      → autoFocus でキーボードが即立ち上がるので、地球儀アイコンから
//        Aqua Voice キーボードに切り替えればそのまま音声入力できる。
//        (Aqua Voice の iOS 版はキーボードアプリなので、Web からアプリを
//         起動する URL スキームは無い。キーボード経由が唯一かつ最短の道)
//   2) 「AIで振り分ける」→ 確認画面 → チェックを外した項目以外を反映
//
// DB には一切書かない。親フォームの state に値を流し込むだけなので、
// 反映後もユーザーは普通に手で直せるし、保存は既存の保存ボタンで行う。
// ──────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Loader2, ArrowLeft } from 'lucide-react';
import { supabase, isMockMode } from '../lib/supabase';
import { tapHaptic } from '../lib/haptics';

export type AiMode = 'member' | 'visit';

/** 確認画面に出す 1 行 */
export interface AiFieldRow {
  key: string;
  label: string;
  /** 画面に出す表示用の文字列 */
  display: string;
  /** 親に渡す実際の値 */
  value: unknown;
}

interface Props {
  mode: AiMode;
  /** 抽出結果 (fields) を確認画面の行に変換する。親フォーム側の語彙で書く */
  toRows: (fields: Record<string, unknown>) => AiFieldRow[];
  /** チェックが入った行だけを渡すので、親フォームの state に反映する */
  onApply: (rows: AiFieldRow[], leftover: string) => void;
  /** visit モードで「今どのメンバーの記録か」。別人の名前を喋った時の警告用 */
  memberName?: string;
  /** ボタンに出す文言 */
  buttonLabel?: string;
  placeholder: string;
}

type Phase = 'input' | 'loading' | 'confirm';

// お試しモード (Supabase 未接続のローカル) 専用のダミー抽出結果。
// 本番では使われない。確認画面のレイアウト確認用。
const MOCK_EXTRACTION: Record<AiMode, { fields: Record<string, unknown>; leftover: string }> = {
  member: {
    fields: {
      sei: '山田', mei: '太郎', category: 'general',
      honbu: '豊岡本部', bu: '豊岡部', district: '英雄地区',
      address: '旭川市豊岡3条4丁目', mobile: '090-1234-5678',
      workplace: 'ユニクロ', role: '地区リーダー', family: '親',
      notes: '夜勤明けの午前は避けたほうが良いです。',
    },
    leftover: '',
  },
  visit: {
    fields: {
      visitedAt: new Date().toLocaleDateString('sv-SE'), visitedHour: 17,
      status: 'met_family', respondents: ['mother'],
      memo: '本人は不在で、お母さんが対応してくださいました。\n最近は仕事が忙しく、帰りが遅いそうです。\n次回は日曜の昼にお願いしたいとのことでした。',
    },
    leftover: '',
  },
};

export default function AiAssistSheet({
  mode,
  toRows,
  onApply,
  memberName,
  buttonLabel = 'AIにおまかせ入力',
  placeholder,
}: Props) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('input');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<AiFieldRow[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [leftover, setLeftover] = useState('');
  const [mentionedName, setMentionedName] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // シートを開いたら即フォーカス → キーボードが立ち上がる
  useEffect(() => {
    if (open && phase === 'input') {
      const t = window.setTimeout(() => textareaRef.current?.focus(), 250);
      return () => window.clearTimeout(t);
    }
  }, [open, phase]);

  const reset = () => {
    setPhase('input');
    setText('');
    setError(null);
    setRows([]);
    setChecked({});
    setLeftover('');
    setMentionedName(null);
  };

  const close = () => {
    setOpen(false);
    // アニメーション無しなので即リセットして OK
    reset();
  };

  const handleExtract = async () => {
    if (!text.trim()) return;
    tapHaptic();
    setPhase('loading');
    setError(null);
    try {
      // ローカルのお試しモード (Supabase 未接続) では Claude を呼べないので、
      // UI を確認できるようサンプルの抽出結果を返す。
      if (isMockMode) {
        const sample = MOCK_EXTRACTION[mode];
        const nextRows = toRows({ ...sample.fields });
        setRows(nextRows);
        setChecked(Object.fromEntries(nextRows.map(r => [r.key, true])));
        setLeftover(sample.leftover);
        setMentionedName(null);
        setPhase('confirm');
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error('ログインし直してください');

      const res = await fetch('/api/ai-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          mode,
          text: text.trim(),
          today: new Date().toLocaleDateString('sv-SE'), // ローカル日付 YYYY-MM-DD
          memberName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `エラー (${res.status})`);

      const fields = (data.fields ?? {}) as Record<string, unknown>;
      // mentionedName は確認画面の行ではなく警告として使うので抜いておく
      const mentioned = typeof fields.mentionedName === 'string' ? fields.mentionedName : null;
      delete fields.mentionedName;

      const nextRows = toRows(fields);
      if (nextRows.length === 0 && !data.leftover) {
        setError('項目に振り分けられる内容が見つかりませんでした。もう少し詳しく書いてみてください。');
        setPhase('input');
        return;
      }
      setRows(nextRows);
      setChecked(Object.fromEntries(nextRows.map(r => [r.key, true])));
      setLeftover(typeof data.leftover === 'string' ? data.leftover : '');
      setMentionedName(
        mentioned && memberName && !memberName.replace(/\s/g, '').includes(mentioned.replace(/\s/g, ''))
          ? mentioned
          : null,
      );
      setPhase('confirm');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('input');
    }
  };

  const handleApply = () => {
    tapHaptic();
    onApply(rows.filter(r => checked[r.key]), leftover);
    close();
  };

  const checkedCount = rows.filter(r => checked[r.key]).length;

  return (
    <>
      <button
        type="button"
        onClick={() => { tapHaptic(); setOpen(true); }}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white text-[14px] font-bold active:opacity-85 transition-opacity shadow-[0_4px_14px_rgba(99,102,241,0.35)]"
      >
        <Sparkles size={17} />
        {buttonLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div
            className="bg-white rounded-t-3xl overflow-hidden flex flex-col"
            style={{ maxHeight: '92vh', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* ヘッダー */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#F0F0F0] shrink-0">
              {phase === 'confirm' ? (
                <button
                  type="button"
                  onClick={() => { tapHaptic(); setPhase('input'); }}
                  className="flex items-center gap-1 text-[var(--color-primary)] text-sm shrink-0"
                >
                  <ArrowLeft size={18} />
                  書き直す
                </button>
              ) : (
                <span className="w-16 shrink-0" />
              )}
              <h2 className="flex-1 text-center text-[15px] font-bold">
                {phase === 'confirm' ? '確認' : 'AIにおまかせ入力'}
              </h2>
              <button
                type="button"
                onClick={() => { tapHaptic(); close(); }}
                aria-label="閉じる"
                className="w-9 h-9 rounded-full flex items-center justify-center active:bg-[#F0F0F0] shrink-0"
              >
                <X size={20} className="text-[var(--color-subtext)]" />
              </button>
            </div>

            {/* ── 入力フェーズ ── */}
            {phase !== 'confirm' && (
              <div className="p-4 overflow-y-auto">
                <p className="text-[11px] text-[var(--color-subtext)] mb-2 leading-relaxed">
                  思いついた順にダラダラ書いて (喋って) OK です。AI が項目ごとに振り分けます。
                  <br />
                  音声入力キーボードを最初から出したい時は、iPhone の
                  <strong>設定 → 一般 → キーボード → キーボード → 編集</strong> で
                  一番上に並べ替えてください（アプリ側からは指定できません）。
                </p>
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={placeholder}
                  disabled={phase === 'loading'}
                  className="w-full h-48 rounded-xl border border-[#E5E5EA] p-3 text-[15px] resize-none outline-none focus:border-[#6366F1] placeholder:text-[#C7C7CC] disabled:opacity-60"
                />
                {error && (
                  <p className="text-[12px] text-[#FF3B30] bg-[#FFE5E5] rounded-lg px-3 py-2 mt-2">{error}</p>
                )}
                <button
                  type="button"
                  onClick={handleExtract}
                  disabled={!text.trim() || phase === 'loading'}
                  className="w-full mt-3 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] text-white text-[15px] font-bold active:opacity-85 disabled:opacity-30"
                >
                  {phase === 'loading' ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
                  {phase === 'loading' ? '振り分け中…' : 'AIで振り分ける'}
                </button>
              </div>
            )}

            {/* ── 確認フェーズ ── */}
            {phase === 'confirm' && (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-3">
                  <p className="text-[11px] text-[var(--color-subtext)] mb-3">
                    入れたくない項目はチェックを外してください。反映した後も、いつも通り手で直せます。
                  </p>

                  {mentionedName && (
                    <div className="mb-3 bg-[#FFEAD0] text-[#C2410C] rounded-xl px-3 py-2 text-[12px] leading-snug">
                      文章に<strong className="font-bold">「{mentionedName}」</strong>という名前が出てきました。
                      今書いているのは<strong className="font-bold">「{memberName}」</strong>さんの記録です。
                      違う人なら、戻って別のメンバーから記録し直してください。
                    </div>
                  )}

                  {rows.length === 0 ? (
                    <p className="text-[13px] text-[var(--color-subtext)] py-4 text-center">
                      項目に振り分けられる内容はありませんでした
                    </p>
                  ) : (
                    <ul className="divide-y divide-[#F0F0F0]">
                      {rows.map(r => (
                        <li key={r.key}>
                          <label className="flex items-start gap-3 py-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!checked[r.key]}
                              onChange={(e) => setChecked(c => ({ ...c, [r.key]: e.target.checked }))}
                              className="w-5 h-5 mt-0.5 shrink-0 accent-[#6366F1]"
                            />
                            <span className="flex-1 min-w-0">
                              <span className="block text-[11px] text-[var(--color-subtext)]">{r.label}</span>
                              <span className="block text-[14px] whitespace-pre-wrap break-words">{r.display}</span>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}

                  {leftover && (
                    <div className="mt-3 bg-[#F7F7F8] rounded-xl px-3 py-2.5">
                      <p className="text-[11px] font-bold text-[var(--color-subtext)] mb-1">
                        どの項目にも入らなかった内容
                      </p>
                      <p className="text-[12px] whitespace-pre-wrap">{leftover}</p>
                      <p className="text-[10px] text-[var(--color-subtext)] mt-1.5">
                        ※ この内容は反映されません。必要ならコピーして手で入れてください。
                      </p>
                    </div>
                  )}
                </div>

                <div className="px-4 pt-2 pb-4 border-t border-[#F0F0F0] shrink-0">
                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={checkedCount === 0}
                    className="w-full py-3.5 rounded-2xl bg-[#111] text-white text-[15px] font-bold active:opacity-80 disabled:opacity-30"
                  >
                    {checkedCount}件をフォームに反映
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
