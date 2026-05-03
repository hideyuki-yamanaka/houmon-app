'use client';

// ──────────────────────────────────────────────────────────────
// OwnerContextBanner — 招待された人に「○○さんのデータを表示中」を出す
//
// useOwnerContext() で 自分が招待された側か判定し、招待された人だけ
// 画面上部に小さなバナーを表示する。オーナー本人には何も出さない。
//
// AuthShell の children の前に挟む想定 (Layout 直下)。
// ──────────────────────────────────────────────────────────────

import { User as UserIcon } from 'lucide-react';
import { useOwnerContext } from '../lib/auth';

export default function OwnerContextBanner() {
  const { isOwner, ownerName, loading } = useOwnerContext();

  if (loading || isOwner) return null;

  const label = ownerName ? `${ownerName}さん` : '別ユーザー';

  return (
    <div
      className="w-full bg-[#FFF7ED] border-b border-[#FED7AA] text-[#9A3412] text-[12px] py-1.5 px-3 flex items-center justify-center gap-1.5"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 6px)' }}
      role="status"
    >
      <UserIcon size={13} className="shrink-0" />
      <span className="truncate">
        <strong className="font-bold">{label}</strong>のデータを表示中
      </span>
    </div>
  );
}
