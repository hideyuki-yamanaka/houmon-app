'use client';

// ──────────────────────────────────────────────────────────────
// ダッシュボードタブ UI 5案 比較プレビュー (rev 2)
//
// ヒデさん指示 (2026-05-04 改訂):
//   - 既存の グラフ / 数値 UI はそのまま残す
//   - 「人で絞り込み」機能を どこにどう置くか の 5 案
//   - 人タグは VisitAuthorChip (グレースケール: 人アイコン + 名前) に統一
//
// 共通: 既存 ios-card 風、訪問の回数バー + 内訳ブロック を再現。
// 5 案の違いは フィルタ UI の置き方だけ。
// ──────────────────────────────────────────────────────────────

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronDown, Check, Users, X } from 'lucide-react';
import PersonIcon from '../../../components/PersonIcon';

// ── サンプルデータ ──────────────────────────────────────────
type Author = { id: string; name: string };
const AUTHORS: Author[] = [
  { id: 'u-hide',   name: 'ヒデ' },
  { id: 'u-sato',   name: 'サトウ' },
  { id: 'u-tanaka', name: 'タナカ' },
  { id: 'u-yamada', name: '山田' },
];

const WEEKS_BY_AUTHOR: Record<string, number[]> = {
  'u-hide':   [3, 2, 5, 4, 6, 3, 7, 4, 5, 4, 6, 5],
  'u-sato':   [1, 0, 2, 1, 3, 2, 1, 2, 3, 1, 2, 4],
  'u-tanaka': [0, 1, 0, 2, 1, 1, 2, 0, 1, 2, 1, 0],
  'u-yamada': [2, 1, 1, 0, 2, 0, 1, 1, 2, 1, 0, 1],
};
const TOTALS: Record<string, number> = Object.fromEntries(
  Object.entries(WEEKS_BY_AUTHOR).map(([k, arr]) => [k, arr.reduce((a, b) => a + b, 0)]),
);

// ──────────────────────────────────────────────────────────────
export default function DashboardVariantsPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-12">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-black/5">
        <div className="max-w-[640px] mx-auto flex items-center px-2 py-2">
          <Link href="/" className="flex items-center gap-1 text-[15px] text-[var(--color-primary)] active:opacity-60 px-2 py-1">
            <ChevronLeft size={20} />戻る
          </Link>
          <h1 className="flex-1 text-center text-[16px] font-semibold pr-12">ダッシュボード 5案 (rev 2)</h1>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-3 py-4 space-y-6">
        <p className="text-[12px] text-[var(--color-subtext)] leading-relaxed">
          既存のグラフ・数値はそのまま残す。「人で絞り込む UI」を どこにどう置くか の 5 案。
          <br />
          人タグはグレースケールの 人アイコン + 名前 で統一。
        </p>

        <V letter="1" title="ヘッダー直下にチップ列 (横スクロール)" desc="ダッシュボード見出し直下に「全員 / ヒデ / …」チップ。複数選択可。最も標準的。">
          <Variant1 />
        </V>

        <V letter="2" title="ヘッダー右上 → ボトムシート" desc="通常はスッキリ、人アイコン押すとシートで複数選択。複数アプリで馴染みのパターン。">
          <Variant2 />
        </V>

        <V letter="3" title="プルダウン (1人だけ選択)" desc="「表示: ヒデ ▼」のシンプルなセレクタ、1人 or 全員 の二択。">
          <Variant3 />
        </V>

        <V letter="4" title="グラフ右上に小さい絞り込みボタン" desc="各カードの右上に 👤 アイコン、カードごとに絞り込み可。使い分けに強い。">
          <Variant4 />
        </V>

        <V letter="5" title="セグメントコントロール (タブ風)" desc="「全員 | ヒデ | サトウ | …」を上部固定、1タップで切替 (1人ずつ or 全員)。">
          <Variant5 />
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

