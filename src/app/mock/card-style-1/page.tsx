'use client';

// 案 1: ボーダーレス + 柔らか二重シャドウ (App Store風)
import Link from 'next/link';
import { StyleVariantSheet } from '../_card-style-shared/SampleCard';

export default function MockCardStyle1Page() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-20">
      <div className="max-w-[420px] mx-auto px-3 py-4">
        <div className="mb-4">
          <h1 className="text-xl font-bold mb-1">案 1</h1>
          <p className="text-[12px] text-[#6B6B6B]">App Store 風: 枠線なし + 近距離&amp;遠距離の柔らか二重影</p>
          <Link href="/mock/card-style" className="text-[12px] underline mt-2 inline-block">← 一覧へ戻る</Link>
        </div>
        <StyleVariantSheet variant={1} />
      </div>
    </div>
  );
}
