'use client';

// ──────────────────────────────────────────────────────────────
// /settings/profile — 自分の表示名 設定画面
//
// 訪問ログの「誰が記入したか」表示で使う display_name を編集する。
// 共有機能で他のメンバーから見える名前なので、ハンドル名/苗字 等を
// 自由に入れられる。色は user_id から自動算出 (ユーザー操作不要)。
// ──────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, Check, AlertCircle, User as UserIcon } from 'lucide-react';
import { getMyProfile, updateMyDisplayName, colorForUser, initialOf } from '../../../lib/profile';
import { useAuthUser } from '../../../lib/auth';
import { useSwipeBack } from '../../../lib/useSwipeBack';

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
      // profile 行が無い (trigger 失敗等) → メアド左を初期値に
      const fallback = user?.email?.split('@')[0] ?? '';
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
  const color = colorForUser(user?.id);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* ヘッダ */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-black/5">
        <div className="max-w-[640px] mx-auto flex items-center px-2 py-2">
          <Link
            href="/settings"
            className="flex items-center gap-1 text-[15px] text-[var(--color-primary)] active:opacity-60 px-2 py-1"
          >
            <ChevronLeft size={20} />
            <span>戻る</span>
          </Link>
          <h1 className="flex-1 text-center text-[16px] font-semibold pr-12">プロフィール</h1>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-4 space-y-4">
        {/* プレビューカード */}
        <section className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-black/5">
            <h2 className="text-[13px] font-semibold text-gray-500">プレビュー</h2>
          </div>
          <div className="px-4 py-5 flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-[18px] font-bold shrink-0"
              style={{ background: color.bg, color: color.text }}
              aria-hidden="true"
            >
              {initialOf(displayName || '?')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-bold truncate">
                {displayName.trim() || '名前を入力してください'}
              </div>
              <div className="text-[11px] text-gray-500 mt-0.5">
                訪問ログにこの名前で表示されます
              </div>
            </div>
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0"
              style={{ background: color.bg, color: color.text }}
            >
              {displayName.trim() || '—'}
            </span>
          </div>
        </section>

        {/* 編集フォーム */}
        <section className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-black/5">
            <h2 className="text-[13px] font-semibold text-gray-500">表示名</h2>
          </div>

          <form onSubmit={handleSave} className="px-4 py-4 space-y-3">
            {loading || authLoading ? (
              <div className="flex items-center gap-2 text-[13px] text-gray-500 py-2">
                <Loader2 size={16} className="animate-spin" />
                読み込み中…
              </div>
            ) : (
              <>
                <div className="relative">
                  <UserIcon
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-icon-gray)]"
                  />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="例: ヒデ / 山中"
                    maxLength={30}
                    required
                    className="w-full h-11 rounded-[10px] border border-[#E5E7EB] pl-10 pr-3 text-[15px] outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                <p className="text-[11px] text-gray-500 leading-relaxed">
                  共有してる家族や同僚から見える名前やで。30文字以内で。
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

        {/* 補助情報 */}
        <section className="bg-[#F9FAFB] rounded-2xl px-4 py-3 border border-black/5">
          <div className="text-[12px] text-gray-600 leading-relaxed">
            💡 <strong>色は自動で決まる</strong>から変えられへん。<br />
            同じユーザーは いつ見ても同じ色で表示されるで。
          </div>
        </section>
      </main>
    </div>
  );
}
