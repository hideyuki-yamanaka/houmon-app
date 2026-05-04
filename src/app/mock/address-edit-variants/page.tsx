'use client';

// ──────────────────────────────────────────────────────────────
// 住所編集 UI の 3 案比較プレビュー
//
// 目的: 「住所を編集できるようにしたい」 + 「Google Maps へ飛ぶ既存挙動」
//       の両立 UI を 3 案、実画面風モックで比較する。
//
// 案:
//   A) 左に ✏️ / 右に 🗺️ 完全分離
//   B) テキストタップで編集 / 右端に明示 🗺️ ボタン
//   C) 住所タップで Maps (OS 標準UX) / 右に ✏️ 編集ボタン
//
// 各案 タップ可能、編集モーダル / Maps 開く挙動を 実装してる。
// ──────────────────────────────────────────────────────────────

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Pencil, ExternalLink, MapPin, Check, X } from 'lucide-react';

const SAMPLE_NAME = '高桑 秀都';
const SAMPLE_DISTRICT = '英雄地区';
const SAMPLE_INITIAL_ADDRESS = '埼玉県豊岡市中央町1-2-3 ハイツ豊岡 201号室';

export default function AddressEditVariantsPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-12">
      {/* ヘッダ */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-black/5">
        <div className="max-w-[640px] mx-auto flex items-center px-2 py-2">
          <Link
            href="/"
            className="flex items-center gap-1 text-[15px] text-[var(--color-primary)] active:opacity-60 px-2 py-1"
          >
            <ChevronLeft size={20} />
            <span>戻る</span>
          </Link>
          <h1 className="flex-1 text-center text-[16px] font-semibold pr-12">
            住所編集 UI 比較
          </h1>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-4 space-y-6">
        <p className="text-[12px] text-[var(--color-subtext)] leading-relaxed">
          各案を実際にタップして比較してな。編集ボタンはモーダルで保存できるけど、
          状態は画面内だけで保存されへん（プレビュー用）。
        </p>

        <VariantCard
          letter="A"
          title="左に ✏️ / 右に 🗺️ で完全分離"
          desc="編集とMapsを別アイコンで明示。誤タップ最少。"
        >
          <VariantA initial={SAMPLE_INITIAL_ADDRESS} />
        </VariantCard>

        <VariantCard
          letter="B"
          title="テキストタップで編集 / 右に Maps ボタン"
          desc="既存挙動を維持しつつ Maps を明示ボタン化。"
        >
          <VariantB initial={SAMPLE_INITIAL_ADDRESS} />
        </VariantCard>

        <VariantCard
          letter="C"
          title="住所タップで Maps / 右に ✏️ 編集ボタン (推奨)"
          desc="iOS メモアプリと同じUX。住所=Mapsの直感に合う。"
        >
          <VariantC initial={SAMPLE_INITIAL_ADDRESS} />
        </VariantCard>

        <p className="text-[11px] text-[var(--color-subtext)] leading-relaxed text-center pt-4">
          選んだ案を本番に適用するで。気に入ったやつを Claude に伝えてな。
        </p>
      </main>
    </div>
  );
}

// ── 各案を囲うカード（実際の メンバー詳細 と同じ ios-card 風） ───
function VariantCard({
  letter,
  title,
  desc,
  children,
}: {
  letter: string;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-black/5">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold w-6 h-6 rounded-full bg-[#111] text-white inline-flex items-center justify-center">
            {letter}
          </span>
          <h2 className="text-[13px] font-semibold text-[#111] flex-1">{title}</h2>
        </div>
        <p className="text-[11px] text-[var(--color-subtext)] mt-1 ml-8">{desc}</p>
      </div>
      <div className="px-4 py-3">
        {/* メンバー詳細風のヘッダ + 住所行 */}
        <div className="text-sm font-semibold text-[#111]">{SAMPLE_NAME}</div>
        <div className="text-[11px] text-[var(--color-subtext)] mb-2">{SAMPLE_DISTRICT}</div>
        {children}
      </div>
    </section>
  );
}

