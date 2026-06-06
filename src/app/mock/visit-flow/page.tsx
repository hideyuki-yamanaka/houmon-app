'use client';

// 「実質訪問できる人」を直感的に把握する UX 案 一覧
// 名簿には 転居 / 住所不明 など 訪問対象外メンバーがけっこう混じる。
// その中から「今 行ける人」が一目でわかる UI を 5 つ並べた。

import Link from 'next/link';

const CASES = [
  {
    slug: 'visit-flow-1',
    title: '案1 複数選択フィルター + ライブ件数',
    caption: 'フィルタチップを複数選択にして、その場で「該当 N 人」が動く。ヒデさんの当初アイデアの完成形',
  },
  {
    slug: 'visit-flow-2',
    title: '案2 進捗サマリーバナー (上部固定)',
    caption: 'ホーム上部に「対象 42 / 完了 12 / 残り 30 / 対象外 26」のバーを常時表示。今の状況が常に見える',
  },
  {
    slug: 'visit-flow-3',
    title: '案3 マップのモード切替',
    caption: 'マップ右下の Mode ボタンで「実訪問だけ / 全員」を切替。普段は対象外を隠せばノイズが消える',
  },
  {
    slug: 'visit-flow-4',
    title: '案4 ボトムシート 3 タブ',
    caption: '「行ける人 / 対象外 / 保留」のタブ分け。デフォルトは「行ける人」のみが目に入る',
  },
  {
    slug: 'visit-flow-5',
    title: '案5 今日のおすすめ訪問',
    caption: '「行ける × 未訪問 × 近場」で自動ピックアップ。タップで地図にルート表示',
  },
];

export default function Page() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-6 px-4">
      <div className="max-w-md mx-auto mb-6">
        <h1 className="text-2xl font-bold mb-1">実質訪問対象が見える UX</h1>
        <p className="text-sm text-[var(--color-subtext)] leading-relaxed">
          名簿の中には 転居・住所不明・拒否など 「もう行かない人」が混じっている。
          そこから 今すぐ 行ける人 が一発でわかる UX 案を 5 パターン。
          複数併用も OK な設計やけど、まずは どれが一番ピンと来るか触ってみて。
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
