'use client';

// ──────────────────────────────────────────────────────────────
// メンバーカード下に「訪問ログセクション(グレー背景)」を付ける
// レイアウト 5 案 比較プロトタイプ
//
// ヒデさん要望(2026-05-03 更新):
//   - メンバーカードの下にグレーのセクションが追加される
//   - 中身は「日付 + ステータスチップ + メモ最大2行」
//   - 5 パターン UI を比較したい
//
// このページは比較用モックなのでハードコードのサンプルメンバーで描画する。
// ──────────────────────────────────────────────────────────────

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Clock, ChevronRight as ChevronR } from 'lucide-react';
import StatusChip from '../../../components/StatusChip';
import type { VisitStatus } from '../../../lib/types';

// ── サンプルデータ(ヒデさんスクショ準拠) ──
type SampleVisit = {
  id: string;
  date: string;
  status: VisitStatus;
  memo: string;
};
type SampleMember = {
  id: string;
  name: string;
  kana: string;
  district: string;
  age: number;
  visits: SampleVisit[];
};

const MEMBER_HIDETO: SampleMember = {
  id: 'm1',
  name: '高桑 秀都',
  kana: 'たかくわ ひでと',
  district: '英雄地区',
  age: 24,
  visits: [
    {
      id: 'v1',
      date: '2026-04-25',
      status: 'absent',
      memo: '集合マンションみたいな形の一番右が高桑さんがいる場所で、3階。ピンポンして不在だったので、お菓子を置いて帰ってきました。',
    },
    {
      id: 'v2',
      date: '2026-04-12',
      status: 'met_family',
      memo: 'お母さんが対応してくれた。本人は仕事で不在。来週末また伺うことを約束。',
    },
    {
      id: 'v3',
      date: '2026-03-29',
      status: 'met_self',
      memo: '本人と話せた。元気そうで何より。',
    },
  ],
};

// 短めメモ・1件だけバリエーション
const MEMBER_FUJISAKI: SampleMember = {
  id: 'm2',
  name: '藤崎 勇輝',
  kana: 'ふじさき ゆうき',
  district: '正義地区',
  age: 28,
  visits: [
    {
      id: 'v4',
      date: '2026-04-25',
      status: 'met_family',
      memo: '父親が対応。',
    },
  ],
};

// 未訪問
const MEMBER_ASAHI: SampleMember = {
  id: 'm3',
  name: '朝日 涼太',
  kana: 'あさひ りょうた',
  district: '歓喜地区',
  age: 25,
  visits: [],
};

const ALL_MEMBERS = [MEMBER_HIDETO, MEMBER_FUJISAKI, MEMBER_ASAHI];

function fmtJaDate(s: string): string {
  const [y, m, d] = s.split('-').map(Number);
  return `${y}年${m}月${d}日`;
}
function fmtMD(s: string): string {
  const [, m, d] = s.split('-').map(Number);
  return `${m}/${d}`;
}

