'use client';

// スキップ機能の UI 配置案 一覧
// 3 タブ (いける人 / いけない人 / スキップ) は共通。
// スキップボタンを「どこに置くか」だけ 5 通りに振った。

import Link from 'next/link';

const CASES = [
  {
    slug: 'skip-ui-1',
    title: '案1 詳細シートの ★ の横にアイコン',
    caption: '行きたい★ の隣に「⏭」アイコンを並べる。既存パターンとほぼ同じ位置で 学習コストゼロ',
  },
  {
    slug: 'skip-ui-2',
    title: '案2 リストカード右端の小ボタン',
    caption: 'リスト 1 件ずつにスキップアイコン。「見えた瞬間に押せる」最短経路',
  },
  {
    slug: 'skip-ui-3',
    title: '案3 リストカード 左スワイプ',
    caption: 'iOS メール風 スワイプ to action。視覚ノイズはゼロ、慣れたら最速',
  },
  {
    slug: 'skip-ui-4',
    title: '案4 マップピン 長押し → メニュー',
    caption: '地図上で直接処理。ピン長押し → スキップ/行きたい/詳細 のミニメニュー',
  },
  {
    slug: 'skip-ui-5',
    title: '案5 詳細シート上部の大きなボタン',
    caption: 'シートの一番上に プライマリ「⏭ スキップ」を据える。一番目立つ',
  },
];

export default function Page() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-6 px-4">
      <div className="max-w-md mx-auto mb-6">
        <h1 className="text-2xl font-bold mb-1">スキップ機能の UI 配置</h1>
        <p className="text-sm text-[var(--color-subtext)] leading-relaxed">
          3 タブ (いける人 / いけない人 / スキップ) は共通の前提。
          「スキップボタンをどこに置くか」だけ 5 案で振り分けた。
          実機で触って 一番手が伸びる位置を選んでや。
        </p>
        <div className="mt-3 rounded-lg bg-[#FFF8E1] border border-[#F0CB80]/40 px-3 py-2 text-[11px] text-[#7A4F00]">
          <b>共通の分類:</b><br />
          ・いける人 — 未訪問 / 訪問済 / 行きたい<br />
          ・いけない人 — 転居 / 拒否<br />
          ・スキップ — 手動スキップ / 住所不明
        </div>
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
