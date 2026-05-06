'use client';

// 5 案のピン編集 UI 比較ランディングページ。
// 各案ごとの mock ページにリンクするだけ。
// 認証不要 (/mock/ 配下)、iPhone で開いて触れる前提。

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const PROPOSALS = [
  {
    id: 1, slug: 'pin-edit-1',
    title: '案 1: 長押しドラッグ (Google Maps 風)',
    desc: 'ピンを 500ms 長押しすると浮き上がり、そのまま指でドラッグして好きな場所に置く。離すと住所を更新。',
    pros: '一番自然・誰でも知ってる UX',
    cons: '誤タップで動いちゃうリスク',
  },
  {
    id: 2, slug: 'pin-edit-2',
    title: '案 2: 中央十字 + 地図を動かす',
    desc: '画面中央に十字を固定、地図を動かしてピン位置を合わせる。「ここに決定」ボタンで確定。',
    pros: '誤操作ゼロ、細かい位置合わせがしやすい',
    cons: '編集モード切替が必要',
  },
  {
    id: 3, slug: 'pin-edit-3',
    title: '案 3: 地図ロングタップで新規ピン',
    desc: '地図の任意の場所を長押しすると新しいピンが落ちる。確認モーダルで OK で位置を更新。',
    pros: '思った場所を直接指定、最速',
    cons: '既存位置の微調整には不向き',
  },
  {
    id: 4, slug: 'pin-edit-4',
    title: '案 4: 住所 ⇔ ピン 双方向同期',
    desc: '住所を打つとピンが動き、ピンを動かすと住所が更新される。住所が曖昧な時にも便利。',
    pros: '入力派にもタッチ派にも優しい',
    cons: 'API 呼び出し回数多め',
  },
  {
    id: 5, slug: 'pin-edit-5',
    title: '案 5: 微調整スライダー',
    desc: 'ピン現在位置を中心に、上下左右の矢印ボタンで数 m 単位で微調整。住所もリアルタイムで更新。',
    pros: '街区中央落ちのジオコード結果を正確に直せる',
    cons: '大幅変更には不向き',
  },
];

export default function PinEditIndexPage() {
  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-20">
      <div className="max-w-[420px] mx-auto px-4 py-5">
        <h1 className="text-xl font-bold mb-1">ピン位置 + 住所連動 UI 5 案</h1>
        <p className="text-[12px] text-[var(--color-subtext)] mb-1">
          メンバーのピン位置を地図上で動かして、住所を連動させる UI 案。
          各案を実機で触って、しっくりくるのを選んでください。
        </p>
        <Link href="/" className="text-[12px] text-[var(--color-primary)] underline mb-4 inline-block">← ホームへ戻る</Link>

        <div className="space-y-2 mt-3">
          {PROPOSALS.map(p => (
            <Link
              key={p.id}
              href={`/mock/${p.slug}`}
              className="block bg-white rounded-xl p-3 border border-[#E5E7EB] active:bg-[#F3F4F6]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h2 className="text-[14px] font-bold leading-tight mb-1">{p.title}</h2>
                  <p className="text-[11px] text-[#374151] leading-snug">{p.desc}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#065F46]">○ {p.pros}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FEF3F2] text-[#991B1B]">△ {p.cons}</span>
                  </div>
                </div>
                <ArrowRight size={20} className="shrink-0 mt-1 text-[var(--color-subtext)]" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
