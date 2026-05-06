'use client';

// ──────────────────────────────────────────────────────────────
// アイコン・ボタンサイズ統一 比較 (3 案)
//   ホーム画面の以下 4 要素のサイズ感を揃える検討:
//     - 検索バー (虫眼鏡)
//     - レイヤー切替 (右上)
//     - 設定 (歯車)
//     - 現在地取得 (ターゲット)
// ──────────────────────────────────────────────────────────────

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

type Variant = {
  id: string;
  title: string;
  bar: string;
  btn: string;
  icon: string;
  shadow: string;
  hint: string;
};

const variants: Variant[] = [
  {
    id: 'icon-size-1',
    title: '案1: 全 48px 統一 (大きめ・濃影)',
    bar: 'h-12 (48px)',
    btn: 'w-12 h-12 (48px)',
    icon: 'size 22',
    shadow: '濃影 (0,3,10,0.22)',
    hint: '検索バーと丸ボタンが同じ高さ。タップしやすく、現在地ボタンの存在感は維持。',
  },
  {
    id: 'icon-size-2',
    title: '案2: 全 44px 統一 (小さめ・薄影)',
    bar: 'h-11 (44px)',
    btn: 'w-11 h-11 (44px)',
    icon: 'size 20',
    shadow: '薄影 (0,2,6,0.15)',
    hint: 'マップが見える面積が広くなる。スッキリ系。',
  },
  {
    id: 'icon-size-3',
    title: '案3: 検索 48 / 丸ボタン 44 (中間)',
    bar: 'h-12 (48px)',
    btn: 'w-11 h-11 (44px)',
    icon: 'size 20',
    shadow: '濃影で統一',
    hint: '検索バーは入力しやすい高さを保ちつつ、丸ボタンは控えめに。',
  },
];

export default function IconSizeIndex() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] px-4 py-6">
      <div className="max-w-[480px] mx-auto">
        <h1 className="text-xl font-bold mb-1">アイコン・ボタンサイズ統一</h1>
        <p className="text-sm text-[#5F6368] mb-5">
          ホーム画面 4 要素 (検索バー / レイヤー / 設定 / 現在地) を揃える 3 案。
          実機で比較してください。
        </p>

        {/* 現状サマリ */}
        <div className="bg-white rounded-xl p-4 mb-4 shadow-[0_2px_6px_rgba(0,0,0,0.08)]">
          <div className="text-xs font-bold text-[#5F6368] mb-2">現状 (バラつき)</div>
          <ul className="text-[13px] leading-6 text-[#222]">
            <li>・検索バー: <span className="font-mono">48px</span> / 虫眼鏡 <span className="font-mono">20</span></li>
            <li>・レイヤー: <span className="font-mono">44px</span> / icon <span className="font-mono">20</span> / 薄影</li>
            <li>・設定: <span className="font-mono">44px</span> / icon <span className="font-mono">20</span> / 濃影</li>
            <li>・現在地: <span className="font-mono">48px</span> / icon <span className="font-mono">22</span> / 濃影</li>
          </ul>
        </div>

        {/* 各案へのリンク */}
        <div className="space-y-3">
          {variants.map((v) => (
            <Link
              key={v.id}
              href={`/mock/${v.id}/`}
              className="flex items-center bg-white rounded-xl p-4 shadow-[0_2px_6px_rgba(0,0,0,0.08)] active:scale-[0.99] transition-transform"
            >
              <div className="flex-1">
                <div className="font-bold text-[15px] mb-1.5">{v.title}</div>
                <div className="text-xs text-[#5F6368] leading-5">
                  バー {v.bar} / ボタン {v.btn} / アイコン {v.icon} / {v.shadow}
                </div>
                <div className="text-xs text-[#222] mt-2 leading-5">{v.hint}</div>
              </div>
              <ChevronRight size={20} className="text-[#5F6368] shrink-0 ml-2" />
            </Link>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-[#5F6368] underline">
            ← ホームに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
