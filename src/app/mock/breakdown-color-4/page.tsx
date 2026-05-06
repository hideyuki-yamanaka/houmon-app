'use client';

import Link from 'next/link';
import { BreakdownPreview, THEMES } from '../breakdown-color/_preview';

const theme = THEMES[3];

export default function Page() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-6 px-4">
      <div className="max-w-md mx-auto mb-4">
        <Link href="/mock/breakdown-color" className="text-sm text-[var(--color-subtext)] underline underline-offset-4">
          ← 配色比較に戻る
        </Link>
        <h1 className="text-2xl font-bold mt-2 mb-1">{theme.name}</h1>
        <p className="text-sm text-[var(--color-subtext)]">{theme.caption}</p>
      </div>
      <div className="max-w-md mx-auto">
        <BreakdownPreview theme={theme} />
      </div>
    </div>
  );
}
