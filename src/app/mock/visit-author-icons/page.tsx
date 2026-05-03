'use client';

// ──────────────────────────────────────────────────────────────
// 訪問ログ「誰が記入したか」表示 v2 — 色分け廃止 / 人アイコン+名前 5 パターン
//
// ヒデさん指示 (2026-05-03 改訂):
//   - 色分けは廃止、グレースケールで統一
//   - 人アイコン + 名前 で識別する
//   - 5 パターン提案、実カード(VisitCard 風)に組み込んだ プレビュー
//
// 既存の VisitCard ベースに、5 種類の「作者バッジ」を載せて見比べる。
// ──────────────────────────────────────────────────────────────

import Link from 'next/link';
import { ChevronLeft, ChevronRight, User, UserCircle2 } from 'lucide-react';
import StatusChip from '../../../components/StatusChip';
import type { VisitStatus, Respondent } from '../../../lib/types';
import { RESPONDENT_CONFIG } from '../../../lib/constants';

// ── サンプル訪問データ ──
type Author = { name: string };

type SampleVisit = {
  id: string;
  date: string;
  status: VisitStatus;
  respondents: Respondent[];
  summary: string;
  author: Author;
};

const HIDE: Author = { name: 'ヒデ' };
const YAMA: Author = { name: 'ヤマナカ' };
const A_SAN: Author = { name: 'Aさん' };

const SAMPLE_VISITS: SampleVisit[] = [
  {
    id: 'v1', date: '2026年4月25日', status: 'absent', respondents: [],
    summary: 'ピンポンしたが不在。お菓子を置いて来週末また伺う予定',
    author: HIDE,
  },
  {
    id: 'v2', date: '2026年4月23日', status: 'met_family', respondents: ['father'],
    summary: '父親が対応。本人は仕事で不在。元気にしているとのこと',
    author: A_SAN,
  },
  {
    id: 'v3', date: '2026年4月12日', status: 'met_self', respondents: [],
    summary: '本人と話せた。最近 体調も良いとのこと。引き続き様子を見る',
    author: YAMA,
  },
];

function joinResp(rs: Respondent[]): string {
  if (!rs.length) return '';
  return rs.map(r => RESPONDENT_CONFIG[r]?.label ?? 'その他').join('・');
}

