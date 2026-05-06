'use client';

// メンバーカード 枠線 + シャドウ 5 案 一覧ページ。
// App Store / Airbnb 風の「ミニマムだけど立体感」を狙うバリエーション。
// このページに 5 案を全部並べてざっと比較できるようにする。各案の単体ページへのリンクも置く。

import Link from 'next/link';
import { StyleVariantSheet, STYLES } from '../_card-style-shared/SampleCard';

export default function MockCardStyleIndexPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-20">
      <div className="max-w-[420px] mx-auto px-3 py-4">
        <div className="mb-4">
          <h1 className="text-xl font-bold mb-1">カード枠線 + シャドウ 5 案</h1>
          <p className="text-[12px] text-[#6B6B6B] leading-snug">
            App Store / Airbnb 風の「ミニマムだけどスタイリッシュ、ちょっと立体感」を 5 パターンで比較。
            各案ページでは単体表示で実機の触感を確認できます。
          </p>
          <Link href="/" className="text-[12px] underline mt-2 inline-block">← ホームへ戻る</Link>
        </div>

        {/* 各案へのジャンプリンク */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <Link
              key={n}
              href={`/mock/card-style-${n}`}
              className="bg-white rounded-lg py-2 text-center text-[12px] font-bold border border-[rgba(0,0,0,0.06)] active:opacity-60"
            >
              案 {n}
            </Link>
          ))}
        </div>

        <div className="space-y-8">
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <div key={n}>
              <StyleVariantSheet variant={n} />
              <div className="mt-2 px-1">
                <Link
                  href={`/mock/card-style-${n}`}
                  className="text-[11px] underline text-[#6B6B6B]"
                >
                  → 案 {n} 単体ページで見る
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 px-1">
          <h3 className="text-[13px] font-bold mb-2">参考</h3>
          <p className="text-[11px] text-[#6B6B6B] leading-relaxed">
            App Store: 枠線なし + 柔らかい二重シャドウ + 大きめの角丸。
            Airbnb: 極薄ヘアラインボーダー + 控えめな影 + 12px 角丸。
            どちらも「線は薄いけど影で輪郭を補強」という共通方針。
          </p>
        </div>

        {/* 各案のスタイル仕様まとめ (デバッグ用) */}
        <details className="mt-6">
          <summary className="text-[11px] text-[#6B6B6B] cursor-pointer">CSS 仕様まとめ</summary>
          <div className="mt-2 space-y-2">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <pre key={n} className="text-[10px] text-[#6B6B6B] bg-[#F8F8F8] rounded-md p-2 overflow-x-auto leading-snug">{`案 ${n}: ${STYLES[n].title.replace(/^案 \d+: /, '')}\n  border: ${STYLES[n].style.border}\n  box-shadow: ${STYLES[n].style.shadow}\n  border-radius: ${STYLES[n].style.radius}`}</pre>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
