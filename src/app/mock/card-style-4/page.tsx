'use client';

// 案 4: 二段シャドウ Notion風 (奥行き)
import Link from 'next/link';
import { StyleVariantSheet } from '../_card-style-shared/SampleCard';

export default function MockCardStyle4Page() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-20">
      <div className="max-w-[420px] mx-auto px-3 py-4">
        <div className="mb-4">
          <h1 className="text-xl font-bold mb-1">案 4</h1>
          <p className="text-[12px] text-[#6B6B6B]">Notion 風: 近距離 + 遠距離 (24px) の二段影で奥行き</p>
          <Link href="/mock/card-style" className="text-[12px] underline mt-2 inline-block">← 一覧へ戻る</Link>
        </div>
        <StyleVariantSheet variant={4} />
      </div>
    </div>
  );
}
