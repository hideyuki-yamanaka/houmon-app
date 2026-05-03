'use client';

// ──────────────────────────────────────────────────────────────
// 作者バッジ v3 — アイコンの「シルエット・造形」5案
//
// ヒデさん指示 (2026-05-03):
//   - ベースは B 案 (塗りつぶし + 名前 太字) で確定
//   - アイコンの 形・シルエット の違いを 5 通り見比べたい
//   - 「父」等の対応者タグは表示しない (段落ち防止のため)
//
// ベースは VisitCard と同じ レイアウト・配色 を使用。
// ──────────────────────────────────────────────────────────────

import Link from 'next/link';
import { ChevronLeft, ChevronRight, User, UserRound, PersonStanding } from 'lucide-react';
import StatusChip from '../../../components/StatusChip';
import type { VisitStatus } from '../../../lib/types';

type Author = { name: string };
const HIDE: Author = { name: 'ヒデ' };
const YAMA: Author = { name: 'ヤマナカ' };
const A_SAN: Author = { name: 'Aさん' };

type SampleVisit = {
  id: string; date: string; status: VisitStatus; summary: string; author: Author;
};

const SAMPLE_VISITS: SampleVisit[] = [
  {
    id: 'v1', date: '2026年4月25日', status: 'absent',
    summary: 'ピンポンしたが不在。お菓子を置いて来週末また伺う予定',
    author: HIDE,
  },
  {
    id: 'v2', date: '2026年4月23日', status: 'met_family',
    summary: '父親が対応。本人は仕事で不在。元気にしているとのこと',
    author: A_SAN,
  },
  {
    id: 'v3', date: '2026年4月12日', status: 'met_self',
    summary: '本人と話せた。最近 体調も良いとのこと。引き続き様子を見る',
    author: YAMA,
  },
];

// ──────────────────────────────────────────────────────────────
// VisitCard ベース部分 (対応者タグ削除済み)
// ──────────────────────────────────────────────────────────────
function CardBase({
  v, icon,
}: { v: SampleVisit; icon: React.ReactNode }) {
  return (
    <div className="ios-card p-4 flex items-center gap-3 active:bg-[#F5F5F5] transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold">{v.date}</span>
          <StatusChip status={v.status} />
          <span className="ml-auto inline-flex items-center gap-1 text-[12px] text-gray-900 font-bold shrink-0">
            {icon}
            {v.author.name}
          </span>
        </div>
        <p className="text-sm text-[var(--color-subtext)] mt-1.5 line-clamp-2">
          {v.summary}
        </p>
      </div>
      <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0" />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// パターン A: lucide User (デフォルト・細身)
// ──────────────────────────────────────────────────────────────
function VariantA({ v }: { v: SampleVisit }) {
  return (
    <CardBase v={v} icon={
      <User size={13} className="shrink-0 fill-gray-900 stroke-gray-900" />
    } />
  );
}

// ──────────────────────────────────────────────────────────────
// パターン B: lucide UserRound (頭がしっかり丸い・首太め)
// ──────────────────────────────────────────────────────────────
function VariantB({ v }: { v: SampleVisit }) {
  return (
    <CardBase v={v} icon={
      <UserRound size={13} className="shrink-0 fill-gray-900 stroke-gray-900" />
    } />
  );
}

// ──────────────────────────────────────────────────────────────
// パターン C: lucide PersonStanding (棒人間風・全身)
// ──────────────────────────────────────────────────────────────
function VariantC({ v }: { v: SampleVisit }) {
  return (
    <CardBase v={v} icon={
      <PersonStanding size={14} className="shrink-0 stroke-gray-900" strokeWidth={2.5} />
    } />
  );
}

// ──────────────────────────────────────────────────────────────
// パターン D: カスタム SVG — ふっくら系 (頭大きめ、体小さめのちびキャラ風)
// ──────────────────────────────────────────────────────────────
function ChibiIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="8" r="5" />
      <path d="M3 22 C 3 16, 7 14, 12 14 C 17 14, 21 16, 21 22 Z" />
    </svg>
  );
}
function VariantD({ v }: { v: SampleVisit }) {
  return (
    <CardBase v={v} icon={
      <span className="shrink-0 text-gray-900"><ChibiIcon size={14} /></span>
    } />
  );
}

// ──────────────────────────────────────────────────────────────
// パターン E: カスタム SVG — 角ばり系 (頭が四角、ロボ/ピクセル風)
// ──────────────────────────────────────────────────────────────
function SquareHeadIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="6" y="2" width="12" height="11" rx="2" />
      <path d="M3 22 L 3 17 C 3 15, 5 14, 7 14 L 17 14 C 19 14, 21 15, 21 17 L 21 22 Z" />
    </svg>
  );
}
function VariantE({ v }: { v: SampleVisit }) {
  return (
    <CardBase v={v} icon={
      <span className="shrink-0 text-gray-900"><SquareHeadIcon size={13} /></span>
    } />
  );
}

