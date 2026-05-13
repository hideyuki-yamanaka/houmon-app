'use client';

// 同一住所でピンが重なる問題のUI案 一覧
// 5案を見比べて、気になる案はタップで詳細ページへ。

import Link from 'next/link';

const CASES = [
  { slug: 'overlap-pin-1', title: '案1 バッジ付きクラスタピン', caption: '右上に「2」「3」の人数バッジ。タップで全員シート展開。実装が一番軽い。' },
  { slug: 'overlap-pin-2', title: '案2 ファン展開ピン', caption: 'タップでピンが扇形にパッと開く。Google Maps の cluster と同じ発想。' },
  { slug: 'overlap-pin-3', title: '案3 重ねオフセットピン', caption: 'ピンを少しズラして重ねる。触らなくても「複数人や」が見える。' },
  { slug: 'overlap-pin-4', title: '案4 分割パイピン', caption: 'ピンを人数分パイ状に塗り分け。組織の混じり具合が一目でわかる。' },
  { slug: 'overlap-pin-5', title: '案5 横並びイニシャルピン', caption: '重なってる時だけ吹き出し風にして頭文字を並べる。誰がおるかまで見える。' },
];

export default function Page() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-6 px-4">
      <div className="max-w-md mx-auto mb-6">
        <h1 className="text-2xl font-bold mb-1">マップピン重なり問題</h1>
        <p className="text-sm text-[var(--color-subtext)]">
          兄弟など同じ住所に複数人いる時、ピンが1個に見えてしまう問題のUI案。
          各カードのタイトルをタップして実物を触ってみてや。
        </p>
      </div>

      <div className="max-w-md mx-auto flex flex-col gap-3">
        {CASES.map(c => (
          <Link
            key={c.slug}
            href={`/mock/${c.slug}`}
            className="block border border-black/10 rounded-xl bg-white px-4 py-4 active:scale-[0.98] transition-transform"
          >
            <div className="font-bold text-base">{c.title}</div>
            <div className="text-xs text-[var(--color-subtext)] mt-1 leading-relaxed">{c.caption}</div>
            <div className="text-xs text-[#4A90C2] mt-2 font-semibold">触ってみる →</div>
          </Link>
        ))}
      </div>

      <div className="max-w-md mx-auto mt-10 mb-12 text-center">
        <Link href="/" className="text-sm text-[var(--color-subtext)] underline underline-offset-4">
          ← マップへ戻る
        </Link>
      </div>
    </div>
  );
}
