'use client';

// 「転居」が記録されたメンバーの マップピン表現案 一覧
// 4案を見比べて、気になる案はタップで詳細ページへ。

import Link from 'next/link';

const CASES = [
  { slug: 'moved-pin-1', title: '案1 半透明＋グレー', caption: '訪問済み色を落として 透明度 0.4。「もう用済み」感が一発で伝わる。実装も軽い' },
  { slug: 'moved-pin-2', title: '案2 斜線オーバーレイ', caption: 'ピンに斜めの ✗ 線を被せる。「訪問しなくていい」が一番ハッキリ' },
  { slug: 'moved-pin-3', title: '案3 アウトライン + 転居タグ', caption: 'ピンを中抜きにして 下に小さい「転居」テキスト。意味が文字でわかる' },
  { slug: 'moved-pin-4', title: '案4 紫ピン + 引越アイコン', caption: 'moved ステータス色 (紫) ベースで 中に → 矢印。色＋形のダブル区別' },
];

export default function Page() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-6 px-4">
      <div className="max-w-md mx-auto mb-6">
        <h1 className="text-2xl font-bold mb-1">転居メンバーの ピン表現</h1>
        <p className="text-sm text-[var(--color-subtext)]">
          訪問ログに「転居」が記録されたメンバーは、もう行く必要なし。
          マップ上で 一目で区別できる UI 案を 4 つ並べました。
          各タイトルをタップで実物のピンを比較できる。
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
