'use client';
import Link from 'next/link';
import { STYLES, StyleVariantSheet } from '../_card-style-shared/SampleCard';

const N = 3;
export default function Page() {
  const e = STYLES[N - 1];
  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-20">
      <div className="max-w-[420px] mx-auto px-3 py-4">
        <div className="mb-4">
          <h1 className="text-xl font-bold mb-1">案 {N}: {e.title}</h1>
          <Link href="/mock/card-style" className="text-[12px] underline mt-2 inline-block">← 一覧へ戻る</Link>
        </div>
        <StyleVariantSheet entry={e} />
      </div>
    </div>
  );
}
