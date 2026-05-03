'use client';

// ──────────────────────────────────────────────────────────────
// AuthShell — Root Layout 直下のクライアントラッパー
//
// 役割:
//   - AuthGuard で全ページを認証必須にする(login / callback は素通し)
//   - BottomTabBar の表示/非表示を pathname で制御
//     → /login と /auth/callback ではタブバー非表示(完全に独立した画面に見せる)
// ──────────────────────────────────────────────────────────────

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import AuthGuard from './AuthGuard';
import BottomTabBar from './BottomTabBar';
import InstallBanner from './InstallBanner';
import OwnerContextBanner from './OwnerContextBanner';

const HIDE_TABBAR_PATHS = ['/login', '/auth/callback', '/invite'];

export default function AuthShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideTabBar = HIDE_TABBAR_PATHS.some(
    p => pathname === p || pathname?.startsWith(`${p}/`),
  );
  return (
    <AuthGuard>
      {!hideTabBar && <OwnerContextBanner />}
      {children}
      {!hideTabBar && <BottomTabBar />}
      {!hideTabBar && <InstallBanner />}
    </AuthGuard>
  );
}
