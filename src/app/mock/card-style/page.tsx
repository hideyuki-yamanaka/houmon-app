'use client';

// メンバーカード 枠線 + シャドウ 10 案 一覧 (v2)。
// 実際の MemberCard コンポーネントに当て込んで、ボトムシート風背景の上で 10 案を比較。

import Link from 'next/link';
import { STYLES, StyleVariantSheet } from '../_card-style-shared/SampleCard';

export default function MockCardStyleIndexPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-20">
      <div className="max-w-[420px] mx-auto px-3 py-4">
        <div className="mb-4">
          <h1 className="text-xl font-bold mb-1">カード枠線 + シャドウ 10 案</h1>
          <p className="text-[12px] text-[#6B6B6B] leading-snug">
            実在アプリ (App Store / Airbnb / Notion / Linear / Stripe / Spotify / Material 等) の
            elevation 表現を研究し、「ミニマムだけど立体感」のスペクトラムを 10 パターンに整理。
            実際の <code className="text-[11px]">MemberCard</code> コンポーネントに当て込んで表示。
          </p>
          <Link href="/" className="text-[12px] underline mt-2 inline-block">← ホームへ戻る</Link>
        </div>

        {/* 各案へのジャンプ */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          {STYLES.map((e) => (
            <Link
              key={e.num}
              href={`/mock/card-style-${e.num}`}
              className="bg-white rounded-lg py-2 text-center text-[12px] font-bold border border-[rgba(0,0,0,0.06)] active:opacity-60"
            >
              案 {e.num}
            </Link>
          ))}
        </div>

        {/* 研究ノート (折りたたみ) */}
        <details className="mb-6 bg-white rounded-xl p-3 border border-[rgba(0,0,0,0.04)]">
          <summary className="text-[12px] font-bold cursor-pointer">📚 シャドウ表現の研究ノート</summary>
          <div className="mt-2 space-y-2 text-[11px] text-[#6B6B6B] leading-relaxed">
            <p>
              <b>1. 二重シャドウは Apple/Notion 系の定番</b> ―
              「近距離 1px (接地) + 遠距離 (空気)」の重ねがけで、輪郭の鮮明さと浮遊感を両立。
              単一シャドウより自然な見え方になる。
            </p>
            <p>
              <b>2. 影の濃さは 4〜10% が黄金帯</b> ―
              黒 8% (rgba 0,0,0,0.08) を超えると一気にやぼったくなる。Airbnb/Apple は概ね 5〜7%。
            </p>
            <p>
              <b>3. ボーダーかシャドウかは選ぶ</b> ―
              両方濃く入れると重い (現状はこれ)。Linear/Stripe はクリスプな 1px ボーダー単独で行き、
              Apple/Spotify は border 0 + シャドウ単独。トレードオフ。
            </p>
            <p>
              <b>4. ボーダーを残すなら rgba 0.04〜0.06</b> ―
              0.08 だと「枠線」感が出すぎる。ヘアライン (4-6%) に落とせばシャドウと喧嘩しない。
            </p>
            <p>
              <b>5. 角丸は内容と相談</b> ―
              情報密度が高いリスト → 8px (Material/Linear)、ゆとり重視 → 12〜14px (Apple)。
              現状の 6px はやや古典的。12px のほうが今風。
            </p>
            <p>
              <b>6. 着色シャドウで個性</b> ―
              純黒の代わりに rgb(17,24,39,*) のようなクールトーン or 組織色を 8% で入れると、
              背景白でも空気感が変わる。Vercel/Linear の dark UI 由来のテクニック。
            </p>
          </div>
        </details>

        <div className="space-y-8">
          {STYLES.map((entry) => (
            <div key={entry.num}>
              <StyleVariantSheet entry={entry} />
              <div className="mt-2 px-1">
                <Link
                  href={`/mock/card-style-${entry.num}`}
                  className="text-[11px] underline text-[#6B6B6B]"
                >
                  → 案 {entry.num} 単体ページで見る
                </Link>
              </div>
            </div>
          ))}
        </div>

        <details className="mt-6">
          <summary className="text-[11px] text-[#6B6B6B] cursor-pointer">CSS 仕様まとめ (10 案)</summary>
          <div className="mt-2 space-y-2">
            {STYLES.map((e) => (
              <pre key={e.num} className="text-[10px] text-[#6B6B6B] bg-[#F8F8F8] rounded-md p-2 overflow-x-auto leading-snug">{`案 ${e.num}: ${e.title}\n  border: ${e.style.border}\n  box-shadow: ${e.style.shadow}\n  border-radius: ${e.style.radius}`}</pre>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
