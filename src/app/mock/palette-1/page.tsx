'use client';

import Link from 'next/link';
import { PALETTE_EARTH } from '../palette/_palettes';
import { PaletteScreen } from '../palette/_screen';

export default function Page() {
  return (
    <div className="min-h-screen bg-[#EAEAEA] py-6 px-4">
      <div className="max-w-md mx-auto mb-4">
        <Link href="/mock/palette" className="text-sm text-[#525252] underline underline-offset-4">
          ← 比較ページに戻る
        </Link>
      </div>
      <div className="max-w-md mx-auto">
        <PaletteScreen palette={PALETTE_EARTH} />
      </div>
    </div>
  );
}
