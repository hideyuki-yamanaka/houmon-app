'use client';

// ──────────────────────────────────────────────────────────────
// アイコンサイズ比較用 ホーム画面風シェル
//   実 HomePage の見た目だけ模倣。地図はグレーのプレースホルダ。
//   ボタン・バーのサイズだけ props で差し替えて 3 案を比較する。
// ──────────────────────────────────────────────────────────────

import Link from 'next/link';
import { LocateFixed, Search, Layers, Settings, SlidersHorizontal } from 'lucide-react';

export type ShellProps = {
  label: string;
  // 検索バー高さ ('h-11' = 44px / 'h-12' = 48px)
  barHeight: string;
  // 丸ボタン直径 ('w-11 h-11' = 44px / 'w-12 h-12' = 48px)
  buttonSize: string;
  // 内アイコンサイズ (Lucide size)
  iconSize: number;
  // 影 (Tailwind arbitrary)
  shadow: string;
};

export default function IconSizeShell({
  label, barHeight, buttonSize, iconSize, shadow,
}: ShellProps) {
  return (
    <div className="min-h-screen bg-[#E5E3DF] relative overflow-hidden">
      {/* 地図プレースホルダ (実画面の雰囲気に近づけるためライトグレー + うっすら線) */}
      <div className="absolute inset-0 z-0 bg-[#E5E3DF]">
        <div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(0deg, #C8C5BF 1px, transparent 1px), linear-gradient(90deg, #C8C5BF 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* ダミーピン */}
        <div className="absolute top-[28%] left-[55%] w-3 h-3 rounded-full bg-[#1E40AF] shadow-md" />
        <div className="absolute top-[36%] left-[48%] w-3 h-3 rounded-full bg-[#1E40AF] shadow-md" />
        <div className="absolute top-[48%] left-[40%] w-3 h-3 rounded-full bg-[#F59E0B] shadow-md" />
        <div className="absolute top-[60%] left-[20%] w-3 h-3 rounded-full bg-[#0E7490] shadow-md" />
      </div>

      {/* 上部 オーバーレイ: 検索バー + レイヤー切替 */}
      <div className="absolute top-0 left-0 right-0 z-20 pt-[calc(env(safe-area-inset-top)+8px)]">
        <div className="px-3">
          <div className={`bg-white rounded-full ${shadow} flex items-center ${barHeight} px-4`}>
            <Search size={iconSize} className="text-[#5F6368] shrink-0" />
            <div className="flex-1 ml-3 text-[15px] text-[#5F6368] truncate">
              名前・住所・情報・訪問ログから検索
            </div>
          </div>
        </div>

        <div className="mt-2 px-3 flex items-center justify-end">
          <button
            type="button"
            aria-label="レイヤー切替"
            className={`shrink-0 ${buttonSize} rounded-full bg-white ${shadow} flex items-center justify-center active:scale-95 transition-transform`}
          >
            <Layers size={iconSize} className="text-[#5F6368]" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* 右側 縦積み: 設定 + 現在地 */}
      <div className="absolute right-3 z-20 flex flex-col items-end gap-2"
           style={{ top: 'calc(50vh + 40px)' }}>
        <button
          type="button"
          aria-label="設定"
          className={`${buttonSize} rounded-full bg-white ${shadow} flex items-center justify-center active:scale-95 transition-transform`}
        >
          <Settings size={iconSize} className="text-[#5F6368]" strokeWidth={2} />
        </button>
        <button
          type="button"
          aria-label="現在地"
          className={`${buttonSize} rounded-full bg-white text-[#111] ${shadow} flex items-center justify-center active:scale-95 transition-transform`}
        >
          <LocateFixed size={iconSize} />
        </button>
      </div>

      {/* ボトムシート風 (実画面の メンバー一覧 を模倣) */}
      <div className="absolute left-0 right-0 bottom-0 z-10 bg-white rounded-t-2xl shadow-[0_-2px_10px_rgba(0,0,0,0.08)]"
           style={{ height: '38vh' }}>
        <div className="flex justify-center pt-2"><div className="w-10 h-1 rounded-full bg-[#D0D0D0]" /></div>
        <div className="px-4 pt-3 flex items-center justify-between">
          <div>
            <span className="text-[17px] font-bold">メンバー</span>
            <span className="ml-2 text-[13px] text-[#5F6368]">42人 (訪問済み23人)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-[#5F6368]">クリア</span>
            <button
              type="button"
              aria-label="絞り込み"
              className={`${buttonSize} rounded-full bg-[#F0F0F0] flex items-center justify-center`}
            >
              <SlidersHorizontal size={iconSize} className="text-[#5F6368]" />
            </button>
          </div>
        </div>
        {/* メンバーカードのモック */}
        <div className="px-4 mt-4 space-y-2">
          <div className="border-l-4 border-[#0EA5E9] bg-[#F8FAFC] rounded-r-lg p-3">
            <div className="text-[10px] text-[#5F6368]">あさひりょうた</div>
            <div className="text-[15px] font-bold">朝日 涼太 (25)</div>
          </div>
          <div className="border-l-4 border-[#9F1239] bg-[#FEF2F2] rounded-r-lg p-3">
            <div className="text-[10px] text-[#5F6368]">いとうなおき</div>
            <div className="text-[15px] font-bold">伊藤 直樹 (27)</div>
          </div>
        </div>
      </div>

      {/* スペックバッジ + 戻る */}
      <div className="absolute top-3 left-3 z-30">
        <Link
          href="/mock/icon-size/"
          className="inline-flex items-center bg-black/70 text-white text-[11px] px-2 py-1 rounded-full"
        >
          ← 一覧
        </Link>
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 bg-black/70 text-white text-[11px] px-3 py-1 rounded-full">
        {label}
      </div>
    </div>
  );
}
