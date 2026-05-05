'use client';

// Leaflet は SSR 不可なので 子コンポーネントを dynamic import で
// クライアントサイド限定にする。
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const PinEditView = dynamic(() => import('./PinEditView'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <Loader2 size={20} className="animate-spin text-[var(--color-subtext)]" />
    </div>
  ),
});

export default function MemberPinEditPage() {
  return <PinEditView />;
}
