'use client';

// ──────────────────────────────────────────────────────────────
// AuthGuard — 子ツリーを認証必須にするラッパー
//
// /login と /auth/callback 以外のページをこのガードで包む。
// 未ログインなら /login に redirect、認証チェック中はローディング表示。
//
// 緊急 ON/OFF スイッチ:
//   NEXT_PUBLIC_AUTH_ENABLED='1' の時だけ認証必須になる。
//   未設定 or それ以外なら認証スキップ(全員素通し)。
//   Phase 1 移行中の "Supabase 側の準備が終わるまで素通し" 用。
// ──────────────────────────────────────────────────────────────

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { isMockMode } from '../lib/supabase';
import { useAuthUser } from '../lib/auth';

// 認証不要のパス(ホワイトリスト)
//   /invite/[token] は 中で 「未ログインなら /login?next=... に飛ばす」 を
//   独自に行うため、 AuthGuard 側では素通しさせる。
const PUBLIC_PATHS = ['/login', '/auth/callback', '/invite'];

// マルチユーザー化 移行中の緊急スイッチ。
// Vercel の env で NEXT_PUBLIC_AUTH_ENABLED=1 にした時だけ認証ガードが効く。
const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === '1';

export default function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuthUser();

  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname?.startsWith(`${p}/`));

  useEffect(() => {
    if (!AUTH_ENABLED) return; // 認証 OFF: スキップ
    if (isMockMode) return; // ローカル mock は認証不要
    if (loading) return;
    if (!user && !isPublic) {
      router.replace('/login');
    }
  }, [user, loading, isPublic, pathname, router]);

  // 認証 OFF: 全部素通し(Phase 1 移行中)
  if (!AUTH_ENABLED) return <>{children}</>;
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