// ── A 案: 左 ✏️ / 右 🗺️ ─────────────────────────────────────────
function VariantA({ initial }: { initial: string }) {
  const [address, setAddress] = useState(initial);
  const [editing, setEditing] = useState(false);

  return (
    <div className="border-t border-[#F0F0F0] pt-2">
      <div className="text-[10px] text-[var(--color-subtext)] mb-0.5">住所</div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="住所を編集"
          className="shrink-0 w-8 h-8 rounded-full hover:bg-[#F3F4F6] inline-flex items-center justify-center active:scale-95"
        >
          <Pencil size={14} className="text-[var(--color-subtext)]" />
        </button>
        <span className="flex-1 text-sm text-[#111] truncate">{address}</span>
        <a
          href={mapsUrl(address)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Google Maps で開く"
          className="shrink-0 w-8 h-8 rounded-full hover:bg-[#F3F4F6] inline-flex items-center justify-center active:scale-95"
        >
          <ExternalLink size={14} className="text-[var(--color-icon-gray)]" />
        </a>
      </div>
      {editing && (
        <EditModal
          initial={address}
          onCancel={() => setEditing(false)}
          onSave={v => {
            setAddress(v);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

// ── B 案: テキストタップ=編集 / 右に Maps ボタン ────────────────
function VariantB({ initial }: { initial: string }) {
  const [address, setAddress] = useState(initial);
  const [editing, setEditing] = useState(false);

  return (
    <div className="border-t border-[#F0F0F0] pt-2">
      <div className="text-[10px] text-[var(--color-subtext)] mb-0.5">住所</div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex-1 min-w-0 text-left text-sm text-[#111] truncate active:opacity-60 -mx-1 px-1 py-0.5 rounded"
        >
          {address}
        </button>
        <a
          href={mapsUrl(address)}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-full bg-[#F3F4F6] text-[12px] font-medium text-[#111] active:scale-95"
        >
          <MapPin size={12} />
          Maps
        </a>
      </div>
      <p className="text-[10px] text-[var(--color-subtext)] mt-1">タップで編集</p>
      {editing && (
        <EditModal
          initial={address}
          onCancel={() => setEditing(false)}
          onSave={v => {
            setAddress(v);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

// ── C 案: 住所タップ=Maps / 右 ✏️ 編集 (推奨) ───────────────────
function VariantC({ initial }: { initial: string }) {
  const [address, setAddress] = useState(initial);
  const [editing, setEditing] = useState(false);

  return (
    <div className="border-t border-[#F0F0F0] pt-2">
      <div className="text-[10px] text-[var(--color-subtext)] mb-0.5">住所</div>
      <div className="flex items-center gap-2">
        <a
          href={mapsUrl(address)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-0 text-sm text-[#111] truncate inline-flex items-center gap-1 active:opacity-60"
        >
          <span className="truncate">{address}</span>
          <ExternalLink size={12} className="text-[var(--color-icon-gray)] shrink-0" />
        </a>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="住所を編集"
          className="shrink-0 w-8 h-8 rounded-full hover:bg-[#F3F4F6] inline-flex items-center justify-center active:scale-95"
        >
          <Pencil size={14} className="text-[var(--color-subtext)]" />
        </button>
      </div>
      {editing && (
        <EditModal
          initial={address}
          onCancel={() => setEditing(false)}
          onSave={v => {
            setAddress(v);
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}

// ── 編集モーダル ─────────────────────────────────────────────────
function EditModal({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [val, setVal] = useState(initial);
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-3">
      <div className="bg-white rounded-2xl w-full max-w-[420px] p-4 shadow-xl space-y-3">
        <div className="flex items-center gap-2">
          <Pencil size={14} className="text-[var(--color-subtext)]" />
          <h3 className="text-sm font-semibold flex-1">住所を編集</h3>
          <button onClick={onCancel} aria-label="閉じる" className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-[#F3F4F6]">
            <X size={16} />
          </button>
        </div>
        <textarea
          value={val}
          onChange={e => setVal(e.target.value)}
          rows={3}
          autoFocus
          className="w-full rounded-[10px] border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] resize-none"
        />
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 h-10 rounded-full bg-[#F3F4F6] text-[13px] font-medium active:scale-95"
          >
            キャンセル
          </button>
          <button
            onClick={() => onSave(val.trim())}
            disabled={!val.trim()}
            className="flex-1 h-10 rounded-full bg-[#111] text-white text-[13px] font-bold inline-flex items-center justify-center gap-1 disabled:opacity-50 active:scale-95"
          >
            <Check size={14} />
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

function mapsUrl(addr: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
}
