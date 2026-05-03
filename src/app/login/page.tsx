'use client';

// ──────────────────────────────────────────────────────────────
// /login — メアド + 6 桁コード方式のログイン画面
//
// 1. メアド入力 → 「コードを送信」
// 2. メール届く(リンク + 6 桁コード)
// 3a. リンク踏める環境(Safari/PC) → 自動で /auth/callback → /
// 3b. PWA 等リンク踏めない環境 → アプリで 6 桁コード入力 → ログイン
//
// iOS の standalone PWA は Safari と完全独立した storage を持つため、
// マジックリンクだけでは PWA 内ログインを完結できない。コード入力モードが
// PWA 用のフォールバック。
// ──────────────────────────────────────────────────────────────

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Loader2, Check, KeyRound } from 'lucide-react';
import { signInWithEmailOtp, verifyEmailOtp, useAuthUser } from '../../lib/auth';

// Next.js 16: useSearchParams を使う Client Component は CSR bailout 対策で
// Suspense でラップしないと プリレンダー が落ちる。
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-[var(--color-subtext)]" />
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading: authLoading } = useAuthUser();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [phase, setPhase] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 既にログイン済みなら / (or next URL) へ戻す
  useEffect(() => {
    if (authLoading || !user) return;
    const next = params?.get('next') ?? '/';
    router.replace(next);
  }, [authLoading, user, router, params]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setBusy(true);
    const res = await signInWithEmailOtp(email.trim());
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setPhase('code');
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = code.replace(/\D/g, '');
    if (cleaned.length !== 6) {
      setError('6 桁の数字を入力してな');
      return;
    }
    setError(null);
    setBusy(true);
    const res = await verifyEmailOtp(email.trim(), cleaned);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    // 成功 → useAuthUser が user を取得 → useEffect で next にリダイレクト
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

        {phase === 'email' && (
          <form onSubmit={handleSendCode} className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E7EB]">
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
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="w-full mt-4 h-11 rounded-full bg-[#111] text-white text-[14px] font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
            >
              {busy ? (
                <><Loader2 size={16} className="animate-spin" />送信中…</>
              ) : (
                'ログインコードを送信'
              )}
            </button>
            <p className="mt-3 text-[11px] text-[var(--color-subtext)] text-center leading-relaxed">
              メールに 6 桁のコードと ログインリンクを送ります。<br />
              どちらか好きな方でログインできます。
            </p>
          </form>
        )}

        {phase === 'code' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E7EB]">
            <div className="w-12 h-12 rounded-full bg-[#10B981]/10 mx-auto mb-3 flex items-center justify-center">
              <Check size={22} className="text-[#10B981]" />
            </div>
            <h2 className="text-base font-bold text-center mb-1">メールを送信しました</h2>
            <p className="text-[13px] text-[var(--color-subtext)] text-center leading-relaxed mb-5">
              <span className="font-bold text-[#111]">{email}</span> 宛に<br />
              ログイン用のメールを送ったで。<br />
              下の欄に <strong>6 桁のコード</strong>を入れるか、メール内のリンクをタップしてな。
            </p>

            <form onSubmit={handleVerifyCode}>
              <label className="text-sm font-semibold text-[var(--color-subtext)] block mb-2">
                6 桁コード
              </label>
              <div className="relative">
                <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-icon-gray)]" />
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full h-12 rounded-[10px] border border-[#E5E7EB] pl-10 pr-3 text-[20px] tracking-[0.4em] text-center outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={busy || code.length !== 6}
                className="w-full mt-4 h-11 rounded-full bg-[#111] text-white text-[14px] font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
              >
                {busy ? (
                  <><Loader2 size={16} className="animate-spin" />認証中…</>
                ) : (
                  'ログイン'
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={() => { setPhase('email'); setCode(''); setError(null); }}
              className="mt-4 w-full text-[12px] text-[var(--color-primary)] active:opacity-60"
            >
              別のメールアドレスでやり直す
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