// ──────────────────────────────────────────────────────────────
// セクション見出し
// ──────────────────────────────────────────────────────────────
function SectionHead({
  label, title, desc,
}: { label: string; title: string; desc: string }) {
  return (
    <div className="px-1 pt-6 pb-3">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-[11px] font-bold text-white bg-[#111] rounded px-1.5 py-0.5">
          {label}
        </span>
        <h2 className="text-[16px] font-bold">{title}</h2>
      </div>
      <p className="text-[12px] text-[var(--color-subtext)] leading-relaxed">{desc}</p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// ページ本体
// ──────────────────────────────────────────────────────────────
export default function VisitAuthorIconShapesMock() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-16">
      <nav className="ios-nav flex items-center px-4 py-3 gap-2 sticky top-0 z-10 bg-white/95 backdrop-blur">
        <Link href="/" className="flex items-center gap-1 text-[var(--color-primary)] shrink-0">
          <ChevronLeft size={24} />
          <span className="text-sm">戻る</span>
        </Link>
        <h1 className="text-base font-bold truncate flex-1 text-center">
          作者バッジ v3 (アイコン造形)
        </h1>
        <div className="w-[52px] shrink-0" />
      </nav>

      {/* イントロ */}
      <div className="px-4 pt-4 pb-2">
        <div className="ios-card p-4 bg-[#FFFBEB] border border-[#FDE68A]">
          <h2 className="text-[14px] font-bold mb-1">📝 デザイン提案 v3</h2>
          <p className="text-[12px] leading-relaxed text-[#92400E]">
            ベース確定: <strong>塗りつぶし + 名前 太字</strong>。<br />
            今回は<strong>アイコンの形・シルエット</strong>の違いを 5 案。<br />
            「父」等の対応者タグも削除済 (詳細ページで確認できる)。
          </p>
        </div>
      </div>

      <div className="max-w-[640px] mx-auto px-4">
        {/* A */}
        <SectionHead
          label="A"
          title="lucide User (細身・デフォ)"
          desc="lucide-react の標準 User アイコン。シンプルで肩のラインが綺麗、細身のシルエット。"
        />
        <div className="space-y-2">
          {SAMPLE_VISITS.map(v => <VariantA key={`a-${v.id}`} v={v} />)}
        </div>

        {/* B */}
        <SectionHead
          label="B"
          title="lucide UserRound (頭まる・しっかり)"
          desc="同じく lucide-react の UserRound。頭がはっきり丸くて、首も太め、安定感ある。"
        />
        <div className="space-y-2">
          {SAMPLE_VISITS.map(v => <VariantB key={`b-${v.id}`} v={v} />)}
        </div>

        {/* C */}
        <SectionHead
          label="C"
          title="lucide PersonStanding (棒人間・全身)"
          desc="頭・体・足のラインが見える棒人間風。「人」が立ってる感じ、ピクトグラム的。"
        />
        <div className="space-y-2">
          {SAMPLE_VISITS.map(v => <VariantC key={`c-${v.id}`} v={v} />)}
        </div>

        {/* D */}
        <SectionHead
          label="D"
          title="カスタム ふっくら (ちびキャラ風)"
          desc="頭大きめ・体小さめ、ちょっと可愛い系。優しい雰囲気を出したい時。"
        />
        <div className="space-y-2">
          {SAMPLE_VISITS.map(v => <VariantD key={`d-${v.id}`} v={v} />)}
        </div>

        {/* E */}
        <SectionHead
          label="E"
          title="カスタム 角ばり (ロボ/ピクセル風)"
          desc="頭が四角く、レゴ人形/ロボ系のシルエット。クールでテクニカルな雰囲気。"
        />
        <div className="space-y-2">
          {SAMPLE_VISITS.map(v => <VariantE key={`e-${v.id}`} v={v} />)}
        </div>

        {/* 比較サマリ */}
        <div className="mt-12 ios-card p-4 bg-[#F9FAFB]">
          <h2 className="text-[14px] font-bold mb-3">🤔 どう選ぶ？</h2>
          <div className="space-y-3 text-[12px] leading-relaxed">
            <div>
              <strong>A. User 細身</strong>
              <p className="text-[var(--color-subtext)] mt-0.5">
                ◯ ニュートラル、Slack/Notion で慣れた形<br />
                × 個性ない
              </p>
            </div>
            <div>
              <strong>B. UserRound しっかり</strong>
              <p className="text-[var(--color-subtext)] mt-0.5">
                ◯ 頭丸くて視認性高い、安定感<br />
                × A と差が小さい
              </p>
            </div>
            <div>
              <strong>C. PersonStanding 棒人間</strong>
              <p className="text-[var(--color-subtext)] mt-0.5">
                ◯ 「人」感ハッキリ、ピクトグラム的<br />
                × 細い線のみで小さいと見えにくい
              </p>
            </div>
            <div>
              <strong>D. ふっくら ちび</strong>
              <p className="text-[var(--color-subtext)] mt-0.5">
                ◯ 親しみやすい、家族向けアプリに合う<br />
                × ビジネス感は薄い
              </p>
            </div>
            <div>
              <strong>E. 角ばり ロボ</strong>
              <p className="text-[var(--color-subtext)] mt-0.5">
                ◯ 個性的、テック寄りの雰囲気<br />
                × 家庭訪問アプリの世界観とちょっとズレるかも
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
