'use client';

// ──────────────────────────────────────────────────────────────
// カレンダータブ UI 5案 比較プレビュー (rev 2)
//
// ヒデさん指示 (2026-05-04 改訂):
//   - オリジナル UI でなく 既存パーツに合わせて統一感を出す
//   - 人タグは VisitAuthorChip (グレースケール: 人アイコン + 名前) を踏襲
//   - 訪問カードは VisitCard / VisitsCarousel の見た目を踏襲
//
// 5 案はあくまで「並べ方 / 絞り込み UI」だけが違う。
// カードや人タグの見た目は共通。
// ──────────────────────────────────────────────────────────────

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronLeft as ChevL,
  ChevronRight,
  Plus,
  Check,
  ChevronDown,
} from 'lucide-react';
import PersonIcon from '../../../components/PersonIcon';

// ── サンプルデータ ──────────────────────────────────────────
type Author = { id: string; name: string };
type Sample = {
  id: string;
  authorId: string;
  memberName: string;
  status: 'met_self' | 'met_family' | 'absent' | 'refused';
  summary?: string;
};

const AUTHORS: Author[] = [
  { id: 'u-hide', name: 'ヒデ' },
  { id: 'u-sato', name: 'サトウ' },
  { id: 'u-tanaka', name: 'タナカ' },
  { id: 'u-yamada', name: '山田' },
];
const A = (id: string) => AUTHORS.find(a => a.id === id) ?? AUTHORS[0];

const SAMPLE: Sample[] = [
  { id: 'v1', authorId: 'u-hide',   memberName: '高桑 秀都', status: 'met_self',   summary: '元気そうだった。来月の集会に来ると言ってくれた' },
  { id: 'v2', authorId: 'u-sato',   memberName: '佐藤 花子', status: 'absent',     summary: '不在、また来週寄る予定' },
  { id: 'v3', authorId: 'u-hide',   memberName: '田中 太郎', status: 'met_family', summary: 'お母さんと話、本人は仕事で不在' },
  { id: 'v4', authorId: 'u-tanaka', memberName: '鈴木 一郎', status: 'met_self',   summary: '近況伺った。引っ越しを検討中とのこと' },
  { id: 'v5', authorId: 'u-yamada', memberName: '高橋 次郎', status: 'refused' },
];

// ステータスチップ (StatusChip 風)
const STATUS: Record<Sample['status'], { label: string; cls: string }> = {
  met_self:    { label: '本人◎', cls: 'bg-emerald-100 text-emerald-800' },
  met_family:  { label: '家族◎', cls: 'bg-emerald-50  text-emerald-700' },
  absent:      { label: '不在',   cls: 'bg-gray-100   text-gray-600' },
  refused:     { label: '断られ', cls: 'bg-amber-100  text-amber-700' },
};