// ──────────────────────────────────────────────────────────────
// VisitCard ベース部分 (作者バッジ以外、共通)
// ──────────────────────────────────────────────────────────────
function CardBase({
  v,
  authorBadge,
  authorBadgeBottom,
}: {
  v: SampleVisit;
  authorBadge?: React.ReactNode;       // 1行目の右端に置く想定
  authorBadgeBottom?: React.ReactNode; // 2行目の右端に置く想定
}) {
  const respondentLabel = joinResp(v.respondents);
  return (
    <div className="ios-card p-4 active:bg-[#F5F5F5] transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-bold">{v.date}</span>
            <StatusChip status={v.status} />
            {respondentLabel && (
              <span className="text-sm px-2.5 py-0.5 rounded-full bg-gray-100 text-[var(--color-subtext)]">
                {respondentLabel}
              </span>
            )}
            {authorBadge && (
              <span className="ml-auto">{authorBadge}</span>
            )}
          </div>
          <div className="flex items-end justify-between gap-2 mt-1.5">
            <p className="text-sm text-[var(--color-subtext)] line-clamp-2 flex-1">
              {v.summary}
            </p>
            {authorBadgeBottom && <span className="shrink-0">{authorBadgeBottom}</span>}
          </div>
        </div>
        <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0 mt-1" />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// パターン A: ライン User アイコン + 名前 (1行目右端、グレー)
// ──────────────────────────────────────────────────────────────
function VariantA({ v }: { v: SampleVisit }) {
  return (
    <CardBase
      v={v}
      authorBadge={
        <span className="inline-flex items-center gap-1 text-[12px] text-gray-500 font-medium">
          <User size={13} className="shrink-0" strokeWidth={2} />
          {v.author.name}
        </span>
      }
    />
  );
}

// ──────────────────────────────────────────────────────────────
// パターン B: 塗りつぶし User + 名前 太字 黒
// ──────────────────────────────────────────────────────────────
function VariantB({ v }: { v: SampleVisit }) {
  return (
    <CardBase
      v={v}
      authorBadge={
        <span className="inline-flex items-center gap-1 text-[12px] text-gray-900 font-bold">
          <User size={13} className="shrink-0 fill-gray-900 stroke-gray-900" />
          {v.author.name}
        </span>
      }
    />
  );
}

// ──────────────────────────────────────────────────────────────
// パターン C: 円形背景 + 中に User アイコン + 名前
// ──────────────────────────────────────────────────────────────
function VariantC({ v }: { v: SampleVisit }) {
  return (
    <CardBase
      v={v}
      authorBadge={
        <span className="inline-flex items-center gap-1.5 text-[12px] text-gray-700 font-medium">
          <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
            <User size={11} className="text-gray-600" strokeWidth={2.5} />
          </span>
          {v.author.name}
        </span>
      }
    />
  );
}

// ──────────────────────────────────────────────────────────────
// パターン D: by プレフィックス + アイコン + 名前 (2行目の右端)
// ──────────────────────────────────────────────────────────────
function VariantD({ v }: { v: SampleVisit }) {
  return (
    <CardBase
      v={v}
      authorBadgeBottom={
        <span className="inline-flex items-center gap-0.5 text-[11px] text-gray-400 font-medium">
          <span className="opacity-60">by</span>
          <User size={11} className="shrink-0 ml-0.5" strokeWidth={2} />
          <span className="text-gray-600">{v.author.name}</span>
        </span>
      }
    />
  );
}

// ──────────────────────────────────────────────────────────────
// パターン E: イニシャル円アイコン + 名前 (頭文字を円に)
// ──────────────────────────────────────────────────────────────
function VariantE({ v }: { v: SampleVisit }) {
  const initial = v.author.name.slice(0, 1);
  return (
    <CardBase
      v={v}
      authorBadge={
        <span className="inline-flex items-center gap-1.5 text-[12px] text-gray-700 font-medium">
          <span className="w-5 h-5 rounded-full bg-gray-700 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
            {initial}
          </span>
          {v.author.name}
        </span>
      }
    />
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
export default function VisitAuthorIconsMock() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-16">
      <nav className="ios-nav flex items-center px-4 py-3 gap-2 sticky top-0 z-10 bg-white/95 backdrop-blur">
        <Link href="/" className="flex items-center gap-1 text-[var(--color-primary)] shrink-0">
          <ChevronLeft size={24} />
          <span className="text-sm">戻る</span>
        </Link>
        <h1 className="text-base font-bold truncate flex-1 text-center">
          作者バッジ v2 (色分け廃止)
        </h1>
        <div className="w-[52px] shrink-0" />
      </nav>

      {/* イントロ */}
      <div className="px-4 pt-4 pb-2">
        <div className="ios-card p-4 bg-[#FFFBEB] border border-[#FDE68A]">
          <h2 className="text-[14px] font-bold mb-1">📝 デザイン提案 v2</h2>
          <p className="text-[12px] leading-relaxed text-[#92400E]">
            色分けは<strong>廃止</strong>。<strong>人アイコン + 名前</strong>で誰が書いたか識別するスタイル。
            既存の <strong>VisitCard (2行表示)</strong> ベースに 5 通りの作者バッジを載せて比較。
            アイコンの種類・配置・名前のフォーマットで違いを出してる。
          </p>
        </div>
      </div>

      <div className="max-w-[640px] mx-auto px-4">
        {/* A */}
        <SectionHead
          label="A"
          title="ライン アイコン + 名前 (グレー)"
          desc="lucide User の outline 版。1行目右端にさりげなく。情報量少なめで主張控えめ。"
        />
        <div className="space-y-2">
          {SAMPLE_VISITS.map(v => <VariantA key={`a-${v.id}`} v={v} />)}
        </div>

        {/* B */}
        <SectionHead
          label="B"
          title="塗りつぶし アイコン + 名前 太字"
          desc="同じ位置・同じアイコンやけど、塗りつぶし & 太字で存在感アップ。記録した人を主張する。"
        />
        <div className="space-y-2">
          {SAMPLE_VISITS.map(v => <VariantB key={`b-${v.id}`} v={v} />)}
        </div>

        {/* C */}
        <SectionHead
          label="C"
          title="円形バッジ + アイコン + 名前"
          desc="グレーの円形バッジに人型アイコン。アバターっぽい雰囲気。SNS や Slack 系の見慣れた形。"
        />
        <div className="space-y-2">
          {SAMPLE_VISITS.map(v => <VariantC key={`c-${v.id}`} v={v} />)}
        </div>

        {/* D */}
        <SectionHead
          label="D"
          title="by プレフィックス (2行目右端)"
          desc="メール/Forum 風の byline スタイル。1行目を空けて、2行目の summary 横に小さく添える。スッキリ。"
        />
        <div className="space-y-2">
          {SAMPLE_VISITS.map(v => <VariantD key={`d-${v.id}`} v={v} />)}
        </div>

        {/* E */}
        <SectionHead
          label="E"
          title="イニシャル円 + 名前"
          desc="名前の頭文字を黒い円に白抜きで。アイコンより自分のものとして識別しやすい。プレゼンス感ある。"
        />
        <div className="space-y-2">
          {SAMPLE_VISITS.map(v => <VariantE key={`e-${v.id}`} v={v} />)}
        </div>

        {/* 比較サマリ */}
        <div className="mt-12 ios-card p-4 bg-[#F9FAFB]">
          <h2 className="text-[14px] font-bold mb-3">🤔 どう選ぶ？</h2>
          <div className="space-y-3 text-[12px] leading-relaxed">
            <div>
              <strong>A. ライン アイコン グレー</strong>
              <p className="text-[var(--color-subtext)] mt-0.5">
                ◯ 主張弱め、情報過多にならない<br />
                × 見落としやすい
              </p>
            </div>
            <div>
              <strong>B. 塗りつぶし 太字</strong>
              <p className="text-[var(--color-subtext)] mt-0.5">
                ◯ 誰が書いたかしっかり主張<br />
                × ステータスチップと同じくらい目立つ
              </p>
            </div>
            <div>
              <strong>C. 円形バッジ</strong>
              <p className="text-[var(--color-subtext)] mt-0.5">
                ◯ アバター感あって直感的、SNS 系の親しみ<br />
                × バッジが少し場所取る
              </p>
            </div>
            <div>
              <strong>D. by プレフィックス (右下)</strong>
              <p className="text-[var(--color-subtext)] mt-0.5">
                ◯ 一番スッキリ、1行目はそのまま<br />
                × summary に隠れて 見づらい瞬間がある
              </p>
            </div>
            <div>
              <strong>E. イニシャル円</strong>
              <p className="text-[var(--color-subtext)] mt-0.5">
                ◯ 「ヒ」「ヤ」だけで瞬時に区別<br />
                × 頭文字被ったら混乱 (ヒデ / ヒロ 両方おる場合等)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
