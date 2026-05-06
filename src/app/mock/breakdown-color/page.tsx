'use client';

// 訪問ログ内訳カードの色テーマ比較 (一覧)
// 5案を縦に並べて見比べられる。各案の詳細ページへもリンクあり。

import Link from 'next/link';
import { BreakdownPreview, THEMES } from './_preview';

export default function Page() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-6 px-4">
      <div className="max-w-md mx-auto mb-6">
        <h1 className="text-2xl font-bold mb-1">訪問ログ内訳・配色比較</h1>
        <p className="text-sm text-[var(--color-subtext)]">
          5つのカラーテーマを並べて比較。気になる案はタップで単独ページへ。
        </p>
      </div>

      <div className="max-w-md mx-auto flex flex-col gap-6">
        {THEMES.map((theme, idx) => {
          const slug = `breakdown-color-${idx + 1}`;
          return (
            <section key={theme.name}>
              <div className="mb-2 px-1">
                <Link
                  href={`/mock/${slug}`}
                  className="text-base font-bold text-[#111] underline decoration-[#999] underline-offset-4"
                >
                  {theme.name}
                </Link>
                <p className="text-xs text-[var(--color-subtext)] mt-0.5">
                  {theme.caption}
                </p>
              </div>
              <BreakdownPreview theme={theme} />
            </section>
          );
        })}
      </div>

      <div className="max-w-md mx-auto mt-10 mb-12 text-center">
        <Link
          href="/log"
          className="text-sm text-[var(--color-subtext)] underline underline-offset-4"
        >
          ← 本物のダッシュボードへ
        </Link>
      </div>
    </div>
  );
}
