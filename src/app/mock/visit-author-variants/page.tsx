'use client';

// ──────────────────────────────────────────────────────────────
// 訪問ログ「誰が記入したか」表示 — 4 パターン比較プレビュー
//
// 共有機能で複数人が同じデータに記入できるようになる予定。
// 「ヒデさん が書いた / Aさん が書いた」が一目で分かる UI を
// 4 パターン提案する。実際の訪問ログカードの構造に近い形で
// 並べて見比べる用。
//
// 4 パターン:
//   A. 右上アバター     — 控えめ・モダン
//   B. 日付横 byline    — コンテキスト一体型
//   C. 左カラーストライプ + チップ — 視覚優先
//   D. 下部 署名行       — 明示・分離型
//
// サンプルは 3 件の訪問を 2 人(ヒデさん/Aさん)で記入した想定。
// ──────────────────────────────────────────────────────────────

import Link from 'next/link';
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import StatusChip from '../../../components/StatusChip';
import type { VisitStatus, Respondent } from '../../../lib/types';
import { RESPONDENT_CONFIG } from '../../../lib/constants';

// ── サンプルデータ ──
type Author = { id: string; name: string; color: string; bg: string };

const ME: Author = { id: 'me', name: 'ヒデさん', color: '#0EA5E9', bg: '#E0F2FE' };
const A_SAN: Author = { id: 'a', name: 'Aさん', color: '#A855F7', bg: '#F3E8FF' };

type SampleVisit = {
  id: string;
  memberName: string;
  memberDistrict: string;
  date: string; // 表示用 「2026年4月25日」
  status: VisitStatus;
  respondents: Respondent[];
  notes: string;
  author: Author;
};

const SAMPLE_VISITS: SampleVisit[] = [
  {
    id: 'v1', memberName: '高桑 秀都', memberDistrict: '英雄', date: '2026年4月25日',
    status: 'absent', respondents: [],
    notes: 'ピンポンしましたが不在でした。お菓子を置いて帰ってきました。来週末また伺う予定。',
    author: ME,
  },
  {
    id: 'v2', memberName: '藤崎 勇輝', memberDistrict: '正義', date: '2026年4月23日',
    status: 'met_family', respondents: ['father'],
    notes: '父親が対応してくれました。本人は仕事中で不在。元気にしているとのこと。',
    author: A_SAN,
  },
  {
    id: 'v3', memberName: '高桑 秀都', memberDistrict: '英雄', date: '2026年4月12日',
    status: 'met_self', respondents: [],
    notes: '本人と話せた。最近 体調も良いとのこと。引き続き様子を見る。',
    author: ME,
  },
];

// 対応者ラベル
function respondentLabel(rs: Respondent[]): string {
  if (!rs.length) return '—';
  return rs.map(r => RESPONDENT_CONFIG[r]?.label ?? 'その他').join('・');
}

// イニシャル（日本語名から1文字）
function initial(name: string): string {
  return name.slice(0, 1);
}

// ── 共通: メンバー名カード ──
function MemberHeader({ v }: { v: SampleVisit }) {
  return (
    <div className="ios-card px-4 py-3 flex items-center gap-2">
      <span className="font-bold text-[15px]">{v.memberName}</span>
      <ChevronRight size={20} className="text-[var(--color-icon-gray)] shrink-0" />
      <span className="flex-1" />
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F0F0F0] text-[var(--color-subtext)]">
        {v.memberDistrict}
      </span>
    </div>
  );
}

