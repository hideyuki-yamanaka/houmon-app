'use client';

// ──────────────────────────────────────────────────────────────
// ダッシュボードタブ UI 5案 比較プレビュー
//
// 焦点: チームメンバー (4人) で記入された前提で、
//       「誰の数字を見るか」のフィルタ UI を 5パターン比較。
//
// 共通サンプル: 12週分の家庭訪問回数 (週バー) を 4人分。
// 案: 1. ヘッダープルダウン (控えめ)
//     2. 上部チップフィルタ (複数選択可)
//     3. 横スワイプタブ (人ごとにページ)
//     4. 常時 比較モード (積み上げグラフ)
//     5. 右上アイコン → ボトムシート
// ──────────────────────────────────────────────────────────────

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronDown, Check, Users, X } from 'lucide-react';
import { colorForUser, initialOf } from '../../../lib/profile';

// ── サンプルデータ ──────────────────────────────────────────
type SampleAuthor = { id: string; name: string };
const AUTHORS: SampleAuthor[] = [
  { id: 'u-hide', name: 'ヒデ' },
  { id: 'u-sato', name: 'サトウ' },
  { id: 'u-tanaka', name: 'タナカ' },
  { id: 'u-yamada', name: '山田' },
];

// 12週 × 4人 の訪問件数サンプル
const WEEKS_BY_AUTHOR: Record<string, number[]> = {
  'u-hide':   [3, 2, 5, 4, 6, 3, 7, 4, 5, 4, 6, 5],
  'u-sato':   [1, 0, 2, 1, 3, 2, 1, 2, 3, 1, 2, 4],
  'u-tanaka': [0, 1, 0, 2, 1, 1, 2, 0, 1, 2, 1, 0],
  'u-yamada': [2, 1, 1, 0, 2, 0, 1, 1, 2, 1, 0, 1],
};

const TOTALS_BY_AUTHOR: Record<string, number> = Object.fromEntries(
  Object.entries(WEEKS_BY_AUTHOR).map(([k, arr]) => [k, arr.reduce((a, b) => a + b, 0)])
);

// ──────────────────────────────────────────────────────────────
export default function DashboardVariantsPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] pb-12">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-black/5">
        <div className="max-w-[640px] mx-auto flex items-center px-2 py-2">
          <Link href="/" className="flex items-center gap-1 text-[15px] text-[var(--color-primary)] active:opacity-60 px-2 py-1">
            <ChevronLeft size={20} />
            戻る
          </Link>
          <h1 className="flex-1 text-center text-[16px] font-semibold pr-12">ダッシュボード UI 5案</h1>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-3 py-4 space-y-6">
        <p className="text-[12px] text-[var(--color-subtext)] leading-relaxed">
          各案の「フィルタ操作 → 結果反映」を実際にタップして比較してな。
          <br />
          サンプル: 4人 (ヒデ / サトウ / タナカ / 山田) が記入してる前提。
        </p>

        <Variant letter="1" title="ヘッダープルダウン (控えめ)" desc="既存レイアウト維持、上部に表示対象セレクタ。">
          <Variant1 />
        </Variant>

        <Variant letter="2" title="上部チップフィルタ (複数選択可)" desc="色付きチップ、複数人選んで合算もOK。">
          <Variant2 />
        </Variant>

        <Variant letter="3" title="横スワイプタブ (人ごとにページ)" desc="iOS天気アプリ風、人切替に最適。">
          <Variant3 />
        </Variant>

        <Variant letter="4" title="常時 比較モード (積み上げ)" desc="フィルタ無し、誰がどれだけ貢献したか常時可視化。">
          <Variant4 />
        </Variant>

        <Variant letter="5" title="右上アイコン → ボトムシート" desc="通常はスッキリ、必要時だけシートで複数選択。">
          <Variant5 />
        </Variant>

        <p className="text-[11px] text-[var(--color-subtext)] text-center pt-4 leading-relaxed">
          見比べたら気に入った案を Claude に伝えてな。組み合わせも OK。
        </p>
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
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

