'use client';

// ──────────────────────────────────────────────────────────────
// /login — マジックリンク方式のログイン画面
//
// 1. メアド入力 → 「リンクを送信」
// 2. 受信した URL をクリック → /auth/callback → / へリダイレクト
// 既にログイン済みなら / にリダイレクト
// ──────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Loader2, Check } from 'lucide-react';
import { signInWithMagicLink, useAuthUser } from '../../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthUser();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 既にログイン済みなら / へ戻す
  useEffect(() => {
    if (!authLoading && user) router.replace('/');
  }, [authLoading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setSending(true);
    const res = await signInWithMagicLink(email.trim());
    setSending(false);
    if (res.error) setError(res.error);
    else setSent(true);
  };

  // 認証状態チェック中はローディング
  if (authLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-[var(--color-subtext)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-1">家庭訪問アプリ</h1>
        <p className="text-sm text-[var(--color-subtext)] text-center mb-8">
          メールアドレスでログイン
        </p>

        {sent ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E7EB] text-center">
            <div className="w-12 h-12 rounded-full bg-[#10B981]/10 mx-auto mb-3 flex items-center justify-center">
              <Check size={22} className="text-[#10B981]" />
            </div>
            <h2 className="text-base font-bold mb-1">メールを送信しました</h2>
            <p className="text-[13px] text-[var(--color-subtext)] leading-relaxed">
              <span className="font-bold text-[#111]">{email}</span> に<br />
              ログイン用のリンクを送りました。<br />
              メールを開いてリンクをタップしてな。
            </p>
            <button
              type="button"
              onClick={() => { setSent(false); setEmail(''); }}
              className="mt-4 text-[12px] text-[var(--color-primary)] active:opacity-60"
            >
              別のメールで送り直す
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E7EB]">
            <label className="text-sm font-semibold text-[var(--color-subtext)] block mb-2">
              メールアドレス
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-icon-gray)]" />
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-11 rounded-[10px] border border-[#E5E7EB] pl-10 pr-3 text-[15px] outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            {error && (
              <p className="mt-2 text-xs text-red-600">{error}</p>
            )}
            <button
              type="submit"
              disabled={sending || !email.trim()}
              className="w-full mt-4 h-11 rounded-full bg-[#111] text-white text-[14px] font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
            >
              {sending ? (
                <><Loader2 size={16} className="animate-spin" />送信中…</>
              ) : (
                'ログインリンクを送信'
              )}
            </button>
            <p className="mt-3 text-[11px] text-[var(--color-subtext)] text-center leading-relaxed">
              パスワード不要。届いたメールのリンクをタップするだけでログインできます。
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