// ── 共通: ボディ部分（メモ等、ヘッダ以外） ──
function VisitBody({ v }: { v: SampleVisit }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] text-[var(--color-subtext)] mb-1">カテゴリ</div>
          <StatusChip status={v.status} />
        </div>
        <div>
          <div className="text-[10px] text-[var(--color-subtext)] mb-1">対応者</div>
          <span className="text-sm font-medium">{respondentLabel(v.respondents)}</span>
        </div>
      </div>
      <div>
        <div className="text-[10px] text-[var(--color-subtext)] mb-1">メモ</div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{v.notes}</p>
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// パターン A: 右上アバター
// ──────────────────────────────────────────────────────────────
function VariantA({ v }: { v: SampleVisit }) {
  return (
    <div className="space-y-2">
      <MemberHeader v={v} />
      <div className="ios-card p-4 space-y-4 relative">
        {/* 右上アバター */}
        <div
          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
          style={{ background: v.author.bg, color: v.author.color }}
          title={`${v.author.name} が記入`}
        >
          {initial(v.author.name)}
        </div>
        <div className="flex items-center pr-10">
          <div className="flex-1">
            <div className="text-[10px] text-[var(--color-subtext)] mb-1">日付</div>
            <div className="text-sm font-medium">{v.date}</div>
          </div>
          <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 shrink-0">
            <Pencil size={18} className="text-gray-500" />
          </button>
        </div>
        <VisitBody v={v} />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// パターン B: 日付横 byline
// ──────────────────────────────────────────────────────────────
function VariantB({ v }: { v: SampleVisit }) {
  return (
    <div className="space-y-2">
      <MemberHeader v={v} />
      <div className="ios-card p-4 space-y-4">
        <div className="flex items-center">
          <div className="flex-1">
            <div className="text-[10px] text-[var(--color-subtext)] mb-1">日付</div>
            <div className="text-sm font-medium flex items-center gap-1.5 flex-wrap">
              <span>{v.date}</span>
              <span className="text-[var(--color-subtext)] text-[12px]">·</span>
              <span
                className="text-[12px] font-semibold inline-flex items-center gap-1"
                style={{ color: v.author.color }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{ background: v.author.color }}
                />
                {v.author.name}
              </span>
            </div>
          </div>
          <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 shrink-0">
            <Pencil size={18} className="text-gray-500" />
          </button>
        </div>
        <VisitBody v={v} />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// パターン C: 左カラーストライプ + チップ
// ──────────────────────────────────────────────────────────────
function VariantC({ v }: { v: SampleVisit }) {
  return (
    <div className="space-y-2">
      <MemberHeader v={v} />
      <div
        className="ios-card p-4 space-y-4 relative overflow-hidden"
        style={{ borderLeft: `4px solid ${v.author.color}` }}
      >
        <div className="flex items-center">
          <div className="flex-1">
            <div className="text-[10px] text-[var(--color-subtext)] mb-1 flex items-center gap-2">
              <span>日付</span>
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: v.author.bg, color: v.author.color }}
              >
                <span
                  className="w-1 h-1 rounded-full"
                  style={{ background: v.author.color }}
                />
                {v.author.name}
              </span>
            </div>
            <div className="text-sm font-medium">{v.date}</div>
          </div>
          <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 shrink-0">
            <Pencil size={18} className="text-gray-500" />
          </button>
        </div>
        <VisitBody v={v} />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// パターン D: 下部 署名行
// ──────────────────────────────────────────────────────────────
function VariantD({ v }: { v: SampleVisit }) {
  return (
    <div className="space-y-2">
      <MemberHeader v={v} />
      <div className="ios-card p-4 space-y-4">
        <div className="flex items-center">
          <div className="flex-1">
            <div className="text-[10px] text-[var(--color-subtext)] mb-1">日付</div>
            <div className="text-sm font-medium">{v.date}</div>
          </div>
          <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 shrink-0">
            <Pencil size={18} className="text-gray-500" />
          </button>
        </div>
        <VisitBody v={v} />
        {/* 下部 署名行 */}
        <div
          className="-mx-4 -mb-4 mt-2 px-4 py-2 flex items-center gap-2 border-t"
          style={{ background: v.author.bg, borderColor: `${v.author.color}33` }}
        >
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
            style={{ background: v.author.color, color: '#fff' }}
          >
            {initial(v.author.name)}
          </div>
          <span className="text-[12px] font-semibold" style={{ color: v.author.color }}>
            {v.author.name}
          </span>
          <span className="text-[11px] text-[var(--color-subtext)]">が記入しました</span>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// セクション見出し
// ──────────────────────────────────────────────────────────────
function SectionHead({ label, title, desc }: { label: string; title: string; desc: string }) {
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
export default function VisitAuthorVariantsMock() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-16">
      {/* ナビ */}
      <nav className="ios-nav flex items-center px-4 py-3 gap-2 sticky top-0 z-10 bg-white/95 backdrop-blur">
        <Link href="/" className="flex items-center gap-1 text-[var(--color-primary)] shrink-0">
          <ChevronLeft size={24} />
          <span className="text-sm">戻る</span>
        </Link>
        <h1 className="text-base font-bold truncate flex-1 text-center">
          訪問ログ「誰が記入」UI 比較
        </h1>
        <div className="w-[52px] shrink-0" />
      </nav>

      {/* イントロ */}
      <div className="px-4 pt-4 pb-2">
        <div className="ios-card p-4 bg-[#FFFBEB] border border-[#FDE68A]">
          <h2 className="text-[14px] font-bold mb-1">📝 共有機能 デザイン提案</h2>
          <p className="text-[12px] leading-relaxed text-[#92400E]">
            複数人で訪問ログを記入する時、<strong>誰が書いたか一目で分かる UI</strong>を 4 パターン用意したで。
            同じ訪問データを 4 種類の見せ方で並べてるから、見比べてどれがしっくりくるか教えてな。
          </p>
          <div className="mt-3 pt-3 border-t border-[#FDE68A]/60 flex items-center gap-3 text-[11px]">
            <span className="font-semibold">凡例:</span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: ME.color }} />
              {ME.name}（自分）
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: A_SAN.color }} />
              {A_SAN.name}（招待された人）
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-[640px] mx-auto px-4">
        {/* パターン A */}
        <SectionHead
          label="A"
          title="右上アバター"
          desc="控えめ・モダン。SlackやLinear風。普段はじゃまにならず、必要な時に「誰?」が分かる。色違いの円形イニシャル。"
        />
        <div className="space-y-3">
          {SAMPLE_VISITS.map(v => <VariantA key={`a-${v.id}`} v={v} />)}
        </div>

        {/* パターン B */}
        <SectionHead
          label="B"
          title="日付横 byline"
          desc="一体型。日付の隣に「・ヒデさん」と並べる。読み流す時に名前と日付が同じ行で見える。"
        />
        <div className="space-y-3">
          {SAMPLE_VISITS.map(v => <VariantB key={`b-${v.id}`} v={v} />)}
        </div>

        {/* パターン C */}
        <SectionHead
          label="C"
          title="左カラーストライプ+チップ"
          desc="視覚優先。カードの左端に色帯 + 上にカラフルなチップ。スクロール中にパッと色で識別できる。"
        />
        <div className="space-y-3">
          {SAMPLE_VISITS.map(v => <VariantC key={`c-${v.id}`} v={v} />)}
        </div>

        {/* パターン D */}
        <SectionHead
          label="D"
          title="下部 署名行"
          desc="明示・分離型。カード下にメール署名みたいな帯。「ヒデさんが記入しました」と完全な文章で表示。"
        />
        <div className="space-y-3">
          {SAMPLE_VISITS.map(v => <VariantD key={`d-${v.id}`} v={v} />)}
        </div>

        {/* 比較サマリ */}
        <div className="mt-12 ios-card p-4 bg-[#F9FAFB]">
          <h2 className="text-[14px] font-bold mb-3">🤔 どう選ぶ？</h2>
          <div className="space-y-3 text-[12px] leading-relaxed">
            <div>
              <strong className="text-[#0EA5E9]">A. 右上アバター</strong>
              <p className="text-[var(--color-subtext)] mt-0.5">
                ◯ じゃまにならない、見た目スッキリ<br />
                × 名前を確認するのにタップ必要、初見の人には伝わりにくい
              </p>
            </div>
            <div>
              <strong className="text-[#10B981]">B. 日付横 byline</strong>
              <p className="text-[var(--color-subtext)] mt-0.5">
                ◯ 自然・読み流しやすい、追加要素少なめ<br />
                × 日付エリアが少し賑やかになる
              </p>
            </div>
            <div>
              <strong className="text-[#A855F7]">C. 左ストライプ+チップ</strong>
              <p className="text-[var(--color-subtext)] mt-0.5">
                ◯ スクロール中に色だけで瞬時に識別、誰のか即分かる<br />
                × 見た目が賑やか、人数増えると色管理大変
              </p>
            </div>
            <div>
              <strong className="text-[#F59E0B]">D. 下部 署名行</strong>
              <p className="text-[var(--color-subtext)] mt-0.5">
                ◯ 完全な文章で誰でも分かる、ミス無し<br />
                × 縦に長くなる、リスト一覧時の密度が下がる
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
