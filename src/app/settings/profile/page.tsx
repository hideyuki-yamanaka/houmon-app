'use client';

// ──────────────────────────────────────────────────────────────
// /settings/profile — 自分の表示名 設定画面
//
// 訪問ログの「誰が記入したか」表示で使う display_name を編集する。
//
// ヒデさん指示 (2026-05-03 v3):
//   - 色分けは廃止 (アイコンと文字はグレースケール)
//   - 5 文字制限を厳格化 (バッジが崩れんように)
//   - 「苗字を入力してください」ガイドを明確に
// ──────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, Check, AlertCircle } from 'lucide-react';
import { getMyProfile, updateMyDisplayName, DISPLAY_NAME_MAX } from '../../../lib/profile';
import { useAuthUser } from '../../../lib/auth';
import { useSwipeBack } from '../../../lib/useSwipeBack';
import PersonIcon from '../../../components/PersonIcon';
import { tapHaptic } from '../../../lib/haptics';

export default function ProfileSettingsPage() {
  const router = useRouter();
  useSwipeBack(() => router.back());

  const { user, loading: authLoading } = useAuthUser();
  const [displayName, setDisplayName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const p = await getMyProfile();
    if (p) {
      setDisplayName(p.display_name);
      setOriginalName(p.display_name);
    } else {
      // profile 行が無い場合: メアド左を初期値に (5 文字に切り詰め)
      const fallback = (user?.email?.split('@')[0] ?? '').slice(0, DISPLAY_NAME_MAX);
      setDisplayName(fallback);
      setOriginalName('');
    }
    setLoading(false);
  }, [user?.email]);

  useEffect(() => {
    if (authLoading || !user) return;
    refresh();
  }, [authLoading, user, refresh]);

  // 保存メッセージは 2秒で消す
  useEffect(() => {
    if (!savedAt) return;
    const t = setTimeout(() => setSavedAt(null), 2000);
    return () => clearTimeout(t);
  }, [savedAt]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError(null);
    setSaving(true);
    tapHaptic();
    const res = await updateMyDisplayName(displayName);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? '保存できませんでした');
      return;
    }
    setOriginalName(displayName.trim());
    setSavedAt(Date.now());
  };

  const dirty = displayName.trim() !== originalName && displayName.trim().length > 0;
  const previewName = displayName.trim() || '—';

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
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
          <h1 className="flex-1 text-center text-[16px] font-semibold pr-12">プロフィール</h1>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-4 space-y-4">
        {/* プレビューカード — 訪問ログでこう見える、を再現 */}
        <section className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-black/5">
            <h2 className="text-[13px] font-semibold text-gray-500">訪問ログでの表示</h2>
          </div>
          <div className="px-4 py-5">
            <div className="ios-card p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-bold">2026年4月25日</span>
                  <span className="ml-auto inline-flex items-center gap-0.5 text-[12px] text-gray-900 font-bold whitespace-nowrap">
                    <PersonIcon size={13} />
                    {previewName}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-subtext)] mt-1.5 line-clamp-2">
                  訪問ログのプレビュー（イメージ）
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 編集フォーム */}
        <section className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-black/5">
            <h2 className="text-[13px] font-semibold text-gray-500">表示名 (苗字)</h2>
          </div>

          <form onSubmit={handleSave} className="px-4 py-4 space-y-3">
            {loading || authLoading ? (
              <div className="flex items-center gap-2 text-[13px] text-gray-500 py-2">
                <Loader2 size={16} className="animate-spin" />
                読み込み中…
              </div>
            ) : (
              <>
                <p className="text-[12px] text-gray-700 leading-relaxed">
                  <strong>苗字を入力してください</strong>（例: ヒデ / 山中 / ヤマナカ）。
                </p>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <PersonIcon size={16} />
                  </span>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value.slice(0, DISPLAY_NAME_MAX))}
                    placeholder="ヤマナカ"
                    maxLength={DISPLAY_NAME_MAX}
                    required
                    autoComplete="off"
                    className="w-full h-11 rounded-[10px] border border-[#E5E7EB] pl-10 pr-14 text-[15px] outline-none focus:border-[var(--color-primary)]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 tabular-nums">
                    {displayName.length} / {DISPLAY_NAME_MAX}
                  </span>
                </div>

                <p className="text-[11px] text-gray-500 leading-relaxed">
                  ⚠️ <strong>{DISPLAY_NAME_MAX} 文字以内</strong>で入れてな。バッジに収まる長さに統一するためや。
                </p>

                {error && (
                  <div className="flex items-start gap-1 text-[12px] text-red-600">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {savedAt && (
                  <div className="flex items-center gap-1 text-[12px] text-emerald-600">
                    <Check size={14} className="shrink-0" />
                    <span>保存しました</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!dirty || saving}
                  className="w-full mt-2 h-11 rounded-full bg-[#111] text-white text-[14px] font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
                >
                  {saving ? (
                    <><Loader2 size={16} className="animate-spin" />保存中…</>
                  ) : (
                    '保存'
                  )}
                </button>
              </>
            )}
          </form>
        </section>
      </main>
    </div>
  );
}
