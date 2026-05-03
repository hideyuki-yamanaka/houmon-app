'use client';

// ──────────────────────────────────────────────────────────────
// /auth/callback — マジックリンクから戻ってきた時の中継ページ
//
// Supabase クライアントの onAuthStateChange が自動でセッションを確立する。
// ここでは単に「ログイン中…」を出して、user を取得できたら / にリダイレクト。
// 失敗したら /login に戻す。
// ──────────────────────────────────────────────────────────────

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthUser } from '../../../lib/auth';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { user, loading } = useAuthUser();

  useEffect(() => {
    if (loading) return;
    if (user) {
      // セッション確立 → next URL があればそこ、無ければ /
      let next = '/';
      try {
        const stored = sessionStorage.getItem('houmon:auth_next');
        if (stored) next = stored;
        sessionStorage.removeItem('houmon:auth_next');
      } catch {
        /* ignore */
      }
      router.replace(next);
    } else {
      // セッション無し(リンク切れ等) → ログイン画面へ
      router.replace('/login');
    }
  }, [loading, user, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-bg)] gap-3">
      <Loader2 size={24} className="animate-spin text-[var(--color-subtext)]" />
      <p className="text-sm text-[var(--color-subtext)]">ログイン中…</p>
    </div>
  );
}
