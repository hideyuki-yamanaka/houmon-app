'use client';

// フィルタ UI 案 一覧
// 現状: 小さいピル状チップが詰まってて見にくい (特に「期間」セクション)。
// 5 つの代替案を並べた。各案は フィルタモーダル全体のレイアウトを示す。

import Link from 'next/link';

const CASES = [
  { slug: 'filter-ui-1', title: '案1 大きいタイルカード (2列)',         caption: '期間/カテゴリを 2 列カードに。タップ領域でかい、件数バッジ付き' },
  { slug: 'filter-ui-2', title: '案2 横スクロールカルーセル',           caption: '期間を太めの大カードで横スクロール。一覧性◎、スワイプ操作' },
  { slug: 'filter-ui-3', title: '案3 アコーディオン (折りたたみ)',      caption: '選択中だけ展開。他は閉じる → モーダルが縦に短くなる' },
  { slug: 'filter-ui-4', title: '案4 セグメント + 縦リスト',            caption: '期間/カテゴリで上タブ切替 → 選択肢を縦の大きいリストで' },
  { slug: 'filter-ui-5', title: '案5 ヴィジュアル タイムライン',        caption: '期間を 水平タイムラインで「いつ訪問したか」をビジュアル選択' },
];

export default function Page() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-6 px-4">
      <div className="max-w-md mx-auto mb-6">
        <h1 className="text-2xl font-bold mb-1">フィルタ UI 案 (期間)</h1>
        <p className="text-sm text-[var(--color-subtext)] leading-relaxed">
          現状のチップは小さくて見にくい。特に「最終訪問からの期間」が候補多めで
          ごちゃっとする。レイアウトを 5 パターン提案。期間セクション中心。
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