// ── メンバーカード(上半分の見た目) — 全パターン共通 ──
function MemberHead({ m }: { m: SampleMember }) {
  return (
    <div className="px-3 py-2.5 flex items-center gap-3 bg-white">
      <span className="w-7 h-10 shrink-0 inline-flex items-center justify-center">
        <PinSvg />
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-[#6B7280] block leading-tight">{m.kana}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[15px]">{m.name}</span>
          <span className="text-[11px] text-[#9CA3AF]">({m.age})</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F0F0F0] text-[#6B7280]">
            {m.district}
          </span>
          <span className="text-[11px] text-[#6B7280]">
            {m.visits.length > 0 ? `${m.visits.length} 回訪問` : '未訪問'}
          </span>
        </div>
      </div>
    </div>
  );
}

function PinSvg() {
  return (
    <svg width="18" height="26" viewBox="0 0 28 40" fill="none">
      <path
        d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 40 14 40S28 24.5 28 14C28 6.268 21.732 0 14 0Z"
        fill="#0EA5E9"
        stroke="#0284C7"
        strokeWidth="1"
      />
      <circle cx="14" cy="13.5" r="5" fill="#fff" />
    </svg>
  );
}

// 共通: 「未訪問」セクション
function EmptyVisits() {
  return (
    <div className="px-3 py-2.5 bg-[#F5F5F5] text-center">
      <span className="text-[11px] text-[#9CA3AF]">訪問ログはまだありません</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 A: 1段ミニマル(横並び・最新ログだけ)
//   [チップ] 日付 / メモ 1 行(省略)
//   - 一番省スペース
//   - 最新の 1 件しか見せない(複数あっても最新だけ)
// ──────────────────────────────────────────────────────────────
function CardA({ m }: { m: SampleMember }) {
  const v = m.visits[0];
  return (
    <div className="rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <MemberHead m={m} />
      {v ? (
        <div className="px-3 py-2 bg-[#F5F5F5] flex items-center gap-2 min-w-0">
          <StatusChip status={v.status} size="sm" />
          <span className="text-[11px] tabular-nums text-[#6B7280] shrink-0">{fmtMD(v.date)}</span>
          <span className="text-[11px] text-[#374151] truncate flex-1">{v.memo}</span>
        </div>
      ) : <EmptyVisits />}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 B: 2段スタンダード(最新ログ・日付+チップを上、メモ2行)★推奨
//   - スクショに一番近い形
//   - 最新の 1 件だけ表示
// ──────────────────────────────────────────────────────────────
function CardB({ m }: { m: SampleMember }) {
  const v = m.visits[0];
  return (
    <div className="rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <MemberHead m={m} />
      {v ? (
        <div className="px-3 py-2.5 bg-[#F5F5F5]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[12px] font-bold text-[#111] tabular-nums">{fmtJaDate(v.date)}</span>
            <StatusChip status={v.status} size="sm" />
          </div>
          <p className="text-[11px] text-[#374151] leading-snug line-clamp-2">{v.memo}</p>
        </div>
      ) : <EmptyVisits />}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 C: 全件タイムライン(縦に積む)
//   - 全訪問を縦に並べる
//   - 各エントリ: 日付 + チップ + メモ 2 行
//   - 多くなりすぎたら 3 件で切って「もっと見る」(省略)
// ──────────────────────────────────────────────────────────────
function CardC({ m }: { m: SampleMember }) {
  if (m.visits.length === 0) {
    return (
      <div className="rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <MemberHead m={m} />
        <EmptyVisits />
      </div>
    );
  }
  return (
    <div className="rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <MemberHead m={m} />
      <div className="bg-[#F5F5F5] divide-y divide-[#E5E7EB]">
        {m.visits.map(v => (
          <div key={v.id} className="px-3 py-2.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12px] font-bold text-[#111] tabular-nums">{fmtJaDate(v.date)}</span>
              <StatusChip status={v.status} size="sm" />
            </div>
            <p className="text-[11px] text-[#374151] leading-snug line-clamp-2">{v.memo}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 D: 横カルーセル(前回案ベース、グレー背景化)
//   - 複数訪問を横スワイプで 1 枚ずつ
//   - 各カード: 日付 + チップ + メモ 2 行
// ──────────────────────────────────────────────────────────────
function CardD({ m }: { m: SampleMember }) {
  if (m.visits.length === 0) {
    return (
      <div className="rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <MemberHead m={m} />
        <EmptyVisits />
      </div>
    );
  }
  return (
    <div className="rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <MemberHead m={m} />
      <div className="bg-[#F5F5F5] py-2">
        <div
          className="flex gap-2 overflow-x-auto px-3 pb-1"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {m.visits.map((v, i) => (
            <div
              key={v.id}
              className="shrink-0 w-[260px] rounded-lg bg-white border border-[#E5E7EB] p-2.5"
              style={{ scrollSnapAlign: 'start' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-bold tabular-nums">{fmtJaDate(v.date)}</span>
                <StatusChip status={v.status} size="sm" />
              </div>
              <p className="text-[11px] text-[#374151] leading-snug line-clamp-2">{v.memo}</p>
              {m.visits.length > 1 && (
                <div className="mt-1 text-[9px] text-[#9CA3AF] tabular-nums text-right">
                  {i + 1} / {m.visits.length}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 案 E: タイムライン縦線型(縦・接続線あり)
//   - 各エントリの左に小さなドット + 縦線でつなぐ
//   - 訪問ログ感が「履歴」っぽくて視覚的に分かりやすい
// ──────────────────────────────────────────────────────────────
function CardE({ m }: { m: SampleMember }) {
  if (m.visits.length === 0) {
    return (
      <div className="rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
        <MemberHead m={m} />
        <EmptyVisits />
      </div>
    );
  }
  return (
    <div className="rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      <MemberHead m={m} />
      <div className="bg-[#F5F5F5] px-3 pt-2.5 pb-1">
        <ul className="relative">
          {/* 縦線 */}
          <span
            className="absolute left-[5px] top-1.5 bottom-2 w-px bg-[#D1D5DB]"
            aria-hidden
          />
          {m.visits.map(v => (
            <li key={v.id} className="relative pl-5 pb-2.5 last:pb-0">
              {/* ドット */}
              <span
                className="absolute left-0 top-1 w-3 h-3 rounded-full bg-white border-2"
                style={{ borderColor: '#9CA3AF' }}
                aria-hidden
              />
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[12px] font-bold text-[#111] tabular-nums">{fmtJaDate(v.date)}</span>
                <StatusChip status={v.status} size="sm" />
              </div>
              <p className="text-[11px] text-[#374151] leading-snug line-clamp-2">{v.memo}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// メインページ
// ──────────────────────────────────────────────────────────────
type Variant = 'simple' | 'A' | 'B' | 'C' | 'D' | 'E';

const VARIANTS: { key: Variant; label: string; desc: string }[] = [
  { key: 'simple', label: '現状', desc: 'メンバーカードのみ。訪問ログ無し' },
  { key: 'A', label: 'A. 1段ミニマル', desc: '最新ログを1行で。チップ・日付・メモ1行(省略)' },
  { key: 'B', label: 'B. 2段スタンダード ★', desc: 'ヘッダー+メモ2行。スクショに一番近い、推奨' },
  { key: 'C', label: 'C. 全件タイムライン', desc: '訪問全件を縦に並べる。各エントリにメモ2行' },
  { key: 'D', label: 'D. 横カルーセル', desc: '複数訪問を横スワイプ。1枚ずつ snap' },
  { key: 'E', label: 'E. 縦線つなぎ', desc: 'タイムライン感。ドット+縦線でつなぐ' },
];

// シンプル版: メンバーカードだけ
function CardSimple({ m }: { m: SampleMember }) {
  const lastVisit = m.visits[0];
  return (
    <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-3 py-2.5 flex items-center gap-3">
      <span className="w-7 h-10 shrink-0 inline-flex items-center justify-center">
        <PinSvg />
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] text-[#6B7280] block leading-tight">{m.kana}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[15px]">{m.name}</span>
          <span className="text-[11px] text-[#9CA3AF]">({m.age})</span>
          <ChevronR size={20} className="text-[#D1D5DB] shrink-0" />
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F0F0F0] text-[#6B7280]">
            {m.district}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-[#6B7280]">
            <Clock size={12} strokeWidth={1.8} />
            {lastVisit
              ? `${fmtJaDate(lastVisit.date)}(${m.visits.length}回)`
              : '----年--月--日'}
          </span>
        </div>
      </div>
    </div>
  );
}

function renderCard(variant: Variant, m: SampleMember) {
  if (variant === 'simple') return <CardSimple m={m} />;
  if (variant === 'A') return <CardA m={m} />;
  if (variant === 'B') return <CardB m={m} />;
  if (variant === 'C') return <CardC m={m} />;
  if (variant === 'D') return <CardD m={m} />;
  return <CardE m={m} />;
}

// ── 「ぼんやりマップ風」 背景(本物の地図の代わり) ──
function FakeMapBg() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background: 'linear-gradient(135deg, #E8F5E9 0%, #E3F2FD 100%)',
        backgroundImage: `
          linear-gradient(#D1D5DB22 1px, transparent 1px),
          linear-gradient(90deg, #D1D5DB22 1px, transparent 1px)
        `,
        backgroundSize: '32px 32px',
      }}
    >
      {/* ピン風の点 */}
      <span className="absolute left-[18%] top-[24%] w-3 h-4">
        <PinSvg />
      </span>
      <span className="absolute left-[42%] top-[18%] w-3 h-4">
        <PinSvg />
      </span>
      <span className="absolute left-[68%] top-[36%] w-3 h-4">
        <PinSvg />
      </span>
      <span className="absolute left-[28%] top-[52%] w-3 h-4">
        <PinSvg />
      </span>
      <span className="absolute left-[56%] top-[44%] w-3 h-4">
        <PinSvg />
      </span>
    </div>
  );
}

export default function MemberCardVariantsPage() {
  const [variant, setVariant] = useState<Variant>('B');

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-20">
      <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#E5E7EB] px-4 py-3 flex items-center gap-2">
        <Link href="/log" className="flex items-center gap-1 text-[var(--color-primary)]">
          <ChevronLeft size={22} />
          <span className="text-sm">戻る</span>
        </Link>
        <h1 className="flex-1 text-center text-base font-bold">メンバーカード 5案</h1>
        <div className="w-14" />
      </nav>

      {/* 説明 + 切替 */}
      <section className="px-4 pt-3 pb-1">
        <p className="text-[12px] text-[#6B7280] leading-relaxed">
          実際の「ホーム地図 + ボトムシート」に組み込んだ状態でプレビュー。
          スクロール下端まで見て案を比較してな。
        </p>
      </section>

      {/* 切替セグメント (sticky で上に追従) */}
      <section className="sticky top-[52px] z-20 bg-[#F5F5F7] px-4 pt-2 pb-2 border-b border-[#E5E7EB]">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-4 px-4">
          {VARIANTS.map(v => (
            <button
              key={v.key}
              type="button"
              onClick={() => setVariant(v.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                variant === v.key
                  ? 'bg-[#111] text-white'
                  : 'bg-white text-[#6B7280] border border-[#E5E7EB] active:bg-[#F0F0F0]'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-[#6B7280] mt-1.5">
          {VARIANTS.find(v => v.key === variant)?.desc}
        </p>
      </section>

      {/* ─── 実画面風プレビュー: ホーム画面 + メンバー一覧ボトムシート ─── */}
      <section className="px-3 pt-4">
        <div
          className="relative rounded-2xl overflow-hidden border border-[#E5E7EB] bg-white shadow-sm"
          style={{ height: 720, maxWidth: 480, margin: '0 auto' }}
        >
          {/* マップ風背景 (上半分) */}
          <div className="absolute inset-x-0 top-0 h-[260px]">
            <FakeMapBg />
          </div>

          {/* ボトムシート風 (下半分) */}
          <div
            className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-[0_-4px_16px_rgba(0,0,0,0.08)] flex flex-col"
            style={{ top: 220 }}
          >
            {/* シートのドラッグハンドル */}
            <div className="flex justify-center pt-2 pb-2">
              <div className="w-9 h-[5px] rounded-full bg-gray-300" />
            </div>
            {/* シートヘッダー */}
            <div className="px-4 pb-2 border-b border-[#F0F0F0] shrink-0 flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <h2 className="text-base font-bold">メンバー</h2>
                <span className="text-xs text-[#6B7280]">3人</span>
              </div>
              <span className="text-xs text-[#9CA3AF]">並び順 ▼</span>
            </div>
            {/* メンバーリスト(スクロール) */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {ALL_MEMBERS.map(m => (
                <div key={m.id}>{renderCard(variant, m)}</div>
              ))}
              <p className="text-[10px] text-center text-[#9CA3AF] pt-2">
                ↑ ボトムシート内をスクロール
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* メンバー説明 */}
      <section className="px-4 pt-4">
        <div className="rounded-xl bg-white border border-[#E5E7EB] p-3 text-[11px] text-[#6B7280] leading-relaxed">
          <strong className="text-[#111]">サンプル内訳:</strong>
          <br />・高桑 秀都 = 訪問 3 件(複数パターン確認用)
          <br />・藤崎 勇輝 = 訪問 1 件(単発の見え方)
          <br />・朝日 涼太 = 未訪問(空状態)
        </div>
      </section>

      {/* 仕様サマリ */}
      <section className="px-4 pt-4">
        <div className="rounded-xl bg-white border border-[#E5E7EB] p-4">
          <h3 className="text-[13px] font-bold mb-2">5 案の特徴まとめ</h3>
          <ul className="text-[12px] text-[#374151] space-y-1.5 leading-relaxed">
            <li><b>A. 1段ミニマル</b> — 最小スペース、最新 1 件のみ、メモも 1 行省略</li>
            <li><b>B. 2段スタンダード ★</b> — ヘッダー(日付+チップ) と メモ 2 行。スクショ準拠</li>
            <li><b>C. 全件タイムライン</b> — 全訪問を縦に並べる。リスト感、情報量多め</li>
            <li><b>D. 横カルーセル</b> — 複数訪問を横スワイプ。コンパクト、複数比較しやすい</li>
            <li><b>E. 縦線つなぎ</b> — ドット+縦線でタイムライン感。視覚的に「履歴」っぽい</li>
          </ul>
          <p className="text-[11px] text-[#6B7280] mt-3 leading-relaxed">
            気に入った案 + 「メンバーカード上のチェブロン要らん」「メモのフォントもう少し大きく」
            みたいな個別調整も気軽に〜。組み合わせ案(B+E ハイブリッド等)も歓迎。
          </p>
        </div>
      </section>
    </div>
  );
}
