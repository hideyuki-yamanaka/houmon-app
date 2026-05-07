'use client';

// 家庭訪問アプリ カラーパレット 3案 比較ページ。
// 各案を縦に並べて見比べられる。気になる案はタップで詳細(単独全画面)へ。

import Link from 'next/link';
import { PALETTES } from './_palettes';
import { PaletteScreen } from './_screen';

export default function Page() {
  return (
    <div className="min-h-screen bg-[#EAEAEA] py-6 px-4">
      <div className="max-w-md mx-auto mb-6">
        <h1 className="text-2xl font-bold mb-1">カラーパレット 3案 比較</h1>
        <p className="text-sm text-[#525252]">
          現状はトーンの違う色が混在。3案を実画面要素に当て込んで提案。
          気になる案はリンクで単独ページへ。
        </p>
      </div>

      <div className="max-w-md mx-auto flex flex-col gap-8">
        {PALETTES.map(p => (
          <section key={p.id}>
            <div className="mb-2 px-1">
              <Link
                href={`/mock/palette-${p.id.split('-')[0]}`}
                className="text-base font-bold underline decoration-[#999] underline-offset-4"
                style={{ color: '#0A0A0A' }}
              >
                {p.name} →
              </Link>
              <p className="text-xs text-[#525252] mt-0.5">{p.caption}</p>
            </div>
            <PaletteScreen palette={p} />
          </section>
        ))}
      </div>

      <div className="max-w-md mx-auto mt-10 mb-12 text-center">
        <Link
          href="/log"
          className="text-sm text-[#525252] underline underline-offset-4"
        >
          ← 本物のダッシュボードへ
        </Link>
      </div>
    </div>
  );
}