// ── 案1: ヘッダープルダウン ───────────────────────────────────
function Variant1() {
  const [target, setTarget] = useState<string>('all');
  const [open, setOpen] = useState(false);
  const targetName = target === 'all' ? '全員' : AUTHORS.find(a => a.id === target)?.name ?? '全員';

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl px-3 py-2 flex items-center gap-2 relative">
        <span className="text-[11px] text-[var(--color-subtext)]">表示:</span>
        <button onClick={() => setOpen(o => !o)} className="text-[13px] font-bold flex items-center gap-1 active:opacity-60">
          {targetName} <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute top-full left-3 right-3 mt-1 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-10 overflow-hidden">
            {[{ id: 'all', name: '全員' }, ...AUTHORS].map(a => (
              <button
                key={a.id}
                onClick={() => { setTarget(a.id); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-[13px] flex items-center gap-2 hover:bg-[#F3F4F6] ${target === a.id ? 'bg-[#F9FAFB] font-bold' : ''}`}
              >
                {a.id !== 'all' && <span className="w-3 h-3 rounded-full" style={{ background: colorForUser(a.id).border }} />}
                {a.name}
                <span className="ml-auto text-[10px] text-[var(--color-subtext)]">
                  {a.id === 'all' ? totalAll() : TOTALS_BY_AUTHOR[a.id]}件
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <FakeVisitCountChart selectedAuthors={target === 'all' ? AUTHORS.map(a => a.id) : [target]} stacked={target === 'all'} />
      <FakeBreakdownCard selectedAuthors={target === 'all' ? AUTHORS.map(a => a.id) : [target]} />
    </div>
  );
}

// ── 案2: 上部チップ (複数選択可) ─────────────────────────────
function Variant2() {
  const [selected, setSelected] = useState<Set<string>>(new Set(AUTHORS.map(a => a.id)));
  const toggle = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const allOn = selected.size === AUTHORS.length;
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto pb-1 px-0.5 -mx-0.5 scrollbar-thin">
        <button
          onClick={() => setSelected(allOn ? new Set() : new Set(AUTHORS.map(a => a.id)))}
          className={`shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-full text-[12px] font-bold transition-all ${allOn ? 'bg-[#111] text-white' : 'bg-white text-[#111] border border-[#E5E7EB]'}`}
        >
          {allOn && <Check size={12} />}
          全員
        </button>
        {AUTHORS.map(a => {
          const c = colorForUser(a.id);
          const on = selected.has(a.id);
          return (
            <button
              key={a.id}
              onClick={() => toggle(a.id)}
              className="shrink-0 inline-flex items-center gap-1 h-8 px-3 rounded-full text-[12px] font-bold transition-all"
              style={{
                background: on ? c.bg : '#FFFFFF',
                color: c.text,
                border: `1px solid ${on ? c.border : '#E5E7EB'}`,
                opacity: on ? 1 : 0.6,
              }}
            >
              {on && <Check size={12} />}
              {a.name}
              <span className="opacity-60">{TOTALS_BY_AUTHOR[a.id]}</span>
            </button>
          );
        })}
      </div>
      <FakeVisitCountChart selectedAuthors={[...selected]} stacked={selected.size > 1} />
      <FakeBreakdownCard selectedAuthors={[...selected]} />
    </div>
  );
}

// ── 案3: 横スワイプタブ ───────────────────────────────────────
function Variant3() {
  const [active, setActive] = useState<string>('all');
  const targets = active === 'all' ? AUTHORS.map(a => a.id) : [active];
  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto px-0.5 -mx-0.5 scrollbar-thin border-b border-[#E5E7EB]">
        {[{ id: 'all', name: '全員' }, ...AUTHORS].map(a => {
          const c = a.id === 'all' ? null : colorForUser(a.id);
          const isActive = active === a.id;
          return (
            <button
              key={a.id}
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
      <FakeVisitCountChart selectedAuthors={targets} stacked={active === 'all'} />
      <FakeBreakdownCard selectedAuthors={targets} />
    </div>
  );
}

// ── 案4: 常時 比較モード (積み上げ) ──────────────────────────
function Variant4() {
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl px-3 py-2 flex items-center gap-2">
        <Users size={14} className="text-[var(--color-subtext)]" />
        <span className="text-[11px] text-[var(--color-subtext)]">チーム全体 / 内訳</span>
        <div className="ml-auto flex gap-2">
          {AUTHORS.map(a => {
            const c = colorForUser(a.id);
            return (
              <span key={a.id} className="text-[10px] inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm" style={{ background: c.border }} />
                <span style={{ color: c.text }}>{a.name}</span>
              </span>
            );
          })}
        </div>
      </div>
      <FakeVisitCountChart selectedAuthors={AUTHORS.map(a => a.id)} stacked />
      <FakeBreakdownCard selectedAuthors={AUTHORS.map(a => a.id)} />
    </div>
  );
}

// ── 案5: 右上アイコン → ボトムシート ─────────────────────────
function Variant5() {
  const [sheet, setSheet] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(AUTHORS.map(a => a.id)));

  const toggle = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const targetName = selected.size === AUTHORS.length
    ? '全員'
    : selected.size === 1
    ? AUTHORS.find(a => a.id === [...selected][0])?.name ?? '全員'
    : `${selected.size}人を表示中`;

  return (
    <div className="space-y-3 relative">
      <div className="bg-white rounded-xl px-3 py-2 flex items-center gap-2">
        <span className="text-[11px] text-[var(--color-subtext)]">表示中:</span>
        <span className="text-[13px] font-bold flex-1">{targetName}</span>
        <button
          onClick={() => setSheet(true)}
          aria-label="表示対象を選ぶ"
          className="w-8 h-8 rounded-full bg-[#F3F4F6] inline-flex items-center justify-center active:scale-95"
        >
          <Users size={14} />
        </button>
      </div>
      <FakeVisitCountChart selectedAuthors={[...selected]} stacked={selected.size > 1} />
      <FakeBreakdownCard selectedAuthors={[...selected]} />

      {sheet && (
        <div className="absolute inset-0 z-10 bg-black/30 flex items-end rounded-2xl overflow-hidden -m-3" onClick={() => setSheet(false)}>
          <div className="bg-white w-full rounded-t-2xl p-4 space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex items-center">
              <h3 className="text-sm font-bold flex-1">表示する人を選ぶ</h3>
              <button onClick={() => setSheet(false)} className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-[#F3F4F6]">
                <X size={16} />
              </button>
            </div>
            {AUTHORS.map(a => {
              const c = colorForUser(a.id);
              const on = selected.has(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => toggle(a.id)}
                  className="w-full flex items-center gap-2 py-2 text-left active:opacity-60"
                >
                  <span className={`w-5 h-5 rounded inline-flex items-center justify-center ${on ? '' : 'border border-[#D1D5DB]'}`}
                    style={on ? { background: c.border } : {}}>
                    {on && <Check size={12} className="text-white" />}
                  </span>
                  <span className="w-3 h-3 rounded-full" style={{ background: c.border }} />
                  <span className="text-[13px] font-medium flex-1">{a.name}</span>
                  <span className="text-[10px] text-[var(--color-subtext)]">{TOTALS_BY_AUTHOR[a.id]}件</span>
                </button>
              );
            })}
            <button
              onClick={() => setSheet(false)}
              className="w-full h-10 rounded-full bg-[#111] text-white text-[13px] font-bold mt-2"
            >
              適用
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 共通: 訪問回数チャート ────────────────────────────────────
function FakeVisitCountChart({ selectedAuthors, stacked }: { selectedAuthors: string[]; stacked: boolean }) {
  const totalsPerWeek = Array.from({ length: 12 }, (_, w) =>
    selectedAuthors.reduce((sum, aid) => sum + (WEEKS_BY_AUTHOR[aid]?.[w] ?? 0), 0),
  );
  const max = Math.max(...totalsPerWeek, 1);

  return (
    <div className="bg-white rounded-xl p-3">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-[14px] font-bold">家庭訪問の回数</h3>
        <span className="text-[10px] text-[var(--color-subtext)]">直近12週</span>
      </div>
      <div className="flex items-end gap-1 h-20">
        {totalsPerWeek.map((total, w) => {
          if (!stacked) {
            return (
              <div key={w} className="flex-1 flex flex-col items-center">
                <div className="w-full rounded-t" style={{ height: `${(total / max) * 100}%`, background: selectedAuthors.length === 1 ? colorForUser(selectedAuthors[0]).border : '#111', minHeight: total > 0 ? 2 : 0 }} />
                <span className="text-[8px] text-[var(--color-subtext)] mt-0.5">{w === 0 ? '今' : w === 1 ? '前' : ''}</span>
              </div>
            );
          }
          // 積み上げ
          return (
            <div key={w} className="flex-1 flex flex-col-reverse items-center" style={{ height: '100%' }}>
              <span className="text-[8px] text-[var(--color-subtext)] mt-0.5">{w === 0 ? '今' : w === 1 ? '前' : ''}</span>
              <div className="w-full rounded-t overflow-hidden flex flex-col-reverse" style={{ height: `${(total / max) * 100}%`, minHeight: total > 0 ? 2 : 0 }}>
                {selectedAuthors.map(aid => {
                  const v = WEEKS_BY_AUTHOR[aid]?.[w] ?? 0;
                  if (v === 0) return null;
                  return (
                    <div key={aid} style={{ background: colorForUser(aid).border, height: `${(v / total) * 100}%` }} />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 共通: 訪問ログ内訳カード (簡易版) ──────────────────────────
function FakeBreakdownCard({ selectedAuthors }: { selectedAuthors: string[] }) {
  const total = selectedAuthors.reduce((s, a) => s + TOTALS_BY_AUTHOR[a], 0);
  return (
    <div className="bg-white rounded-xl p-3">
      <h3 className="text-[14px] font-bold mb-2">訪問ログ内訳</h3>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="bg-emerald-50 rounded-lg py-2">
          <div className="text-[20px] font-bold text-emerald-700">{Math.round(total * 0.6)}</div>
          <div className="text-[10px] text-emerald-700">本人◎</div>
        </div>
        <div className="bg-gray-50 rounded-lg py-2">
          <div className="text-[20px] font-bold text-gray-700">{Math.round(total * 0.4)}</div>
          <div className="text-[10px] text-gray-600">不在/その他</div>
        </div>
      </div>
      {selectedAuthors.length > 1 && (
        <div className="flex gap-1 mt-2 text-[10px]">
          {selectedAuthors.map(a => {
            const author = AUTHORS.find(x => x.id === a);
            const c = colorForUser(a);
            return (
              <span key={a} className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.border }} />
                <span style={{ color: c.text }}>{author?.name}: {TOTALS_BY_AUTHOR[a]}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function totalAll() {
  return Object.values(TOTALS_BY_AUTHOR).reduce((a, b) => a + b, 0);
}
