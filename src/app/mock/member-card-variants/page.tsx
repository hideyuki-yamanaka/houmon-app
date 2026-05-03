'use client';

// ──────────────────────────────────────────────────────────────
// メンバーカード 表示バリエーション プロトタイプ
//
// ヒデさん要望(2026-05-03):
//   - メンバーカードの下に「訪問ログ UI」を付けたい
//   - 訪問ログが複数ある場合は 横カルーセル(左右スワイプ)で 1 件ずつ
//   - メモは最大 2 行(line-clamp-2)
//   - 表示切替トグル: 「シンプル(現状)」と「ログ付き(展開)」
//
// このページはモックなのでサンプルデータ + ハードコード。
// ヒデさんが選んだバリエーションで本実装する。
// ──────────────────────────────────────────────────────────────

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Clock } from 'lucide-react';
import StatusChip from '../../../components/StatusChip';
import type { VisitStatus } from '../../../lib/types';

// ── サンプルメンバーデータ ──
type SampleVisit = {
  id: string;
  date: string; // YYYY-MM-DD
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

const MEMBERS: SampleMember[] = [
  {
    id: 'm1',
    name: '藤崎 勇輝',
    kana: 'ふじさき ゆうき',
    district: '正義地区',
    age: 28,
    visits: [
      {
        id: 'v1',
        date: '2026-04-25',
        status: 'met_family',
        memo: 'お母さんが対応してくれた。本人は仕事で不在。来週末また伺うことを約束。',
      },
      {
        id: 'v2',
        date: '2026-04-12',
        status: 'absent',
        memo: '玄関先に車があったが応答なし。',
      },
      {
        id: 'v3',
        date: '2026-03-29',
        status: 'met_self',
        memo: '本人と直接話せた。最近の活動について報告を受けた。',
      },
    ],
  },
  {
    id: 'm2',
    name: '曳地 真治',
    kana: 'ひきち しんじ',
    district: 'ナポレオン地区',
    age: 29,
    visits: [
      {
        id: 'v4',
        date: '2026-04-29',
        status: 'met_family',
        memo: '父親が出てくれた。本人は出張中とのこと。',
      },
    ],
  },
  {
    id: 'm3',
    name: '朝日 涼太',
    kana: 'あさひ りょうた',
    district: '歓喜地区',
    age: 25,
    visits: [], // 未訪問
  },
];

// ── ステータスのドット色を共通から借りる ──
function fmtJaDate(s: string): string {
  const [y, m, d] = s.split('-').map(Number);
  return `${y}年${m}月${d}日`;
}

// ──────────────────────────────────────────────────────────────
// バリエーション A: シンプル(現状ベース)
// ──────────────────────────────────────────────────────────────
function MemberCardSimple({ m }: { m: SampleMember }) {
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

// ──────────────────────────────────────────────────────────────
// バリエーション B: 訪問ログ展開(横カルーセル + メモ 2 行)
// ──────────────────────────────────────────────────────────────
function MemberCardWithLogs({ m }: { m: SampleMember }) {
  return (
    <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden">
      {/* 上半分: シンプル版と同じヘッダー */}
      <div className="px-3 py-2.5 flex items-center gap-3">
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

      {/* 下半分: 訪問ログカルーセル */}
      {m.visits.length === 0 ? (
        <div className="border-t border-[#F0F0F0] px-3 py-3 text-center">
          <span className="text-[11px] text-[#9CA3AF]">訪問ログはまだありません</span>
        </div>
      ) : (
        <div className="border-t border-[#F0F0F0] py-2">
          {/* 横スクロール + scroll-snap で 1 枚ずつ止まるカルーセル */}
          <div
            className="flex gap-2 overflow-x-auto px-3 pb-1"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {m.visits.map((v, i) => (
              <div
                key={v.id}
                className="shrink-0 w-[260px] rounded-lg bg-[#FAFAFA] border border-[#F0F0F0] p-2.5"
                style={{ scrollSnapAlign: 'start' }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] font-bold text-[#111]">
                    {fmtJaDate(v.date)}
                  </span>
                  <StatusChip status={v.status} size="sm" />
                </div>
                <p className="text-[11px] text-[#374151] leading-snug line-clamp-2">
                  {v.memo}
                </p>
                {/* ページネーションヒント(複数ある時だけ) */}
                {m.visits.length > 1 && (
                  <div className="mt-1.5 text-[9px] text-[#9CA3AF] tabular-nums text-right">
                    {i + 1} / {m.visits.length}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 共通: ピンっぽい飾り(本物の MemberPin の代用)
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

// ──────────────────────────────────────────────────────────────
// メインページ
// ──────────────────────────────────────────────────────────────
type Variant = 'simple' | 'with_logs';

export default function MemberCardVariantsPage() {
  const [variant, setVariant] = useState<Variant>('with_logs');

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-20">
      <nav className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[#E5E7EB] px-4 py-3 flex items-center gap-2">
        <Link href="/log" className="flex items-center gap-1 text-[var(--color-primary)]">
          <ChevronLeft size={22} />
          <span className="text-sm">戻る</span>
        </Link>
        <h1 className="flex-1 text-center text-base font-bold">メンバーカード 表示切替</h1>
        <div className="w-14" />
      </nav>

      {/* 説明 */}
      <section className="px-4 pt-4">
        <p className="text-[13px] text-[#374151] leading-relaxed">
          ヒデさん要望: メンバーカードの下に訪問ログを並べる。複数ある場合は左右にカルーセル。
          メモは 2 行まで。下のトグルで「シンプル / ログ付き」を切り替え。
        </p>
        <p className="text-[11px] text-[#9CA3AF] mt-1">
          ※ サンプルデータ表示。本番では Supabase の実データから取る。
        </p>
      </section>

      {/* 切替セグメント */}
      <section className="px-4 pt-4">
        <div className="inline-flex p-0.5 bg-[#F3F4F6] rounded-lg">
          <button
            type="button"
            onClick={() => setVariant('simple')}
            className={`px-4 py-1.5 rounded-md text-[12px] font-semibold transition-all ${
              variant === 'simple'
                ? 'bg-white text-[#111] shadow-sm'
                : 'text-[#6B7280]'
            }`}
          >
            シンプル(現状)
          </button>
          <button
            type="button"
            onClick={() => setVariant('with_logs')}
            className={`px-4 py-1.5 rounded-md text-[12px] font-semibold transition-all ${
              variant === 'with_logs'
                ? 'bg-white text-[#111] shadow-sm'
                : 'text-[#6B7280]'
            }`}
          >
            訪問ログ付き(2 行メモ)
          </button>
        </div>
      </section>

      {/* メンバーリスト */}
      <section className="px-4 pt-4 space-y-2">
        <h2 className="text-[12px] font-bold text-[#6B7280] mb-1">プレビュー</h2>
        {MEMBERS.map(m => (
          variant === 'simple'
            ? <MemberCardSimple key={m.id} m={m} />
            : <MemberCardWithLogs key={m.id} m={m} />
        ))}
      </section>

      {/* 仕様メモ */}
      <section className="px-4 pt-8">
        <div className="rounded-xl bg-white border border-[#E5E7EB] p-4">
          <h3 className="text-[13px] font-bold mb-2">この案の仕様</h3>
          <ul className="text-[12px] text-[#374151] space-y-1.5 leading-relaxed">
            <li>• 「訪問ログ付き」は カード下にカルーセル(横スワイプ)で訪問記録を並べる</li>
            <li>• 各訪問ログ: 日付 + ステータスタグ + メモ最大 2 行(line-clamp-2)</li>
            <li>• 複数ある時は右下に「N / 全件」ページネーションヒント</li>
            <li>• 未訪問なら「訪問ログはまだありません」</li>
            <li>• 1 件ずつ scroll-snap で気持ちよく止まる</li>
          </ul>
          <p className="text-[11px] text-[#6B7280] mt-3 leading-relaxed">
            気に入ったら本実装で <code className="text-[10px] bg-[#F3F4F6] px-1 rounded">MemberCard</code> に
            「withLogs」プロップ追加 → ホーム地図のシート / ダッシュボード / 地区シート 等で
            同じコンポを使い回せる。
          </p>
          <p className="text-[11px] text-[#6B7280] mt-2 leading-relaxed">
            「カルーセルじゃなくて縦に積みたい」「メモ 3 行まで欲しい」「メンバー名と
            訪問ログの間に区切り線いらん」みたいな個別調整も気軽に言うてな。
          </p>
        </div>
      </section>
    </div>
  );
}
