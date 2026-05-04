'use client';

// ──────────────────────────────────────────────────────────────
// /onboarding/profile — 招待された人の初回オンボーディング
//
// /invite/[token] で参加処理 完了後にここへリダイレクト。
// 表示名 (苗字) を設定してもらってからホームに進む。
// 訪問ログのバッジで自分が誰なのかを 共有相手から識別できるようにする。
//
// ヒデさん指示 (2026-05-04): 招待のオンボーディングで名前を決めてほしい
// ──────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { getMyProfile, updateMyDisplayName, DISPLAY_NAME_MAX } from '../../../lib/profile';
import { useAuthUser } from '../../../lib/auth';
import PersonIcon from '../../../components/PersonIcon';
import { tapHaptic } from '../../../lib/haptics';

export default function OnboardingProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthUser();
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 既存の display_name を取得 (trigger で メアド@前 が入ってるはず)
  // → 初期値として表示し、変えてもよし そのままでもよし
  const refresh = useCallback(async () => {
    setLoading(true);
    const p = await getMyProfile();
    if (p) {
      setDisplayName(p.display_name.slice(0, DISPLAY_NAME_MAX));
    } else {
      const fallback = (user?.email?.split('@')[0] ?? '').slice(0, DISPLAY_NAME_MAX);
      setDisplayName(fallback);
    }
    setLoading(false);
  }, [user?.email]);

  useEffect(() => {
    if (authLoading || !user) return;
    refresh();
  }, [authLoading, user, refresh]);

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const trimmed = displayName.trim();
    if (!trimmed) {
      setError('名前を入力してください');
      return;
    }
    setError(null);
    setSaving(true);
    tapHaptic();
    const res = await updateMyDisplayName(trimmed);
    if (!res.ok) {
      setError(res.error ?? '保存に失敗しました');
      setSaving(false);
      return;
    }
    // 保存できたら ホームへ
    router.replace('/');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-1">家庭訪問アプリへようこそ</h1>
        <p className="text-sm text-[var(--color-subtext)] text-center mb-8">
          まずはご自身の表示名を設定してください
        </p>

        <div
          className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E7EB] flex flex-col"
          style={{ minHeight: 380 }}
        >
          {loading || authLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          ) : (
            <form onSubmit={handleContinue} className="flex-1 flex flex-col">
              {/* プレビュー: 訪問ログでこう見える */}
              <div className="mb-4">
                <p className="text-[11px] font-semibold text-[var(--color-subtext)] mb-2">
                  訪問ログでの表示
                </p>
                <div className="ios-card p-3 flex items-center gap-2">
                  <span className="text-[12px] font-bold tabular-nums">2026年4月25日</span>
                  <span className="ml-auto inline-flex items-center gap-0.5 text-[12px] text-gray-900 font-bold whitespace-nowrap">
                    <PersonIcon size={13} />
                    {displayName.trim() || '—'}
                  </span>
                </div>
              </div>

              <label className="text-sm font-semibold text-[var(--color-subtext)] block mb-2">
                苗字を入力してください
              </label>
              <p className="text-[12px] text-gray-700 leading-relaxed mb-2">
                例: ヒデ / 山中 / ヤマナカ
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
                  autoFocus
                  className="w-full h-11 rounded-[10px] border border-[#E5E7EB] pl-10 pr-14 text-[15px] outline-none focus:border-[var(--color-primary)]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400 tabular-nums">
                  {displayName.length} / {DISPLAY_NAME_MAX}
                </span>
              </div>

              <p className="mt-2 text-[11px] text-gray-500 leading-relaxed">
                ⚠️ <strong>{DISPLAY_NAME_MAX} 文字以内</strong>で入力してください。バッジに収まる長さに統一しています。
              </p>

              {error && (
                <div className="mt-2 flex items-start gap-1 text-[12px] text-red-600">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={saving || !displayName.trim()}
                className="w-full mt-auto h-11 rounded-full bg-[#111] text-white text-[14px] font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
              >
                {saving ? (
                  <><Loader2 size={16} className="animate-spin" />保存中…</>
                ) : (
                  <>はじめる<ArrowRight size={16} /></>
                )}
              </button>

              <p className="mt-3 text-[10px] text-gray-400 text-center leading-relaxed">
                あとから 設定 → プロフィール で変更できます
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
