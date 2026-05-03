'use client';

// ──────────────────────────────────────────────────────────────
// AuthGuard — 子ツリーを認証必須にするラッパー
//
// /login と /auth/callback 以外のページをこのガードで包む。
// 未ログインなら /login に redirect、認証チェック中はローディング表示。
// ──────────────────────────────────────────────────────────────

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { isMockMode } from '../lib/supabase';
import { useAuthUser } from '../lib/auth';

// 認証不要のパス(ホワイトリスト)
const PUBLIC_PATHS = ['/login', '/auth/callback'];

export default function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuthUser();

  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname?.startsWith(`${p}/`));

  useEffect(() => {
    if (isMockMode) return; // ローカル mock は認証不要
    if (loading) return;
    if (!user && !isPublic) {
      router.replace('/login');
    }
  }, [user, loading, isPublic, pathname, router]);

  // mock mode は素通し
  if (isMockMode) return <>{children}</>;
  // 公開ページは素通し
  if (isPublic) return <>{children}</>;
  // 認証チェック中
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-[var(--color-subtext)]" />
      </div>
    );
  }
  // 未認証(redirect 待ち)は何も描画しない
  if (!user) return null;
  return <>{children}</>;
}
