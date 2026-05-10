'use client';

// 印刷レイアウト 5案 比較ページ。
// 各案を A4 横サイズで縦に並べて見比べられる。

import Link from 'next/link';
import { SAMPLE_MEMBER, SAMPLE_VISITS } from './_sample';
import { A4LandscapeFrame } from '../../../components/print/PrintShell';
import { Layout1, Layout2, Layout3, Layout4, Layout5 } from '../../../components/print/PrintLayouts';

const CASES = [
  { id: 1, name: '案1 2カラム (現状)', caption: '左に基本情報＋メモ / 右にステータス＋訪問ログ。安定感あり、現実装ベース。', Component: Layout1 },
  { id: 2, name: '案2 横3段 (新聞風)', caption: '上=ヘッダー帯 / 中=ステータス7軸を横一列 / 下=メモと訪問ログ。スキャンしやすい。', Component: Layout2 },
  { id: 3, name: '案3 ダッシュボード (ステータス重視)', caption: '左半分にステータスを 2x4 で大きく表示 / 右に詳細。"その人の今" を一目で。', Component: Layout3 },
  { id: 4, name: '案4 タイムライン (訪問履歴重視)', caption: '右側を 訪問記録のタイムライン表示に多めに割り振る。経緯が見やすい。', Component: Layout4 },
  { id: 5, name: '案5 名簿風 (情報密度・表組)', caption: '基本情報と訪問ログを表で整然と。1ページに最大限の情報を載せる業務帳票風。', Component: Layout5 },
];

export default function Page() {
  return (
    <div className="min-h-screen bg-[#EAEAEA] py-6 px-4">
      <div className="max-w-md mx-auto mb-6">
        <h1 className="text-2xl font-bold mb-1">印刷レイアウト 5案 比較</h1>
        <p className="text-sm text-[#525252] leading-relaxed">
          A4 横で 1 人 1 ページの PDF 出力。同じサンプルデータ (朝日 涼太さん・訪問ログ5件) を 5 通りの構成で並べてあります。気になる案はリンクから単独表示へ。
        </p>
      </div>

      <div className="max-w-[1366px] mx-auto flex flex-col gap-2">
        {CASES.map(({ id, name, caption, Component }) => (
          <section key={id}>
            <div className="px-1 mb-2 max-w-md">
              <Link href={`/mock/print-${id}`} className="text-base font-bold underline decoration-[#999] underline-offset-4 text-[#0A0A0A]">
                {name} →
              </Link>
              <p className="text-xs text-[#525252] mt-0.5 leading-relaxed">{caption}</p>
            </div>
            <A4LandscapeFrame>
              <Component member={SAMPLE_MEMBER} visits={SAMPLE_VISITS} pageNo={1} pageTotal={5} />
            </A4LandscapeFrame>
          </section>
        ))}
      </div>

      <div className="max-w-md mx-auto mt-8 mb-12 text-center">
        <Link href="/" className="text-sm text-[#525252] underline underline-offset-4">
          ← ホームに戻る
        </Link>
      </div>
    </div>
  );
}
