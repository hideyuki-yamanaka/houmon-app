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
          <h1 className="text-xl font-bold mb-1">カード ドロップシャドウ 10 案 v2</h1>
          <p className="text-[12px] text-[#6B6B6B] leading-snug">
            全案とも 2-3 層のマルチレイヤー box-shadow で「明確な立体感」を出す構成。
            「控えめ → 濃く・強く」の順に並べてあるので、上から下へ降りていくと段々浮いていく。
            実際の <code className="text-[11px]">MemberCard</code> に当て込み。
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

        {/* マルチレイヤー シャドウ研究ノート (折りたたみ) */}
        <details className="mb-6 bg-white rounded-xl p-3 border border-[rgba(0,0,0,0.04)]">
          <summary className="text-[12px] font-bold cursor-pointer">📚 マルチレイヤー シャドウの考え方</summary>
          <div className="mt-2 space-y-2 text-[11px] text-[#6B6B6B] leading-relaxed">
            <p>
              <b>1. 2 層以上は単純な「色を重ねる」じゃない</b> ―
              近距離 (1-2px) は接地感、中距離 (4-8px) は厚み、遠距離 (16-24px) は浮遊感。
              役割の違うレイヤーを重ねるから立体に見える。
            </p>
            <p>
              <b>2. スプレッド負 (-1px / -5px) は隠し味</b> ―
              Tailwind 系がよく使う。負スプレッドで影を内側に絞り、近距離影を「点」のように引き締め、
              遠距離影は広く拡散させる。3D 感が一気に出る。
            </p>
            <p>
              <b>3. 濃く強くしたい時は近距離を 18-30%、遠距離は 15-22%</b> ―
              控えめ案は黒 6-10% だが、強い表現にするなら近距離を 18-30% まで濃く。
              ステッカー風や Material 高 elevation はこの帯。
            </p>
            <p>
              <b>4. インセットハイライトでガラス感</b> ―
              <code className="text-[10px]">inset 0 1px 0 rgba(255,255,255,0.9)</code> を最上位レイヤーに足すと、
              上端が光って見えてカード自体が物理的に存在する感が増す (案 5)。
            </p>
            <p>
              <b>5. 角丸とのバランス</b> ―
              強い影 (案 7-10) は角丸 10-14px が相性良。小さい角丸 (6px) と濃影は古めかしく見える。
              全 10 案とも 10-14px の範囲で振ってある。
            </p>
            <p>
              <b>6. 並びは「弱い → 強い」</b> ―
              案 1-3: 業務アプリ系の控えめ、4-6: 標準的な elevation、7-10: 強調・濃い・立体感全開。
              用途によって選び分け、強い側ほど「ここを見て」のメッセージ性が出る。
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
