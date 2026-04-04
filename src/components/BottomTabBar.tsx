'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Calendar, Users, LayoutDashboard } from 'lucide-react';

const TABS = [
  { href: '/', label: 'ホーム', icon: MapPin },
  { href: '/calendar', label: 'カレンダー', icon: Calendar },
  { href: '/members', label: 'メンバー', icon: Users },
  { href: '/log', label: 'ダッシュボード', icon: LayoutDashboard },
] as const;

export default function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="tab-bar fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-[920px] mx-auto flex">
        {TABS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-[var(--color-primary)]'
                  : 'text-[var(--color-icon-gray)]'
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.2 : 1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
