'use client';

// ──────────────────────────────────────────────────────────────
// カレンダータブ UI 5案 比較プレビュー
//
// 全案 共通:
//   - 上部に既存風カレンダーグリッド (5/4 を選択中)
//   - 下にその日の訪問リスト (4人分のサンプル訪問)
//   - 訪問者は ヒデ / サトウ / タナカ / 山田 の 4人
//
// 案: 1. 作成者バッジ付きカード
//     2. 作成者ごとにグルーピング
//     3. VisitsCarousel 風 横スワイプ
//     4. 上部 作成者フィルタチップ + 案1
//     5. 横スワイプタブ (人ごとにビュー切替)
// ──────────────────────────────────────────────────────────────

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronLeft as ChevL, ChevronRight, Plus, Users, Check, ChevronDown } from 'lucide-react';
import { colorForUser, initialOf } from '../../../lib/profile';

// ── サンプルデータ ──────────────────────────────────────────
type SampleAuthor = { id: string; name: string };
type SampleVisit = {
  id: string;
  authorId: string;
  memberName: string;
  memberDistrict: string;
  status: 'met_self' | 'met_family' | 'absent' | 'refused' | 'unknown_address' | 'moved';
  summary?: string;
};

const AUTHORS: SampleAuthor[] = [
  { id: 'u-hide', name: 'ヒデ' },
  { id: 'u-sato', name: 'サトウ' },
  { id: 'u-tanaka', name: 'タナカ' },
  { id: 'u-yamada', name: '山田' },
];

const SAMPLE_VISITS: SampleVisit[] = [
  { id: 'v1', authorId: 'u-hide', memberName: '高桑 秀都', memberDistrict: '英雄', status: 'met_self', summary: '元気そうだった' },
  { id: 'v2', authorId: 'u-sato', memberName: '佐藤 花子', memberDistrict: '英雄', status: 'absent', summary: '不在、また来週' },
  { id: 'v3', authorId: 'u-hide', memberName: '田中 太郎', memberDistrict: '若葉', status: 'met_family', summary: 'お母さんとお話' },
  { id: 'v4', authorId: 'u-tanaka', memberName: '鈴木 一郎', memberDistrict: '英雄', status: 'met_self', summary: '近況伺った' },
  { id: 'v5', authorId: 'u-yamada', memberName: '高橋 次郎', memberDistrict: '若葉', status: 'refused' },
];

const STATUS_LABEL: Record<SampleVisit['status'], { label: string; color: string }> = {
  met_self: { label: '本人◎', color: 'bg-emerald-100 text-emerald-800' },
  met_family: { label: '家族◎', color: 'bg-emerald-50 text-emerald-700' },
  absent: { label: '不在', color: 'bg-gray-100 text-gray-600' },
  refused: { label: '断られ', color: 'bg-amber-100 text-amber-700' },
  unknown_address: { label: '住所不明', color: 'bg-gray-100 text-gray-600' },
  moved: { label: '転居', color: 'bg-gray-100 text-gray-600' },
};

const authorById = (id: string) => AUTHORS.find(a => a.id === id) ?? AUTHORS[0];

// ──────────────────────────────────────────────────────────────
export default function CalendarVariantsPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-12">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-black/5">
        <div className="max-w-[640px] mx-auto flex items-center px-2 py-2">
          <Link href="/" className="flex items-center gap-1 text-[15px] text-[var(--color-primary)] active:opacity-60 px-2 py-1">
            <ChevronLeft size={20} />
            戻る
          </Link>
          <h1 className="flex-1 text-center text-[16px] font-semibold pr-12">カレンダー UI 5案</h1>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-3 py-4 space-y-6">
        <p className="text-[12px] text-[var(--color-subtext)] leading-relaxed">
          各案の「下半分（選択日の訪問リスト）」を比較してな。各カードはサンプルや。
          <br />
          作成者: ヒデ / サトウ / タナカ / 山田 の 4 人想定。
        </p>

        <Variant letter="1" title="作成者バッジ付き訪問カード" desc="左に色付きの名前バッジ、最小変更で誰が見えるように。">
          <FakeCalendarTop dotsByDay={{ 4: 5 }} />
          <Variant1List />
        </Variant>

        <Variant letter="2" title="作成者ごとにグルーピング" desc="その日の訪問を作成者別にセクション分け。">
          <FakeCalendarTop dotsByDay={{ 4: 5 }} />
          <Variant2List />
        </Variant>

        <Variant letter="3" title="横スワイプ カルーセル (詳細ページ風)" desc="VisitsCarousel と統一感、1件ずつ大きく。">
          <FakeCalendarTop dotsByDay={{ 4: 5 }} />
          <Variant3List />
        </Variant>

        <Variant letter="4" title="作成者フィルタチップ + バッジカード" desc="チップで誰の分か絞り込み、その下は案1。">
          <FilterChips />
          <FakeCalendarTop dotsByDay={{ 4: 5 }} />
          <Variant1List />
        </Variant>

        <Variant letter="5" title="横スワイプタブ (人ごとにビュー切替)" desc="iOS天気アプリ風、上部タブを左右スワイプで人切替。">
          <SwipeTabs />
          <FakeCalendarTop dotsByDay={{ 4: 5 }} />
          <Variant1List filtered="u-hide" />
        </Variant>

        <p className="text-[11px] text-[var(--color-subtext)] text-center pt-4 leading-relaxed">
          見比べたら気に入った案を Claude に伝えてな。組み合わせも OK。
        </p>
      </main>
    </div>
  );
}