// ── 既存ヘッダー風 (ダッシュボードのタイトル) ────────────────
function FakeHeader({ rightSlot, belowSlot }: { rightSlot?: React.ReactNode; belowSlot?: React.ReactNode }) {
  return (
    <div className="bg-white">
      <div className="px-4 py-3 flex items-center">
        <h1 className="text-[16px] font-bold flex-1 text-center">ダッシュボード</h1>
        {rightSlot && <div className="absolute right-4">{rightSlot}</div>}
      </div>
      {belowSlot && <div className="px-3 pb-2">{belowSlot}</div>}
    </div>
  );
}

// ── 既存パーツ風: 訪問回数バー (家庭訪問の回数 カード) ──────
function FakeChartCard({ targets, hero }: { targets: string[]; hero: string }) {
  const totalsPerWeek = Array.from({ length: 12 }, (_, w) =>
    targets.reduce((s, aid) => s + (WEEKS_BY_AUTHOR[aid]?.[w] ?? 0), 0),
  );
  const max = Math.max(...totalsPerWeek, 1);
  const total = totalsPerWeek.reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-[15px] font-bold leading-tight">家庭訪問の回数</h3>
          <p className="text-[10px] text-[var(--color-subtext)] mt-0.5">{hero}</p>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[36px] font-extrabold tabular-nums leading-none text-[#111] tracking-tight">{total}</span>
          <span className="text-[12px] font-bold">回</span>
        </div>
      </div>
      <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
        {[...totalsPerWeek].reverse().slice(0, 6).map((v, i) => {
          const widthPct = v > 0 ? Math.max(12, (v / max) * 100) : 4;
          return (
            <div key={i}>
              <div className="text-[10px] font-bold text-[var(--color-subtext)] mb-0.5">
                {i === 0 ? '今週' : i === 1 ? '先週' : `${i}週間前`}
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 rounded-full bg-[#111]" style={{ width: `${widthPct}%`, minWidth: 4 }} />
                {v > 0 && <span className="text-[10px] font-bold tabular-nums">{v}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 既存パーツ風: 訪問ログ内訳 ────────────────────────────────
function FakeBreakdownCard({ targets }: { targets: string[] }) {
  const total = targets.reduce((s, a) => s + TOTALS[a], 0);
  return (
    <div className="bg-white rounded-xl p-4">
      <h3 className="text-[15px] font-bold mb-2">訪問ログ内訳</h3>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-emerald-50 rounded-lg py-2">
          <div className="text-[18px] font-bold text-emerald-700">{Math.round(total * 0.5)}</div>
          <div className="text-[10px] text-emerald-700">本人◎</div>
        </div>
        <div className="bg-emerald-50/50 rounded-lg py-2">
          <div className="text-[18px] font-bold text-emerald-600">{Math.round(total * 0.2)}</div>
          <div className="text-[10px] text-emerald-600">家族◎</div>
        </div>
        <div className="bg-gray-100 rounded-lg py-2">
          <div className="text-[18px] font-bold text-gray-700">{Math.round(total * 0.3)}</div>
          <div className="text-[10px] text-gray-600">不在他</div>
        </div>
      </div>
    </div>
  );
}

// ── 共通: 「現在の絞り込み」表示 ─────────────────────────────
function CurrentFilterLabel({ targets }: { targets: string[] }) {
  if (targets.length === AUTHORS.length) return '全員';
  if (targets.length === 1) {
    return AUTHORS.find(a => a.id === targets[0])?.name ?? '?';
  }
  return `${targets.length}人を表示中`;
}

// ── 案1: ヘッダー直下チップ (複数選択) ────────────────────────
function Variant1() {
  const [sel, setSel] = useState<Set<string>>(new Set(AUTHORS.map(a => a.id)));
  const toggle = (id: string) => setSel(p => {
    const n = new Set(p);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const allOn = sel.size === AUTHORS.length;

  return (
    <div className="space-y-3">
      <FakeHeader belowSlot={
        <div className="flex gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
          <FilterChip label="全員" active={allOn} onClick={() => setSel(allOn ? new Set() : new Set(AUTHORS.map(a => a.id)))} count={Object.values(TOTALS).reduce((a, b) => a + b, 0)} />
          {AUTHORS.map(a => (
            <FilterChip
              key={a.id}
              label={a.name}
              withIcon
              active={sel.has(a.id)}
              onClick={() => toggle(a.id)}
              count={TOTALS[a.id]}
            />
          ))}
        </div>
      } />
      <FakeChartCard targets={[...sel]} hero={`表示中: ${CurrentFilterLabel({ targets: [...sel] })}`} />
      <FakeBreakdownCard targets={[...sel]} />
    </div>
  );
}

// ── 案2: ヘッダー右上 → ボトムシート ─────────────────────────
function Variant2() {
  const [sel, setSel] = useState<Set<string>>(new Set(AUTHORS.map(a => a.id)));
  const [sheet, setSheet] = useState(false);
  const toggle = (id: string) => setSel(p => {
    const n = new Set(p);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  return (
    <div className="space-y-3 relative">
      <div className="bg-white">
        <div className="px-4 py-3 flex items-center relative">
          <h1 className="text-[16px] font-bold flex-1 text-center">ダッシュボード</h1>
          <button
            onClick={() => setSheet(true)}
            aria-label="表示する人を選ぶ"
            className="absolute right-3 w-9 h-9 rounded-full bg-[#F3F4F6] inline-flex items-center justify-center active:scale-95 gap-0.5"
          >
            <Users size={14} />
            <span className="text-[10px] font-bold">{sel.size}</span>
          </button>
        </div>
        <div className="px-4 pb-2 text-[11px] text-[var(--color-subtext)]">
          表示中: <CurrentFilterText targets={[...sel]} />
        </div>
      </div>
      <FakeChartCard targets={[...sel]} hero="直近12週分" />
      <FakeBreakdownCard targets={[...sel]} />

      {sheet && (
        <div className="absolute inset-0 z-10 bg-black/30 flex items-end rounded-2xl overflow-hidden -m-3" onClick={() => setSheet(false)}>
          <div className="bg-white w-full rounded-t-2xl p-4 space-y-1" onClick={e => e.stopPropagation()}>
            <div className="flex items-center mb-2">
              <h3 className="text-sm font-bold flex-1">表示する人を選ぶ</h3>
              <button onClick={() => setSheet(false)} className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-[#F3F4F6]"><X size={16} /></button>
            </div>
            {AUTHORS.map(a => {
              const on = sel.has(a.id);
              return (
                <button key={a.id} onClick={() => toggle(a.id)} className="w-full flex items-center gap-2 py-2 active:opacity-60">
                  <span className={`w-5 h-5 rounded inline-flex items-center justify-center ${on ? 'bg-[#111]' : 'border border-[#D1D5DB]'}`}>
                    {on && <Check size={12} className="text-white" />}
                  </span>
                  <span className="inline-flex items-center gap-0.5 text-[13px] text-gray-900 font-bold flex-1 text-left">
                    <PersonIcon size={13} /> {a.name}
                  </span>
                  <span className="text-[10px] text-[var(--color-subtext)]">{TOTALS[a.id]}件</span>
                </button>
              );
            })}
            <button onClick={() => setSheet(false)} className="w-full h-10 rounded-full bg-[#111] text-white text-[13px] font-bold mt-3">適用</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 案3: プルダウン (1人 or 全員) ────────────────────────────
function Variant3() {
  const [target, setTarget] = useState<string>('all');
  const [open, setOpen] = useState(false);
  const targets = target === 'all' ? AUTHORS.map(a => a.id) : [target];
  const targetName = target === 'all' ? '全員' : (AUTHORS.find(a => a.id === target)?.name ?? '?');

  return (
    <div className="space-y-3">
      <div className="bg-white">
        <div className="px-4 py-3 flex items-center">
          <h1 className="text-[16px] font-bold flex-1 text-center">ダッシュボード</h1>
        </div>
        <div className="px-4 pb-3 relative">
          <button onClick={() => setOpen(o => !o)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F3F4F6] text-[12px] font-bold active:opacity-60">
            <PersonIcon size={12} />
            {targetName}
            <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <div className="absolute top-full left-4 right-4 mt-1 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-10 overflow-hidden">
              {[{ id: 'all', name: '全員' }, ...AUTHORS].map(a => (
                <button
                  key={a.id}
                  onClick={() => { setTarget(a.id); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-[13px] flex items-center gap-2 hover:bg-[#F3F4F6] ${target === a.id ? 'bg-[#F9FAFB] font-bold' : ''}`}
                >
                  {a.id !== 'all' && <PersonIcon size={13} />}
                  {a.name}
                  <span className="ml-auto text-[10px] text-[var(--color-subtext)]">
                    {a.id === 'all' ? Object.values(TOTALS).reduce((a, b) => a + b, 0) : TOTALS[a.id]}件
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <FakeChartCard targets={targets} hero="直近12週分" />
      <FakeBreakdownCard targets={targets} />
    </div>
  );
}

// ── 案4: 各カードの右上に絞り込み (カードごと独立) ────────────
function Variant4() {
  return (
    <div className="space-y-3">
      <div className="bg-white">
        <div className="px-4 py-3"><h1 className="text-[16px] font-bold text-center">ダッシュボード</h1></div>
      </div>
      <FakeChartCardWithFilter />
      <FakeBreakdownCardWithFilter />
    </div>
  );
}

function FakeChartCardWithFilter() {
  const [target, setTarget] = useState<string>('all');
  const [open, setOpen] = useState(false);
  const targets = target === 'all' ? AUTHORS.map(a => a.id) : [target];
  const totalsPerWeek = Array.from({ length: 12 }, (_, w) => targets.reduce((s, aid) => s + (WEEKS_BY_AUTHOR[aid]?.[w] ?? 0), 0));
  const max = Math.max(...totalsPerWeek, 1);
  const total = totalsPerWeek.reduce((a, b) => a + b, 0);
  const targetName = target === 'all' ? '全員' : (AUTHORS.find(a => a.id === target)?.name ?? '?');

  return (
    <div className="bg-white rounded-xl p-4 relative">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-[15px] font-bold leading-tight">家庭訪問の回数</h3>
          <p className="text-[10px] text-[var(--color-subtext)] mt-0.5">直近12週分</p>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-[36px] font-extrabold tabular-nums leading-none text-[#111] tracking-tight">{total}</span>
          <span className="text-[12px] font-bold">回</span>
        </div>
      </div>
      <button onClick={() => setOpen(o => !o)} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[10px] font-bold mb-2 active:opacity-60">
        <PersonIcon size={10} /> {targetName}
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-16 left-3 mt-1 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-10 overflow-hidden min-w-[160px]">
          {[{ id: 'all', name: '全員' }, ...AUTHORS].map(a => (
            <button key={a.id} onClick={() => { setTarget(a.id); setOpen(false); }} className={`w-full text-left px-3 py-2 text-[13px] flex items-center gap-2 hover:bg-[#F3F4F6] ${target === a.id ? 'bg-[#F9FAFB] font-bold' : ''}`}>
              {a.id !== 'all' && <PersonIcon size={13} />}
              {a.name}
            </button>
          ))}
        </div>
      )}
      <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
        {[...totalsPerWeek].reverse().slice(0, 4).map((v, i) => {
          const widthPct = v > 0 ? Math.max(12, (v / max) * 100) : 4;
          return (
            <div key={i}>
              <div className="text-[10px] font-bold text-[var(--color-subtext)] mb-0.5">{i === 0 ? '今週' : i === 1 ? '先週' : `${i}週間前`}</div>
              <div className="flex items-center gap-2">
                <div className="h-3 rounded-full bg-[#111]" style={{ width: `${widthPct}%`, minWidth: 4 }} />
                {v > 0 && <span className="text-[10px] font-bold tabular-nums">{v}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FakeBreakdownCardWithFilter() {
  const [target, setTarget] = useState<string>('all');
  const [open, setOpen] = useState(false);
  const targets = target === 'all' ? AUTHORS.map(a => a.id) : [target];
  const total = targets.reduce((s, a) => s + TOTALS[a], 0);
  const targetName = target === 'all' ? '全員' : (AUTHORS.find(a => a.id === target)?.name ?? '?');

  return (
    <div className="bg-white rounded-xl p-4 relative">
      <div className="flex items-center mb-2">
        <h3 className="text-[15px] font-bold flex-1">訪問ログ内訳</h3>
        <button onClick={() => setOpen(o => !o)} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[10px] font-bold active:opacity-60">
          <PersonIcon size={10} /> {targetName}
          <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute top-12 right-3 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-10 overflow-hidden min-w-[140px]">
            {[{ id: 'all', name: '全員' }, ...AUTHORS].map(a => (
              <button key={a.id} onClick={() => { setTarget(a.id); setOpen(false); }} className={`w-full text-left px-3 py-2 text-[13px] flex items-center gap-2 hover:bg-[#F3F4F6] ${target === a.id ? 'bg-[#F9FAFB] font-bold' : ''}`}>
                {a.id !== 'all' && <PersonIcon size={13} />}
                {a.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-emerald-50 rounded-lg py-2"><div className="text-[18px] font-bold text-emerald-700">{Math.round(total * 0.5)}</div><div className="text-[10px] text-emerald-700">本人◎</div></div>
        <div className="bg-emerald-50/50 rounded-lg py-2"><div className="text-[18px] font-bold text-emerald-600">{Math.round(total * 0.2)}</div><div className="text-[10px] text-emerald-600">家族◎</div></div>
        <div className="bg-gray-100 rounded-lg py-2"><div className="text-[18px] font-bold text-gray-700">{Math.round(total * 0.3)}</div><div className="text-[10px] text-gray-600">不在他</div></div>
      </div>
    </div>
  );
}

// ── 案5: セグメントコントロール (タブ風 1人ずつ) ─────────────
function Variant5() {
  const [active, setActive] = useState<string>('all');
  const targets = active === 'all' ? AUTHORS.map(a => a.id) : [active];
  return (
    <div className="space-y-3">
      <div className="bg-white">
        <div className="px-4 py-3"><h1 className="text-[16px] font-bold text-center">ダッシュボード</h1></div>
        <div className="px-3 pb-2">
          <div className="flex gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden border-b border-[#E5E7EB]">
            {[{ id: 'all', name: '全員' }, ...AUTHORS].map(a => {
              const isActive = active === a.id;
              return (
                <button key={a.id} onClick={() => setActive(a.id)} className="shrink-0 px-3 py-2 text-[12px] font-bold relative inline-flex items-center gap-1" style={{ color: isActive ? '#111' : '#999' }}>
                  {a.id !== 'all' && <PersonIcon size={11} />}
                  {a.name}
                  {isActive && <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[#111]" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <FakeChartCard targets={targets} hero="直近12週分" />
      <FakeBreakdownCard targets={targets} />
    </div>
  );
}

// ── 共通: フィルタチップ (グレースケール) ────────────────────
function FilterChip({ label, active, onClick, count, withIcon }: {
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
      <span className={`${active ? 'opacity-60' : 'text-[var(--color-subtext)]'}`}>{count}</span>
    </button>
  );
}

function CurrentFilterText({ targets }: { targets: string[] }) {
  if (targets.length === AUTHORS.length) return <>全員</>;
  if (targets.length === 1) return <span className="inline-flex items-center gap-0.5"><PersonIcon size={11} />{AUTHORS.find(a => a.id === targets[0])?.name}</span>;
  return <>{targets.length}人を表示中</>;
}
