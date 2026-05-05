'use client';

// ──────────────────────────────────────────────────────────────
// /settings/proofreading — 訪問ログ 文書校正
//
// 流れ:
//   1.「校正を実行」 → /api/proofread/visits に POST → 全 visit を Claude に投げて
//      校正案 (proposed) を取得
//   2. 結果を 一覧表示 (原文 / 校正後 / チェックボックス)
//   3.「全て反映」or 「選択中を反映」 → /api/proofread/apply に POST →
//      Supabase に UPDATE
//
// ヒデさん指示 (2026-05-04):
//   - ですます調で統一
//   - 誤字脱字も修正
//   - 一括 + 個別 適用
// ──────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Loader2, Sparkles, Check, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Pencil,
} from 'lucide-react';
import { useSwipeBack } from '../../../lib/useSwipeBack';
import { tapHaptic } from '../../../lib/haptics';
import { supabase } from '../../../lib/supabase';
import { getMembers } from '../../../lib/storage';

interface Proposal {
  id: string;
  original: string;
  proposed: string;
  unchanged: boolean;
  /** ヒデさんが校正後を手動で微修正した場合 true */
  userEdited?: boolean;
}

type Phase = 'idle' | 'running' | 'done' | 'applying' | 'applied' | 'error';

export default function ProofreadingPage() {
  const router = useRouter();
  useSwipeBack(() => router.back());

  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [appliedCount, setAppliedCount] = useState(0);
  const [memberNames, setMemberNames] = useState<Map<string, string>>(new Map());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // どの行を編集中か (null = 編集なし)
  const [editingId, setEditingId] = useState<string | null>(null);
  // 編集中のテキストバッファ (確定時に proposals[].proposed に反映)
  const [editBuffer, setEditBuffer] = useState<string>('');

  // メンバー名 (id → name) を取得しとく (校正対象 visit に member_id 出ない設計やから
  // 別途取得して 一覧表示時にマッピング)
  useEffect(() => {
    getMembers().then(ms => {
      setMemberNames(new Map(ms.map(m => [m.id, m.name])));
    }).catch(() => { /* ignore */ });
  }, []);

  // 訪問→メンバー名引き当ては visit に member_id 必要やが、
  // proposal は id のみ。なので別途 visit テーブルから引いて map 作る。
  const [visitMemberMap, setVisitMemberMap] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    if (proposals.length === 0) return;
    const ids = proposals.map(p => p.id);
    supabase
      .from('visits')
      .select('id, member_id, visited_at')
      .in('id', ids)
      .then(({ data }) => {
        const m = new Map<string, string>();
        for (const row of data ?? []) m.set(row.id as string, row.member_id as string);
        setVisitMemberMap(m);
      });
  }, [proposals]);

  // 校正を実行
  const handleRun = useCallback(async () => {
    tapHaptic();
    setPhase('running');
    setError(null);
    setProposals([]);
    setSelectedIds(new Set());
    setAppliedCount(0);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token;
      if (!accessToken) {
        setError('ログインしていません');
        setPhase('error');
        return;
      }
      const res = await fetch('/api/proofread/visits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({}), // 空 → 全 visit 対象
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? `校正失敗 (${res.status})`);
        setPhase('error');
        return;
      }
      const list: Proposal[] = json.proposals ?? [];
      setProposals(list);
      // デフォルトで「変更ありの行」だけチェック
      setSelectedIds(new Set(list.filter(p => !p.unchanged).map(p => p.id)));
      setPhase('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  }, []);

  // 反映
  const handleApply = useCallback(async (ids: string[]) => {
    tapHaptic();
    if (ids.length === 0) return;
    if (!confirm(`${ids.length} 件を上書きします。よろしいですか?`)) return;

    setPhase('applying');
    setError(null);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token;
      if (!accessToken) {
        setError('ログインしていません');
        setPhase('error');
        return;
      }
      const items = proposals
        .filter(p => ids.includes(p.id))
        .map(p => ({ id: p.id, proposed: p.proposed }));
      const res = await fetch('/api/proofread/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ items }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? `反映失敗 (${res.status})`);
        setPhase('error');
        return;
      }
      setAppliedCount(json.applied ?? 0);
      // 反映済みの行を一覧から外す
      setProposals(prev => prev.filter(p => !ids.includes(p.id)));
      setSelectedIds(new Set());
      setPhase('applied');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  }, [proposals]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 校正後カードタップで編集モード ON
  const startEdit = (id: string, current: string) => {
    tapHaptic();
    setEditingId(id);
    setEditBuffer(current);
    // 編集する時は折りたたみも展開しとく (原文と並べて見れるように)
    setExpanded(prev => new Set(prev).add(id));
  };

  // 編集確定 (blur or 完了ボタン)
  const commitEdit = () => {
    if (!editingId) return;
    const trimmed = editBuffer.trim();
    setProposals(prev =>
      prev.map(p => {
        if (p.id !== editingId) return p;
        // 空文字は反映せず元の値維持 (誤操作防止)
        if (!trimmed) return p;
        const userEdited = trimmed !== p.proposed;
        return { ...p, proposed: trimmed, userEdited: userEdited || p.userEdited };
      }),
    );
    setEditingId(null);
    setEditBuffer('');
  };

  // textarea 自動リサイズ
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = editTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [editBuffer]);

  const visibleProposals = useMemo(
    () => proposals.filter(p => !p.unchanged), // 変更なしは UI から省く
    [proposals],
  );

  const allSelectedCount = selectedIds.size;
  const totalChangeCount = visibleProposals.length;

  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-12">
      {/* ヘッダ */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-black/5">
        <div className="max-w-[640px] mx-auto flex items-center px-2 py-2">
          <Link
            href="/settings"
            onClick={() => tapHaptic()}
            className="flex items-center gap-1 text-[15px] text-[var(--color-primary)] active:opacity-60 px-2 py-1"
          >
            <ChevronLeft size={20} />
            <span>戻る</span>
          </Link>
          <h1 className="flex-1 text-center text-[16px] font-semibold pr-12">文書校正</h1>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-4 space-y-4">
        {/* 説明 */}
        <section className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-4">
          <h2 className="text-[14px] font-bold mb-1 flex items-center gap-1">
            <Sparkles size={14} /> AI で訪問ログを校正
          </h2>
          <p className="text-[12px] leading-relaxed text-[#92400E]">
            音声入力でバラついた文体を <strong>ですます調</strong> に統一、誤字脱字も修正します。
            校正後に内容を確認してから 一括 or 個別で反映できます。
          </p>
        </section>

        {/* 実行ボタン */}
        <section className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
          <div className="px-4 py-4">
            <button
              type="button"
              onClick={handleRun}
              disabled={phase === 'running' || phase === 'applying'}
              className="w-full h-12 rounded-full bg-[#111] text-white text-[14px] font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
            >
              {phase === 'running' ? (
                <><Loader2 size={16} className="animate-spin" />校正中…（10〜20秒）</>
              ) : phase === 'done' || phase === 'applied' ? (
                <><RefreshCw size={16} />もう一度 校正を実行</>
              ) : (
                <><Sparkles size={16} />校正を実行</>
              )}
            </button>
            {error && (
              <div className="mt-3 flex items-start gap-1 text-[12px] text-red-600">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {phase === 'applied' && appliedCount > 0 && (
              <div className="mt-3 flex items-center gap-1 text-[12px] text-emerald-600">
                <Check size={14} className="shrink-0" />
                <span>{appliedCount} 件 反映しました</span>
              </div>
            )}
          </div>
        </section>

        {/* 結果一覧 */}
        {phase !== 'idle' && phase !== 'running' && (
          <section className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-black/5 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-gray-500">
                校正案 ({totalChangeCount} 件)
              </h2>
              {totalChangeCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (selectedIds.size === totalChangeCount) setSelectedIds(new Set());
                    else setSelectedIds(new Set(visibleProposals.map(p => p.id)));
                    tapHaptic();
                  }}
                  className="text-[11px] text-[var(--color-primary)] active:opacity-60"
                >
                  {selectedIds.size === totalChangeCount ? '全解除' : '全選択'}
                </button>
              )}
            </div>

            {totalChangeCount === 0 ? (
              <div className="px-4 py-8 text-center text-[13px] text-gray-500">
                {phase === 'done' ? '校正案なし。すべてすでに綺麗な文章でした ✨' : ''}
              </div>
            ) : (
              <ul className="divide-y divide-black/5">
                {visibleProposals.map(p => {
                  const memberId = visitMemberMap.get(p.id);
                  const memberName = memberId ? (memberNames.get(memberId) ?? '') : '';
                  const isSelected = selectedIds.has(p.id);
                  const isExpanded = expanded.has(p.id);
                  return (
                    <li key={p.id} className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(p.id)}
                          className="mt-1 shrink-0 w-4 h-4 accent-[var(--color-primary)]"
                        />
                        <div className="flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleExpand(p.id)}
                            className="w-full text-left flex items-center justify-between gap-2"
                          >
                            <span className="text-[12px] font-bold text-gray-900 truncate">
                              {memberName || p.id}
                            </span>
                            {isExpanded ? <ChevronUp size={14} className="text-gray-400 shrink-0" /> : <ChevronDown size={14} className="text-gray-400 shrink-0" />}
                          </button>
                          {/* 校正後 (常時表示・短縮) */}
                          {!isExpanded && (
                            <p className="text-[12px] text-gray-700 mt-1 line-clamp-2 leading-relaxed">
                              {p.proposed}
                            </p>
                          )}
                          {/* 展開時: 原文 + 校正後 を並べて表示 */}
                          {isExpanded && (
                            <div className="mt-2 space-y-2">
                              <div className="text-[11px] bg-red-50 border border-red-100 rounded p-2">
                                <div className="text-[10px] text-red-600 font-bold mb-1">🔴 原文</div>
                                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{p.original}</p>
                              </div>
                              {/* 緑の校正後カード — タップで textarea 化、blur で確定 */}
                              {editingId === p.id ? (
                                <div className="text-[11px] bg-emerald-50 border-2 border-emerald-400 rounded p-2">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="text-[10px] text-emerald-600 font-bold">✏️ 編集中</div>
                                    <button
                                      type="button"
                                      onClick={commitEdit}
                                      className="text-[10px] text-emerald-700 font-bold active:opacity-60"
                                    >
                                      完了
                                    </button>
                                  </div>
                                  <textarea
                                    ref={editTextareaRef}
                                    value={editBuffer}
                                    onChange={e => setEditBuffer(e.target.value)}
                                    onBlur={commitEdit}
                                    autoFocus
                                    className="w-full text-[12px] text-gray-700 leading-relaxed bg-white border border-emerald-200 rounded p-2 outline-none resize-none focus:border-emerald-400"
                                    style={{ minHeight: 60, fontFamily: 'inherit' }}
                                  />
                                  <p className="mt-1 text-[10px] text-emerald-700/70">
                                    💡 改行は そのまま入力できる。空欄にすると元の校正案が保持される。
                                  </p>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => startEdit(p.id, p.proposed)}
                                  className="block w-full text-left text-[11px] bg-emerald-50 border border-emerald-100 rounded p-2 active:bg-emerald-100 transition-colors"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                      🟢 校正後
                                      {p.userEdited && (
                                        <span className="ml-1 px-1 py-0.5 rounded bg-emerald-200 text-emerald-800 text-[9px]">
                                          編集済み
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-emerald-600/70 inline-flex items-center gap-0.5">
                                      <Pencil size={10} />
                                      タップで編集
                                    </span>
                                  </div>
                                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{p.proposed}</p>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleApply([p.id])}
                                disabled={phase === 'applying' || editingId === p.id}
                                className="text-[11px] text-[var(--color-primary)] font-bold active:opacity-60 disabled:opacity-40"
                              >
                                この 1 件だけ反映
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* 一括反映ボタン */}
            {totalChangeCount > 0 && (
              <div className="px-4 py-3 border-t border-black/5 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleApply(Array.from(selectedIds))}
                  disabled={allSelectedCount === 0 || phase === 'applying'}
                  className="flex-1 h-10 rounded-full bg-[#111] text-white text-[13px] font-bold inline-flex items-center justify-center gap-1 disabled:opacity-40 active:scale-95 transition-transform"
                >
                  {phase === 'applying' ? (
                    <><Loader2 size={14} className="animate-spin" />反映中…</>
                  ) : (
                    `選択中 ${allSelectedCount} 件 を反映`
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleApply(visibleProposals.map(p => p.id))}
                  disabled={phase === 'applying'}
                  className="flex-1 h-10 rounded-full border-2 border-[#111] text-[#111] text-[13px] font-bold inline-flex items-center justify-center gap-1 disabled:opacity-40 active:scale-95 transition-transform"
                >
                  全 {totalChangeCount} 件 を反映
                </button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
