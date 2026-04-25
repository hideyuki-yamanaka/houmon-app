'use client';

// ──────────────────────────────────────────────────────────────
// 「行きたい」ブックマーク機能のモック
//   ・ボトムシートのブックマーク釦 5バリエーション
//   ・マップピンのブックマーク中アイコン 5バリエーション
// ユーザーにどれが良いか選んでもらうための静的比較ページ。
// 実装の本番ではない(挙動は最小限のトグルのみ)。
// ──────────────────────────────────────────────────────────────

import { useState } from 'react';
import Link from 'next/link';
import {
  Flag,
  Star,
  MapPin,
  Bookmark,
  Navigation,
  PencilLine,
  ChevronLeft,
} from 'lucide-react';

// ──────────────────────────────────────────────────────────────
// アイコン定義: マップピン上のブックマーク中アイコン 5種
// ──────────────────────────────────────────────────────────────
type IconKey = 'flag' | 'star' | 'pin-filled' | 'triangle-flag' | 'bookmark';

const ICON_VARIANTS: {
  key: IconKey;
  label: string;
  desc: string;
  /** 選ばれた時のマップピン上の描画。72×88 くらいのピン全体を返す */
  renderPin: (active: boolean) => React.ReactNode;
}[] = [
  {
    key: 'flag',
    label: '① 赤い旗',
    desc: '視認性◎。直感的に「目印」と分かる',
    renderPin: (active) =>
      active ? (
        <div className="relative w-12 h-14 flex items-center justify-center">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-10 bg-[#222]" />
          <svg viewBox="0 0 24 24" className="absolute top-0 left-1/2 w-10 h-10" style={{ transform: 'translateX(-30%)' }}>
            <path d="M4 2 L4 14 L18 8 Z" fill="#E53935" stroke="#B71C1C" strokeWidth={1.2} strokeLinejoin="round" />
          </svg>
        </div>
      ) : (
        <DefaultPin />
      ),
  },
  {
    key: 'star',
    label: '② 星マーク',
    desc: 'お気に入り感。カワイイが「行きたい」感は弱め',
    renderPin: (active) =>
      active ? (
        <div className="relative w-12 h-14 flex items-end justify-center">
          <div className="w-11 h-11 rounded-full bg-[#FFC107] border-2 border-white shadow-lg flex items-center justify-center">
            <Star size={22} fill="white" stroke="white" strokeWidth={1.5} />
          </div>
        </div>
      ) : (
        <DefaultPin />
      ),
  },
  {
    key: 'pin-filled',
    label: '③ 金色ピン',
    desc: '普段のピンの色違い。統一感◎',
    renderPin: (active) =>
      active ? (
        <div className="relative w-12 h-14 flex items-end justify-center">
          <svg viewBox="0 0 24 32" className="w-10 h-14 drop-shadow-md">
            <path
              d="M12 0 C5.4 0 0 5.4 0 12 C0 21 12 32 12 32 C12 32 24 21 24 12 C24 5.4 18.6 0 12 0 Z"
              fill="#FBC02D"
              stroke="#F57F17"
              strokeWidth={1}
            />
            <circle cx="12" cy="12" r="4" fill="white" />
          </svg>
        </div>
      ) : (
        <DefaultPin />
      ),
  },
  {
    key: 'triangle-flag',
    label: '④ 三角フラッグ',
    desc: 'ゴルフやレース旗風。細身でスマート',
    renderPin: (active) =>
      active ? (
        <div className="relative w-12 h-14 flex items-center justify-center">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-12 bg-[#111]" />
          <svg viewBox="0 0 24 24" className="absolute top-0 left-1/2 w-10 h-10" style={{ transform: 'translateX(-20%)' }}>
            <path d="M4 2 Q 14 5 22 4 Q 14 9 4 8 Z" fill="#FF6D00" stroke="#E65100" strokeWidth={1} strokeLinejoin="round" />
          </svg>
        </div>
      ) : (
        <DefaultPin />
      ),
  },
  {
    key: 'bookmark',
    label: '⑤ しおり風',
    desc: 'ブラウザの「あとで読む」感。和風にも映える',
    renderPin: (active) =>
      active ? (
        <div className="relative w-12 h-14 flex items-end justify-center">
          <div className="w-10 h-12 bg-[#4F46E5] shadow-lg flex items-center justify-center"
               style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 85%, 0 100%)' }}>
            <Bookmark size={20} fill="white" stroke="white" />
          </div>
        </div>
      ) : (
        <DefaultPin />
      ),
  },
];

// ──────────────────────────────────────────────────────────────
// UI バリエーション: ボトムシートのブックマーク釦 5種
// ──────────────────────────────────────────────────────────────
type UIKey = 'icon-only-outline' | 'pill-with-text' | 'rounded-tinted' | 'circle-mini' | 'ribbon';

const UI_VARIANTS: {
  key: UIKey;
  label: string;
  desc: string;
  renderButton: (active: boolean, onToggle: () => void) => React.ReactNode;
}[] = [
  {
    key: 'icon-only-outline',
    label: 'Ⓐ アイコンのみ丸(アウトライン)',
    desc: '最小サイズで邪魔しない。状態はアクティブ色で示す',
    renderButton: (active, onToggle) => (
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={active}
        className={`shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors active:scale-95 ${
          active
            ? 'bg-[#FFF3C4] border-[#F59E0B] text-[#D97706]'
            : 'bg-white border-[#D1D5DB] text-[#6B7280]'
        }`}
        aria-label="行きたい場所に追加"
      >
        <Flag size={18} strokeWidth={2.2} fill={active ? '#F59E0B' : 'none'} />
      </button>
    ),
  },
  {
    key: 'pill-with-text',
    label: 'Ⓑ テキスト入りピル',
    desc: '初見ユーザーにも分かりやすい。幅は取る',
    renderButton: (active, onToggle) => (
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={active}
        className={`shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-2 text-[12px] font-bold transition-colors active:scale-95 ${
          active
            ? 'bg-[#F59E0B] text-white'
            : 'bg-[#F3F4F6] text-[#6B7280]'
        }`}
      >
        <Flag size={14} strokeWidth={2.2} fill={active ? 'white' : 'none'} />
        {active ? '行きたい' : '未登録'}
      </button>
    ),
  },
  {
    key: 'rounded-tinted',
    label: 'Ⓒ 角丸四角(濃淡トグル)',
    desc: '記録するボタンと並べた時の視覚的バランス◎',
    renderButton: (active, onToggle) => (
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={active}
        className={`shrink-0 inline-flex items-center gap-1 rounded-xl px-3 py-2 transition-colors active:scale-95 ${
          active
            ? 'bg-[#FEF3C7] text-[#B45309]'
            : 'bg-[#F9FAFB] text-[#9CA3AF]'
        }`}
        aria-label="行きたい場所に追加"
      >
        <Flag size={16} strokeWidth={2.2} fill={active ? '#F59E0B' : 'none'} />
      </button>
    ),
  },
  {
    key: 'circle-mini',
    label: 'Ⓓ 小さめアイコン(超ミニマル)',
    desc: 'TEL/道案内などの既存アイコンと同サイズで揃う',
    renderButton: (active, onToggle) => (
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={active}
        className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors active:scale-95 ${
          active ? 'text-[#F59E0B]' : 'text-[#9CA3AF]'
        } active:bg-[#F3F4F6]`}
        aria-label="行きたい場所に追加"
      >
        <Flag size={22} strokeWidth={2} fill={active ? '#F59E0B' : 'none'} />
      </button>
    ),
  },
  {
    key: 'ribbon',
    label: 'Ⓔ リボン/バッジ風',
    desc: 'オシャレ寄り。active 時の「目立ち方」が強い',
    renderButton: (active, onToggle) => (
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={active}
        className={`relative shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg transition-all active:scale-95 ${
          active
            ? 'bg-gradient-to-b from-[#FBBF24] to-[#D97706] text-white shadow-md'
            : 'bg-white border border-[#E5E7EB] text-[#9CA3AF]'
        }`}
        aria-label="行きたい場所に追加"
      >
        <Flag size={18} strokeWidth={2.2} fill={active ? 'white' : 'none'} />
        {active && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#EF4444] border-2 border-white" />
        )}
      </button>
    ),
  },
];

// ──────────────────────────────────────────────────────────────
// 非アクティブ時の標準ピン(全部これ共通)
// ──────────────────────────────────────────────────────────────
function DefaultPin() {
  return (
    <div className="relative w-12 h-14 flex items-end justify-center">
      <svg viewBox="0 0 24 32" className="w-9 h-12 drop-shadow-md">
        <path
          d="M12 0 C5.4 0 0 5.4 0 12 C0 21 12 32 12 32 C12 32 24 21 24 12 C24 5.4 18.6 0 12 0 Z"
          fill="#6B7280"
          stroke="#374151"
          strokeWidth={1}
        />
        <circle cx="12" cy="12" r="4" fill="white" />
      </svg>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// ダミー地図(薄いグリッド) — ピンの背景
// ──────────────────────────────────────────────────────────────
function FakeMap({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative w-full h-[120px] rounded-xl overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, #E8F5E9 0%, #E3F2FD 100%)',
        backgroundImage: `
          linear-gradient(#D1D5DB22 1px, transparent 1px),
          linear-gradient(90deg, #D1D5DB22 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px',
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// メイン
// ──────────────────────────────────────────────────────────────
export default function BookmarkMockPage() {
  // ボトムシートボタン試用中の active 状態(5 UI それぞれ独立でトグル)
  const [uiActive, setUiActive] = useState<Record<UIKey, boolean>>({
    'icon-only-outline': false,
    'pill-with-text': false,
    'rounded-tinted': false,
    'circle-mini': false,
    ribbon: false,
  });

  // アイコンの active/非 active 両方プレビュー(ページロード時点は全部 active)
  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-20">
      {/* ナビバー */}
      <nav className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[#E5E7EB] px-4 py-3 flex items-center gap-2">
        <Link href="/" className="flex items-center gap-1 text-[var(--color-primary)]">
          <ChevronLeft size={22} />
          <span className="text-sm">戻る</span>
        </Link>
        <h1 className="flex-1 text-center text-base font-bold">
          「行きたい」ブックマーク モック
        </h1>
        <div className="w-14" />
      </nav>

      {/* 全体説明 */}
      <section className="px-4 pt-4 pb-2">
        <p className="text-[13px] text-[#374151] leading-relaxed">
          メンバーを「あとで行きたい」リストに入れる機能です。
          <br />
          ①ボトムシートの記録するボタンの左にブックマーク釦を置き、②タップすると
          マップ上のそのメンバーのピンが旗印（などの別アイコン）に変わって
          一目で分かる、という UX。
        </p>
        <p className="text-[11px] text-[#9CA3AF] mt-1.5">
          ※ これはモックです。実装前に UI とアイコンを選ぶための比較用ページ。
        </p>
      </section>

      {/* ─────────────── Section 1: ボトムシートの釦バリエーション ─────────────── */}
      <section className="px-4 pt-4">
        <h2 className="text-[15px] font-bold mb-1">
          A. ボトムシート：ブックマーク釦 5案
        </h2>
        <p className="text-[12px] text-[#6B7280] mb-3">
          タップすると on / off が切り替わります。記録するボタンとの並び比較で選んでください。
        </p>

        <div className="space-y-3">
          {UI_VARIANTS.map((v) => {
            const active = uiActive[v.key];
            return (
              <div
                key={v.key}
                className="rounded-2xl bg-white border border-[#E5E7EB] overflow-hidden"
              >
                {/* 見出し */}
                <div className="px-4 pt-3 pb-1">
                  <div className="text-[13px] font-bold">{v.label}</div>
                  <div className="text-[11px] text-[#6B7280]">{v.desc}</div>
                </div>

                {/* 擬似ボトムシートのヘッダー部分 */}
                <div className="mx-3 mb-3 mt-2 rounded-xl bg-[#FAFAFA] border border-[#F0F0F0] px-3 pt-2.5 pb-3">
                  {/* ドラッグハンドル */}
                  <div className="w-8 h-1 rounded-full bg-[#D1D5DB] mx-auto mb-2" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[9px] text-[#9CA3AF] leading-none">やまだ たろう</div>
                      <h3 className="text-base font-bold truncate">
                        山田 太郎
                        <span className="text-[12px] font-normal text-[#9CA3AF] ml-1">(62)</span>
                      </h3>
                      <div className="text-[10px] text-[#6B7280] mt-0.5">
                        豊岡香城地区
                      </div>
                    </div>

                    {/* ここがモック対象: ブックマーク釦 + 記録するボタン */}
                    <div className="flex items-center gap-1.5">
                      {v.renderButton(active, () =>
                        setUiActive((prev) => ({ ...prev, [v.key]: !prev[v.key] })),
                      )}
                      <button
                        type="button"
                        className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[#111] text-white text-[12px] font-bold px-3 py-2"
                      >
                        <PencilLine size={14} strokeWidth={2.2} />
                        記録する
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─────────────── Section 2: マップピンのアイコン ─────────────── */}
      <section className="px-4 pt-8">
        <h2 className="text-[15px] font-bold mb-1">
          B. マップピン：ブックマーク中アイコン 5案
        </h2>
        <p className="text-[12px] text-[#6B7280] mb-3">
          通常のピン(左)が、ブックマーク on になると右のアイコンに変化します。
        </p>

        <div className="space-y-3">
          {ICON_VARIANTS.map((v) => (
            <div
              key={v.key}
              className="rounded-2xl bg-white border border-[#E5E7EB] overflow-hidden"
            >
              <div className="px-4 pt-3 pb-1">
                <div className="text-[13px] font-bold">{v.label}</div>
                <div className="text-[11px] text-[#6B7280]">{v.desc}</div>
              </div>
              <div className="p-3 grid grid-cols-2 gap-3">
                {/* 通常ピン */}
                <div>
                  <div className="text-[10px] text-[#9CA3AF] mb-1 pl-1">通常</div>
                  <FakeMap>{v.renderPin(false)}</FakeMap>
                </div>
                {/* ブックマーク中 */}
                <div>
                  <div className="text-[10px] text-[#D97706] font-bold mb-1 pl-1">
                    行きたい登録中
                  </div>
                  <FakeMap>{v.renderPin(true)}</FakeMap>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────── Section 3: 組み合わせプレビュー(オマケ) ─────────────── */}
      <section className="px-4 pt-8">
        <h2 className="text-[15px] font-bold mb-1">C. 現場イメージ(参考)</h2>
        <p className="text-[12px] text-[#6B7280] mb-3">
          実際に使われる時のイメージ。A から 1 つ + B から 1 つを選んで組み合わせてください。
        </p>
        <div className="rounded-2xl bg-white border border-[#E5E7EB] p-4">
          <FakeMap>
            <div className="flex items-end gap-4">
              <div className="flex flex-col items-center">
                <DefaultPin />
                <div className="text-[9px] text-[#9CA3AF] mt-0.5">田中</div>
              </div>
              <div className="flex flex-col items-center">
                {ICON_VARIANTS[0].renderPin(true)}
                <div className="text-[9px] text-[#D97706] font-bold mt-0.5">山田★</div>
              </div>
              <div className="flex flex-col items-center">
                <DefaultPin />
                <div className="text-[9px] text-[#9CA3AF] mt-0.5">佐藤</div>
              </div>
            </div>
          </FakeMap>
          <p className="text-[11px] text-[#6B7280] mt-3 leading-relaxed">
            ↑ 「山田さん」を行きたいリストに追加した状態のイメージ。
            地図をサッと見るだけで誰を訪ねようとしてるか分かる。
          </p>
        </div>
      </section>
    </div>
  );
}