// ──────────────────────────────────────────────────────────────
export default function CalendarVariantsPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-12">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-black/5">
        <div className="max-w-[640px] mx-auto flex items-center px-2 py-2">
          <Link href="/" className="flex items-center gap-1 text-[15px] text-[var(--color-primary)] active:opacity-60 px-2 py-1">
            <ChevronLeft size={20} />戻る
          </Link>
          <h1 className="flex-1 text-center text-[16px] font-semibold pr-12">カレンダー 5案 (rev 2)</h1>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-3 py-4 space-y-6">
        <p className="text-[12px] text-[var(--color-subtext)] leading-relaxed">
          既存パーツ準拠 (人アイコン + 名前 = グレースケール統一)。
          <br />
          5 案の違いは「並べ方 / 絞り込み UI」だけ。人タグも訪問カードも共通。
        </p>

        <V letter="1" title="VisitCard をそのまま使う" desc="既存の訪問ログカード (VisitCard) を選択日リストに置く。最小変更、すぐ実装可。">
          <FakeCalendarTop dotCount={SAMPLE.length} />
          <SectionHeader date="5月4日" count={SAMPLE.length} />
          <ListVisitCards visits={SAMPLE} />
        </V>

        <V letter="2" title="作成者ごとにグルーピング" desc="その日の訪問を作成者で分けて表示。誰が何件やったか一目。">
          <FakeCalendarTop dotCount={SAMPLE.length} />
          <SectionHeader date="5月4日" count={SAMPLE.length} />
          <ListGrouped visits={SAMPLE} />
        </V>

        <V letter="3" title="VisitsCarousel 横スワイプ" desc="メンバー詳細と同じ横カルーセル UI。1件ずつ大きく表示。">
          <FakeCalendarTop dotCount={SAMPLE.length} />
          <SectionHeader date="5月4日" count={SAMPLE.length} />
          <ListCarousel visits={SAMPLE} />
        </V>

        <V letter="4" title="上部にチップフィルタ + VisitCard" desc="グレースケールの作成者チップで絞り込み、下は VisitCard リスト。">
          <FilterChips />
          <FakeCalendarTop dotCount={SAMPLE.length} />
          <SectionHeader date="5月4日" count={SAMPLE.length} />
          <ListVisitCards visits={SAMPLE} />
        </V>

        <V letter="5" title="アバター列で絞り込み + VisitCard" desc="上部に作成者の人アイコン列、タップで絞り込み (1人 or 全員)。">
          <AvatarRow />
          <FakeCalendarTop dotCount={SAMPLE.length} />
          <SectionHeader date="5月4日" count={SAMPLE.length} />
          <ListVisitCards visits={SAMPLE} />
        </V>
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
function V({ letter, title, desc, children }: {
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

// ── 既存パーツ風: 人タグ (VisitAuthorChip 同等) ───────────────
function AuthorChip({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[12px] text-gray-900 font-bold whitespace-nowrap shrink-0">
      <PersonIcon size={13} />
      {name}
    </span>
  );
}

// ── 既存パーツ風: ステータスチップ ────────────────────────────
function StatusBadge({ status }: { status: Sample['status'] }) {
  const s = STATUS[status];
  return <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${s.cls}`}>{s.label}</span>;
}

// ── 既存パーツ風: VisitCard ───────────────────────────────────
function FakeVisitCard({ v }: { v: Sample }) {
  const a = A(v.authorId);
  return (
    <div className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-3 active:bg-[#F5F5F5] transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold truncate">{v.memberName}</span>
          <StatusBadge status={v.status} />
          <span className="ml-auto"><AuthorChip name={a.name} /></span>
        </div>
        {v.summary && (
          <p className="text-[11px] text-[var(--color-subtext)] mt-1 line-clamp-2">{v.summary}</p>
        )}
      </div>
      <ChevronRight size={16} className="text-[var(--color-icon-gray)] shrink-0" />
    </div>
  );
}

// ── 共通: ニセ カレンダー ────────────────────────────────────
function FakeCalendarTop({ dotCount = 0 }: { dotCount?: number }) {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const selected = 4;
  return (
    <div className="bg-white rounded-xl p-2">
      <div className="flex items-center justify-between px-2 py-1">
        <button className="w-7 h-7 inline-flex items-center justify-center rounded-full hover:bg-[#F3F4F6]"><ChevL size={16} /></button>
        <span className="text-[13px] font-semibold">2026年 5月</span>
        <button className="w-7 h-7 inline-flex items-center justify-center rounded-full hover:bg-[#F3F4F6]"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] text-[var(--color-subtext)] mt-1">
        {['日', '月', '火', '水', '木', '金', '土'].map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 mt-1">
        {Array.from({ length: 5 }).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map(d => {
          const isSelected = d === selected;
          const hasDot = d === selected && dotCount > 0;
          return (
            <div key={d} className={`aspect-square rounded-md text-[11px] flex flex-col items-center justify-center ${isSelected ? 'bg-[#111] text-white' : ''}`}>
              <span>{d}</span>
              {hasDot && <span className="w-1 h-1 rounded-full bg-white mt-0.5" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 共通: 日付ヘッダ ────────────────────────────────────────
function SectionHeader({ date, count }: { date: string; count: number }) {
  return <p className="text-[11px] text-[var(--color-subtext)] px-1">{date} ({count}件)</p>;
}

// ── 案1 / 4 / 5: VisitCard リスト ────────────────────────────
function ListVisitCards({ visits }: { visits: Sample[] }) {
  return (
    <div className="space-y-2">
      {visits.map(v => <FakeVisitCard key={v.id} v={v} />)}
    </div>
  );
}

// ── 案2: 作成者ごとグループ ────────────────────────────────
function ListGrouped({ visits }: { visits: Sample[] }) {
  const grouped = AUTHORS
    .map(a => ({ author: a, items: visits.filter(v => v.authorId === a.id) }))
    .filter(g => g.items.length > 0);
  return (
    <div className="space-y-3">
      {grouped.map(({ author, items }) => (
        <div key={author.id} className="bg-white rounded-xl overflow-hidden shadow-sm">
          <div className="px-3 py-2 flex items-center gap-2 border-b border-black/5 bg-[#FAFAFA]">
            <AuthorChip name={author.name} />
            <span className="text-[10px] text-[var(--color-subtext)]">が記入 ({items.length}件)</span>
            <ChevronDown size={14} className="ml-auto opacity-40" />
          </div>
          <div className="divide-y divide-[#F0F0F0]">
            {items.map(v => (
              <div key={v.id} className="px-3 py-2 flex items-center gap-2">
                <span className="text-[13px] font-bold flex-1 truncate">{v.memberName}</span>
                <StatusBadge status={v.status} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 案3: 横カルーセル ──────────────────────────────────────
function ListCarousel({ visits }: { visits: Sample[] }) {
  return (
    <div className="bg-[#F2F2F4] rounded-lg overflow-hidden">
      <div className="flex overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden">
        {visits.map((v, i) => {
          const a = A(v.authorId);
          return (
            <div key={v.id} className="snap-start shrink-0 w-full px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[12px] font-bold tabular-nums shrink-0">2026年5月4日</span>
                <AuthorChip name={a.name} />
                <StatusBadge status={v.status} />
                <span className="ml-auto text-[10px] text-[var(--color-subtext)]">{i + 1} / {visits.length}</span>
              </div>
              <p className="text-[13px] font-bold mb-0.5">{v.memberName}</p>
              {v.summary && (
                <p className="text-[11px] text-[#374151] leading-snug line-clamp-2">{v.summary}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 案4: フィルタチップ (人アイコン + 名前 のグレースケール) ─
function FilterChips() {
  const [active, setActive] = useState<string>('all');
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 px-0.5 -mx-0.5 [&::-webkit-scrollbar]:hidden">
      <FilterChipButton label="全員" active={active === 'all'} onClick={() => setActive('all')} count={SAMPLE.length} />
      {AUTHORS.map(a => {
        const count = SAMPLE.filter(v => v.authorId === a.id).length;
        return (
          <FilterChipButton
            key={a.id}
            label={a.name}
            withIcon
            active={active === a.id}
            onClick={() => setActive(a.id)}
            count={count}
          />
        );
      })}
    </div>
  );
}

function FilterChipButton({ label, active, onClick, count, withIcon }: {
  label: string; active: boolean; onClick: () => void; count: number; withIcon?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-bold transition-all ${
        active ? 'bg-[#111] text-white' : 'bg-white text-gray-900 border border-[#E5E7EB]'
      }`}
    >
      {active && <Check size={11} />}
      {withIcon && !active && <PersonIcon size={11} />}
      {label}
      <span className={`opacity-60 ${active ? '' : 'text-[var(--color-subtext)]'}`}>{count}</span>
    </button>
  );
}

// ── 案5: アバター列 (人アイコン + 名前 タイル) ───────────────
function AvatarRow() {
  const [active, setActive] = useState<string>('all');
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
      <AvatarTile label="全員" active={active === 'all'} onClick={() => setActive('all')} />
      {AUTHORS.map(a => (
        <AvatarTile
          key={a.id}
          label={a.name}
          withIcon
          active={active === a.id}
          onClick={() => setActive(a.id)}
        />
      ))}
    </div>
  );
}

function AvatarTile({ label, active, onClick, withIcon }: {
  label: string; active: boolean; onClick: () => void; withIcon?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 flex flex-col items-center gap-0.5 transition-all ${active ? '' : 'opacity-50'}`}
    >
      <div className={`w-11 h-11 rounded-full inline-flex items-center justify-center ${
        active ? 'bg-[#111] text-white' : 'bg-white text-gray-900 border border-[#E5E7EB]'
      }`}>
        {withIcon ? <PersonIcon size={22} /> : <span className="text-[10px] font-bold">All</span>}
      </div>
      <span className="text-[10px] font-bold text-gray-900">{label}</span>
    </button>
  );
}
