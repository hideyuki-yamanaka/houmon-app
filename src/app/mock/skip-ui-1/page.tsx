'use client';

// 案1: 詳細シートの ★ の横にスキップアイコン
// 行きたい★ と並ぶ位置に「⏭」を置く。既存パターンの拡張なので学習コスト最低。
// MemberBottomSheet の上部にある star ボタンの隣に skip ボタンを並列で配置。

import Link from 'next/link';
import { useState } from 'react';
import { Star, SkipForward, ArrowLeft, MoreVertical } from 'lucide-react';

export default function Page() {
  const [skipped, setSkipped] = useState(false);
  const [starred, setStarred] = useState(true);
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="px-4 pt-6 pb-3 max-w-md mx-auto">
        <Link href="/mock/skip-ui" className="text-xs text-[var(--color-subtext)] underline">← 一覧へ戻る</Link>
        <h1 className="text-xl font-bold mt-2">案1 詳細シートの ★ の横</h1>
        <p className="text-xs text-[var(--color-subtext)] mt-1">
          行きたい★ と並んでスキップアイコン。既存パターンと同じ位置。
        </p>
      </header>

      <div className="max-w-md mx-auto px-4">
        {/* 詳細シート プレビュー */}
        <div className="rounded-2xl border border-black/10 bg-white overflow-hidden shadow-sm">
          {/* シートトップ */}
          <div className="px-4 pt-3 pb-2">
            <div className="w-10 h-1 bg-black/15 rounded-full mx-auto" />
          </div>

          {/* ヘッダー: 名前 + アクションアイコン群 */}
          <div className="px-4 pb-3 flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-[#E45A5A] text-white font-bold text-base flex items-center justify-center shrink-0">
              田
            </div>
            <div className="flex-1 min-w-0">
              <div className={`font-bold text-base ${skipped ? 'text-[var(--color-subtext)] line-through' : ''}`}>
                田中 一郎
              </div>
              <div className="text-[11px] text-[var(--color-subtext)] mt-0.5">本部A ・ ヤング ・ 0.4km</div>
            </div>
            {/* ★ と ⏭ 並列 (ここが案1のポイント) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setStarred(!starred)}
                aria-label={starred ? '行きたいから外す' : '行きたいに追加'}
                className={`shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors active:scale-95 ${
                  starred ? 'bg-[#FFCC00] border-[#FFCC00] text-white' : 'bg-white border-[#E5E5EA] text-[#999]'
                }`}>
                <Star size={18} strokeWidth={2.2} fill={starred ? '#FFFFFF' : 'none'} />
              </button>
              <button
                onClick={() => setSkipped(!skipped)}
                aria-label={skipped ? 'スキップを解除' : 'スキップに追加'}
                className={`shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors active:scale-95 ${
                  skipped ? 'bg-[#8E8E93] border-[#8E8E93] text-white' : 'bg-white border-[#E5E5EA] text-[#999]'
                }`}>
                <SkipForward size={18} strokeWidth={2.2} fill={skipped ? '#FFFFFF' : 'none'} />
              </button>
              <button className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-[#999] active:bg-[#F0F0F0]">
                <MoreVertical size={18} />
              </button>
            </div>
          </div>

          {/* 状態バナー (スキップ中の時) */}
          {skipped && (
            <div className="mx-4 mb-3 rounded-lg bg-[#F2F2F7] px-3 py-2 flex items-center gap-2 text-[12px]">
              <SkipForward size={14} className="text-[#666]" />
              <span className="text-[#555] flex-1">スキップ中 ・ マップ非表示</span>
              <button onClick={() => setSkipped(false)} className="text-[12px] font-bold text-[#4A90C2]">復元</button>
            </div>
          )}

          {/* ダミーの中身 */}
          <div className="px-4 pb-5 flex flex-col gap-2 text-[12px] text-[var(--color-subtext)]">
            <div className="rounded-lg bg-[#FAFAFA] p-3">📍 旭川市豊岡5条4丁目 12-3</div>
            <div className="rounded-lg bg-[#FAFAFA] p-3">📞 090-1234-5678</div>
            <div className="rounded-lg bg-[#FAFAFA] p-3">最終訪問: 2026-04-12 (不在)</div>
          </div>
        </div>

        {/* タブ状態プレビュー */}
        <div className="mt-4 rounded-xl border border-black/10 bg-white px-3 py-3">
          <div className="text-[10px] text-[var(--color-subtext)] mb-2 font-bold tracking-wide">3 タブの状態 (参考)</div>
          <div className="flex gap-1.5 bg-[#F2F2F7] rounded-full p-1">
            <div className="flex-1 py-1.5 rounded-full bg-white shadow-sm text-center text-[12px] font-bold">いける人 <span className="ml-1 text-[10px] bg-[#111] text-white rounded-full px-1.5">{skipped ? 41 : 42}</span></div>
            <div className="flex-1 py-1.5 rounded-full text-center text-[12px] font-bold text-[var(--color-subtext)]">いけない <span className="ml-1 text-[10px] bg-black/10 text-[#666] rounded-full px-1.5">22</span></div>
            <div className="flex-1 py-1.5 rounded-full text-center text-[12px] font-bold text-[var(--color-subtext)]">スキップ <span className="ml-1 text-[10px] bg-black/10 text-[#666] rounded-full px-1.5">{skipped ? 9 : 8}</span></div>
          </div>
        </div>

        <div className="mt-4 mb-12 text-[12px] text-[var(--color-subtext)] leading-relaxed">
          <p className="mb-1"><b>👍 良いところ</b>: 既存★パターンと一貫。同じトーンで覚えやすい。誤タップしにくい</p>
          <p className="mb-1"><b>🤔 弱いところ</b>: シートを開かないと操作できない。ピンタップ → シート展開 が前提</p>
        </div>
      </div>
    </div>
  );
}