// ── 各案の囲みカード ────────────────────────────────────────
function Variant({ letter, title, desc, children }: {
  letter: string; title: string; desc: string; children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden">
      <div className="px-4 py-3 border-b border-black/5">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-bold w-6 h-6 rounded-full bg-[#111] text-white inline-flex items-center justify-center">{letter}</span>
          <h2 className="text-[13px] font-semibold flex-1">{title}</h2>
        </div>
        <p className="text-[11px] text-[var(--color-subtext)] mt-1 ml-8">{desc}</p>
      </div>
      <div className="bg-[var(--color-bg)] p-3 space-y-3">{children}</div>
    </section>
  );
}

// ── ニセ カレンダー (ヘッダー + グリッド簡易版) ──────────────
function FakeCalendarTop({ dotsByDay }: { dotsByDay?: Record<number, number> }) {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const selected = 4;
  return (
    <div className="bg-white rounded-xl p-2">
      <div className="flex items-center justify-between px-2 py-1">
        <button aria-label="前月" className="w-7 h-7 inline-flex items-center justify-center rounded-full hover:bg-[#F3F4F6]">
          <ChevL size={16} />
        </button>
        <span className="text-[13px] font-semibold">2026年 5月</span>
        <button aria-label="翌月" className="w-7 h-7 inline-flex items-center justify-center rounded-full hover:bg-[#F3F4F6]">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] text-[var(--color-subtext)] mt-1">
        {['日', '月', '火', '水', '木', '金', '土'].map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 mt-1">
        {/* 5月1日は金曜なので空セル 5個 */}
        {Array.from({ length: 5 }).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map(d => {
          const dotsCount = dotsByDay?.[d] ?? 0;
          const isSelected = d === selected;
          return (
            <div key={d} className={`aspect-square rounded-md text-[11px] flex flex-col items-center justify-center ${isSelected ? 'bg-[#111] text-white' : ''}`}>
              <span>{d}</span>
              {dotsCount > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {AUTHORS.slice(0, Math.min(dotsCount, 4)).map(a => (
                    <span key={a.id} className="w-1 h-1 rounded-full" style={{ background: colorForUser(a.id).border }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 案1: 作成者バッジ付きカード ─────────────────────────────
function Variant1List({ filtered }: { filtered?: string } = {}) {
  const visits = filtered ? SAMPLE_VISITS.filter(v => v.authorId === filtered) : SAMPLE_VISITS;
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-[var(--color-subtext)] px-1">5月4日 ({visits.length}件)</p>
      {visits.map(v => {
        const a = authorById(v.authorId);
        const c = colorForUser(a.id);
        return (
          <div key={v.id} className="bg-white rounded-xl p-3 flex items-center gap-2 shadow-sm">
            <span
              className="shrink-0 w-7 h-7 rounded-full inline-flex items-center justify-center text-[11px] font-bold"
              style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}40` }}
              title={a.name}
            >
              {initialOf(a.name)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-[13px] truncate">{v.memberName}</span>
                <StatusBadge status={v.status} />
              </div>
              {v.summary && <p className="text-[11px] text-[var(--color-subtext)] line-clamp-1">{v.summary}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 案2: 作成者ごとにグルーピング ─────────────────────────────
function Variant2List() {
  const grouped = AUTHORS.map(a => ({ author: a, visits: SAMPLE_VISITS.filter(v => v.authorId === a.id) })).filter(g => g.visits.length > 0);
  return (
    <div className="space-y-3">
      {grouped.map(({ author, visits }) => {
        const c = colorForUser(author.id);
        return (
          <div key={author.id} className="bg-white rounded-xl overflow-hidden shadow-sm">
            <div className="px-3 py-2 flex items-center gap-2 border-b border-black/5" style={{ background: c.bg }}>
              <span className="w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] font-bold text-white" style={{ background: c.border }}>
                {initialOf(author.name)}
              </span>
              <span className="text-[12px] font-bold" style={{ color: c.text }}>{author.name}さん ({visits.length}件)</span>
              <ChevronDown size={14} className="ml-auto opacity-50" />
            </div>
            <div className="px-3 py-2 space-y-1.5">
              {visits.map(v => (
                <div key={v.id} className="flex items-center gap-2">
                  <span className="font-bold text-[12px] flex-1 truncate">{v.memberName}</span>
                  <StatusBadge status={v.status} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 案3: 横スワイプ カルーセル ─────────────────────────────────
function Variant3List() {
  return (
    <div>
      <div className="flex items-center justify-between px-1 mb-1">
        <p className="text-[11px] text-[var(--color-subtext)]">5月4日 ({SAMPLE_VISITS.length}件)</p>
        <span className="text-[10px] text-[var(--color-subtext)]">← スワイプ →</span>
      </div>
      <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1 scrollbar-thin">
        {SAMPLE_VISITS.map(v => {
          const a = authorById(v.authorId);
          const c = colorForUser(a.id);
          return (
            <div key={v.id} className="snap-center shrink-0 w-[88%] bg-white rounded-xl p-3 shadow-sm border-l-4" style={{ borderLeftColor: c.border }}>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: c.bg, color: c.text }}>
                  {a.name}
                </span>
                <span className="text-[10px] text-[var(--color-subtext)]">{v.memberDistrict}地区</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-[15px]">{v.memberName}</span>
                <StatusBadge status={v.status} />
              </div>
              {v.summary && <p className="text-[12px] text-[var(--color-subtext)] line-clamp-2">{v.summary}</p>}
            </div>
          );
        })}
      </div>
      <div className="flex justify-center gap-1 mt-2">
        {SAMPLE_VISITS.map((_, i) => <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-[#111]' : 'bg-[#D1D5DB]'}`} />)}
      </div>
    </div>
  );
}

// ── 案4 用: フィルタチップ ────────────────────────────────────
function FilterChips() {
  const [active, setActive] = useState<string>('all');
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 px-0.5 -mx-0.5 scrollbar-thin">
      <Chip label="全員" active={active === 'all'} onClick={() => setActive('all')} count={SAMPLE_VISITS.length} />
      {AUTHORS.map(a => {
        const c = colorForUser(a.id);
        const count = SAMPLE_VISITS.filter(v => v.authorId === a.id).length;
        return (
          <Chip
            key={a.id}
            label={a.name}
            active={active === a.id}
            onClick={() => setActive(a.id)}
            count={count}
            color={c}
          />
        );
      })}
    </div>
  );
}

function Chip({ label, active, onClick, count, color }: {
  label: string; active: boolean; onClick: () => void; count: number;
  color?: ReturnType<typeof colorForUser>;
}) {
  const baseColor = color ?? { text: '#111', bg: '#F3F4F6', border: '#9CA3AF' };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-bold transition-all ${active ? 'shadow-sm' : 'opacity-60'}`}
      style={{ background: active ? baseColor.bg : '#FFFFFF', color: baseColor.text, border: `1px solid ${baseColor.border}40` }}
    >
      {active && <Check size={11} />}
      {label}
      <span className="opacity-60">{count}</span>
    </button>
  );
}

// ── 案5 用: 横スワイプタブ ────────────────────────────────────
function SwipeTabs() {
  const [active, setActive] = useState<string>('u-hide');
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin border-b border-[#E5E7EB] -mb-2">
      {[{ id: 'all', name: '全員' }, ...AUTHORS].map(a => {
        const c = a.id === 'all' ? null : colorForUser(a.id);
        const isActive = active === a.id;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => setActive(a.id)}
            className="shrink-0 px-3 py-2 text-[12px] font-bold relative transition-colors"
            style={{ color: isActive ? (c?.text ?? '#111') : '#999' }}
          >
            {a.name}
            {isActive && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ background: c?.border ?? '#111' }} />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── 共通: ステータスバッジ ────────────────────────────────────
function StatusBadge({ status }: { status: SampleVisit['status'] }) {
  const s = STATUS_LABEL[status];
  return <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${s.color}`}>{s.label}</span>;
}
