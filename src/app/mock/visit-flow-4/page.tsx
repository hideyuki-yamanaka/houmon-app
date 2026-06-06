'use client';

// 案4: ボトムシート 3 タブ
// 「行ける人 / 対象外 / 保留」のタブ分け。各タブに件数バッジ。
// デフォルトで「行ける人」のみ目に入る → ノイズが消える。
// 対象外を見たい時だけ切り替える。

import Link from 'next/link';
import { useState } from 'react';

type Tab = 'go' | 'out' | 'hold';

const TABS: { key: Tab; label: string; count: number; hint: string }[] = [
  { key: 'go',   label: '行ける人',  count: 42, hint: '未訪問+訪問済' },
  { key: 'out',  label: '対象外',    count: 26, hint: '転居+不明+拒否' },
  { key: 'hold', label: '保留',      count: 4,  hint: '要確認' },
];

const MEMBERS: Record<Tab, { name: string; sub: string; dot: string }[]> = {
  go: [
    { name: '田中 一郎',  sub: '未訪問 ・ 本部A',   dot: '#FF9500' },
    { name: '佐藤 花子',  sub: '訪問 2回 ・ 本部B',  dot: '#34C759' },
    { name: '山田 太郎',  sub: '未訪問 ・ 本部C',   dot: '#FF9500' },
    { name: '高橋 健二',  sub: '訪問 1回 ・ 本部A',  dot: '#34C759' },
    { name: '渡辺 さとし', sub: '未訪問 ・ 本部B',   dot: '#FF9500' },
  ],
  out: [
    { name: '鈴木 三郎',   sub: '🚚 転居',    dot: '#AF52DE' },
    { name: '伊藤 健太',   sub: '🚚 転居',    dot: '#AF52DE' },
    { name: '中村 美穂',   sub: '住所不明',   dot: '#8E8E93' },
    { name: '小林 雅彦',   sub: '✋ 拒否',    dot: '#FF3B30' },
  ],
  hold: [
    { name: '加藤 直樹',  sub: '⏸ 要確認 ・ 隣人に転居可能性確認中', dot: '#8E8E93' },
    { name: '吉田 真理',  sub: '⏸ 要確認',                       dot: '#8E8E93' },
  ],
};

export default function Page() {
  const [tab, setTab] = useState<Tab>('go');
  const list = MEMBERS[tab];
  const desc = TABS.find(t => t.key === tab)!;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="px-4 pt-6 pb-3 max-w-md mx-auto">
        <Link href="/mock/visit-flow" className="text-xs text-[var(--color-subtext)] underline">← 一覧へ戻る</Link>
        <h1 className="text-xl font-bold mt-2">案4 ボトムシート 3 タブ</h1>
        <p className="text-xs text-[var(--color-subtext)] mt-1">
          「行ける/対象外/保留」のタブ分け。デフォルトは「行ける人」だけ目に入る。
        </p>
      </header>

      <div className="max-w-md mx-auto px-4">
        <div className="rounded-2xl border border-black/10 bg-white overflow-hidden shadow-sm">
          {/* タブ */}
          <div className="px-4 pt-3 pb-1">
            <div className="w-10 h-1 bg-black/15 rounded-full mx-auto mb-3" />
            <div className="flex gap-1.5 bg-[#F2F2F7] rounded-full p-1">
              {TABS.map(t => {
                const active = tab === t.key;
                return (
                  <button key={t.key} onClick={() => setTab(t.key)}
                          className={`flex-1 py-1.5 rounded-full transition-colors flex items-center justify-center gap-1 ${
                            active ? 'bg-white shadow-sm' : ''
                          }`}>
                    <span className={`text-[12px] font-bold ${active ? 'text-[#111]' : 'text-[var(--color-subtext)]'}`}>{t.label}</span>
                    <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
                      active ? 'bg-[#111] text-white' : 'bg-black/10 text-[#666]'
                    }`}>{t.count}</span>
                  </button>
                );
              })}
            </div>
            <div className="text-[10px] text-[var(--color-subtext)] mt-2 text-center">{desc.hint}</div>
          </div>

          {/* リスト */}
          <div className="flex flex-col gap-1 px-3 pt-2 pb-4">
            {list.map((m, i) => (
              <button key={i}
                      className="flex items-center gap-3 py-2 px-3 rounded-xl border border-black/10 active:bg-[#F8F8F8] text-left">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                     style={{ background: m.dot }}>{m.name.slice(0, 1)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate">{m.name}</div>
                  <div className="text-[11px] text-[var(--color-subtext)] mt-0.5">{m.sub}</div>
                </div>
                <div className="text-[11px] text-[var(--color-subtext)]">›</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 mb-12 text-[12px] text-[var(--color-subtext)] leading-relaxed">
          <p className="mb-1"><b>👍 良いところ</b>: タブの「件数バッジ」が目に入って状況把握。普段は「行ける人」しか見えない</p>
          <p className="mb-1"><b>🤔 弱いところ</b>: マップピンの方は別途対応が必要 (案3 と組合せるとベスト)</p>
        </div>
      </div>
    </div>
  );
}
