'use client';

// フィルタ UI 案 v2 (ホテル/旅行サービス リサーチ版)
// 前回 (filter-ui-1〜5) より リアルなデータ + 旅行サービス系の
// UI パターンから着想した 5 案。

import Link from 'next/link';

const CASES = [
  { slug: 'filter-ui-6',  title: '案6 ヒストグラム + レンジスライダー',  caption: 'Airbnb / Booking の価格フィルタ風。各期間に何人いるかをバーで見せて、つまみで「N 日以上前」のしきい値を引く' },
  { slug: 'filter-ui-7',  title: '案7 カレンダー ヒートマップ',           caption: 'GitHub の contribution / Apple Activity 風。過去 8 週を方眼で表示、訪問あった日が濃い。タップで「ここから前」を絞る' },
  { slug: 'filter-ui-8',  title: '案8 プリセット + 詳細展開',             caption: 'Airbnb の日付ピッカー風。「本日 / 今週 / 1ヶ月以内」の大型プリセット、「詳細」で範囲微調整' },
  { slug: 'filter-ui-9',  title: '案9 タイムライン (改良版)',             caption: '案5 タイムラインをリッチに。各バケツに人数 + アバター並べる。横スクロール対応' },
  { slug: 'filter-ui-10', title: '案10 期間カード一覧 (Booking 風)',       caption: 'Booking.com の「最近の検索」風。「本日 (3 人)」「今週 (12 人)」みたいなカードを並べる' },
];

export default function Page() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-6 px-4">
      <div className="max-w-md mx-auto mb-6">
        <h1 className="text-2xl font-bold mb-1">フィルタ UI 案 v2 (旅行系)</h1>
        <p className="text-sm text-[var(--color-subtext)] leading-relaxed">
          ホテル予約 (Airbnb / Booking.com / Hotels.com) や 旅行サービスの
          フィルタ UI を参考に、5 案を提案。実データ (本部名・地区色・実際の
          人数分布) を入れて 本番に置き換えても違和感ないように作りました。
        </p>
        <div className="mt-3 rounded-lg bg-[#E0F7FA]/40 border border-[#5AC8FA]/30 px-3 py-2 text-[11px] text-[#2E6B7A]">
          💡 タイムライン (案9) はヒデさんが「良さそう」と仰った方向の改良版。
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

      <div className="max-w-md mx-auto mt-6 mb-12 text-center">
        <Link href="/mock/filter-ui" className="text-xs text-[var(--color-subtext)] underline underline-offset-4">
          ← 前回の 案1〜5 はこちら
        </Link>
      </div>
    </div>
  );
}
