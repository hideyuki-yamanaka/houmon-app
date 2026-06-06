'use client';

// 案1: 複数選択フィルター + ライブ件数
// フィルタチップを複数選べるようにして、画面上部に「該当 N 人」が
// リアルタイムで動く。プリセット（「実訪問だけ」「全部」）も用意。
// 名簿ボトムシートとマップピン数が 両方とも 動的に連動するイメージ。

import Link from 'next/link';
import { useMemo, useState } from 'react';

type StatusKey = 'unvisited' | 'visited' | 'moved' | 'unknown' | 'refused';
const STATUS: { key: StatusKey; label: string; dot: string; count: number }[] = [
  { key: 'unvisited', label: '未訪問',  dot: '#FF9500', count: 30 },
  { key: 'visited',   label: '訪問済',  dot: '#34C759', count: 12 },
  { key: 'moved',     label: '転居',    dot: '#AF52DE', count: 18 },
  { key: 'unknown',   label: '住所不明', dot: '#8E8E93', count: 8  },
  { key: 'refused',   label: '拒否',    dot: '#FF3B30', count: 4  },
];

const PRESETS = [
  { key: 'real', label: '✓ 実訪問だけ', active: new Set<StatusKey>(['unvisited', 'visited']) },
  { key: 'todo', label: '未訪問のみ', active: new Set<StatusKey>(['unvisited']) },
  { key: 'all',  label: '全員',      active: new Set<StatusKey>(['unvisited','visited','moved','unknown','refused']) },
];

export default function Page() {
  const [selected, setSelected] = useState<Set<StatusKey>>(new Set(['unvisited','visited']));

  const total = useMemo(
    () => STATUS.filter(s => selected.has(s.key)).reduce((a, b) => a + b.count, 0),
    [selected],
  );
  const grand = STATUS.reduce((a, b) => a + b.count, 0);

  const toggle = (k: StatusKey) => {
    const next = new Set(selected);
    if (next.has(k)) next.delete(k); else next.add(k);
    setSelected(next);
  };
  const applyPreset = (set: Set<StatusKey>) => setSelected(new Set(set));

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="px-4 pt-6 pb-3 max-w-md mx-auto">
        <Link href="/mock/visit-flow" className="text-xs text-[var(--color-subtext)] underline">← 一覧へ戻る</Link>
        <h1 className="text-xl font-bold mt-2">案1 複数選択フィルター + ライブ件数</h1>
        <p className="text-xs text-[var(--color-subtext)] mt-1">
          選んだ状態の合計人数が 上に大きく出る。マップピンと名簿も連動。
        </p>
      </header>

      <div className="max-w-md mx-auto px-4">
        {/* スマホUI 模擬 */}
        <div className="rounded-2xl border border-black/10 bg-white overflow-hidden shadow-sm">
          {/* ヘッダー: ライブ件数 */}
          <div className="px-4 py-4 bg-gradient-to-b from-[#FAFAFA] to-white border-b border-black/5">
            <div className="text-[11px] text-[var(--color-subtext)] tracking-wide">該当メンバー</div>
            <div className="flex items-baseline gap-2 mt-1">
              <div className="text-[34px] font-extrabold leading-none">{total}</div>
              <div className="text-sm text-[var(--color-subtext)]">人 / {grand} 人中</div>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 h-1.5 rounded-full overflow-hidden bg-[#F0F0F0]">
              {STATUS.map(s => selected.has(s.key) && (
                <div key={s.key} style={{ background: s.dot, width: `${(s.count / grand) * 100}%`, height: '100%' }} />
              ))}
            </div>
          </div>

          {/* プリセット */}
          <div className="px-4 pt-3 pb-2 flex gap-2 overflow-x-auto">
            {PRESETS.map(p => (
              <button key={p.key}
                      onClick={() => applyPreset(p.active)}
                      className="shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold bg-[#111] text-white active:opacity-80">
                {p.label}
              </button>
            ))}
          </div>

          {/* 個別チップ (複数選択) */}
          <div className="px-4 py-3 grid grid-cols-2 gap-2">
            {STATUS.map(s => {
              const active = selected.has(s.key);
              return (
                <button key={s.key}
                        onClick={() => toggle(s.key)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-colors ${
                          active ? 'bg-[#F0F7FF] border-[#4A90C2]' : 'bg-white border-black/10'
                        }`}>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.dot }} />
                    <div className="text-[13px] font-semibold">{s.label}</div>
                  </div>
                  <div className="text-[11px] text-[var(--color-subtext)]">{s.count}</div>
                </button>
              );
            })}
          </div>

          {/* 「マップにも反映」感を出す疑似マップ */}
          <div className="m-4 mt-2 rounded-xl bg-[#f6efe2] h-32 relative overflow-hidden border border-black/5">
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px) 0 0/24px 24px,' +
                          'linear-gradient(0deg, rgba(0,0,0,0.04) 1px, transparent 1px) 0 0/24px 24px',
            }} />
            {/* 簡易ピン: total を表現 */}
            {Array.from({ length: Math.min(total, 16) }).map((_, i) => {
              const cols = 8, gap = 100 / cols;
              const x = (i % cols) * gap + 6;
              const y = Math.floor(i / cols) * 28 + 18;
              return (
                <div key={i} className="absolute" style={{ left: `${x}%`, top: y }}>
                  <svg width={14} height={20} viewBox="0 0 28 40">
                    <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 40 14 40S28 24.5 28 14C28 6.268 21.732 0 14 0Z"
                          fill="#E45A5A" stroke="#fff" />
                  </svg>
                </div>
              );
            })}
            <div className="absolute right-2 bottom-2 bg-white/95 rounded-full text-[10px] font-bold px-2 py-1 shadow-sm">
              地図に {total} ピン
            </div>
          </div>
        </div>

        <div className="mt-4 mb-12 text-[12px] text-[var(--color-subtext)] leading-relaxed">
          <p className="mb-1"><b>👍 良いところ</b>: 「触りながら 行ける人だけ残す」が指先一発。プリセットでよく使う形を保存可</p>
          <p className="mb-1"><b>🤔 弱いところ</b>: アクションが必要。「ぼーっと見て今日の状況」までは伝わらない（案2と組合せ◎）</p>
        </div>
      </div>
    </div>
  );
}
