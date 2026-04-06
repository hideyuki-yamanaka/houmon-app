'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="h-full flex items-center justify-center">
      <p className="text-[var(--color-subtext)]">リダイレクト中...</p>
    </div>
  );
}
