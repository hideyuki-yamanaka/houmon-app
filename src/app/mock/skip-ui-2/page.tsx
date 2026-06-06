'use client';

// 案2: リストカード右端に小さいスキップアイコン
// 名簿リスト 1 件ごとに 右端に「⏭」を常設。シート開かんでも 一覧から直接処理。
// 「見えた瞬間に押せる」最短経路。

import Link from 'next/link';
import { useState } from 'react';
import { Star, SkipForward, ChevronRight } from 'lucide-react';

type MemberRow = {
  id: string;
  name: string;
  org: string;
  color: string;
  visited: boolean;
  wantToVisit?: boolean;
  skipped?: boolean;
};

const INITIAL: MemberRow[] = [
  { id: '1', name: '田中 一郎',  org: '本部A ・ 未訪問',  color: '#E45A5A', visited: false, wantToVisit: true },
  { id: '2', name: '佐藤 花子',  org: '本部B ・ 訪問 2回', color: '#4A90C2', visited: true },
  { id: '3', name: '山田 太郎',  org: '本部C ・ 未訪問',  color: '#5FA86A', visited: false },
  { id: '4', name: '高橋 健二',  org: '本部A ・ 訪問 1回', color: '#E45A5A', visited: true },
  { id: '5', name: '渡辺 さとし', org: '本部B ・ 未訪問',  color: '#4A90C2', visited: false },
];

export default function Page() {
  const [rows, setRows] = useState<MemberRow[]>(INITIAL);
  const [tab, setTab] = useState<'go' | 'no' | 'skip'>('go');

  const toggleSkip = (id: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, skipped: !r.skipped } : r));
  };

  const visible = rows.filter(r => tab === 'go' ? !r.skipped : tab === 'skip' ? r.skipped : false);
  const goCount = rows.filter(r => !r.skipped).length;
  const skipCount = rows.filter(r => r.skipped).length;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="px-4 pt-6 pb-3 max-w-md mx-auto">
        <Link href="/mock/skip-ui" className="text-xs text-[var(--color-subtext)] underline">← 一覧へ戻る</Link>
        <h1 className="text-xl font-bold mt-2">案2 リストカード右端のボタン</h1>
        <p className="text-xs text-[var(--color-subtext)] mt-1">
          リスト 1 件ずつにスキップアイコン。⏭ ボタン押したらタブ移動する。
        </p>
      </header>

      <div className="max-w-md mx-auto px-4">
        <div className="rounded-2xl border border-black/10 bg-white overflow-hidden shadow-sm">
          {/* タブ */}
          <div className="px-4 pt-3">
            <div className="w-10 h-1 bg-black/15 rounded-full mx-auto mb-3" />
            <div className="flex gap-1.5 bg-[#F2F2F7] rounded-full p-1">
              {([
                { key: 'go',   label: 'いける',  n: goCount },
                { key: 'no',   label: 'いけない', n: 22 },
                { key: 'skip', label: 'スキップ', n: skipCount },
              ] as const).map(t => {
                const active = tab === t.key;
                return (
                  <button key={t.key} onClick={() => setTab(t.key)}
                          className={`flex-1 py-1.5 rounded-full flex items-center justify-center gap-1 transition-colors ${active ? 'bg-white shadow-sm' : ''}`}>
                    <span className={`text-[12px] font-bold ${active ? 'text-[#111]' : 'text-[var(--color-subtext)]'}`}>{t.label}</span>
                    <span className={`text-[10px] font-bold rounded-full px-1.5 ${active ? 'bg-[#111] text-white' : 'bg-black/10 text-[#666]'}`}>{t.n}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* リスト */}
          <div className="flex flex-col gap-1 px-3 pt-3 pb-3 min-h-[360px]">
            {visible.length === 0 && (
              <div className="text-center text-[12px] text-[var(--color-subtext)] py-8">該当なし</div>
            )}
            {visible.map(m => (
              <div key={m.id}
                   className="flex items-center gap-3 py-2 pl-3 pr-2 rounded-xl border border-black/10">
                <div className="w-9 h-9 rounded-full text-white text-sm font-bold flex items-center justify-center shrink-0"
                     style={{ background: m.color }}>{m.name.slice(0, 1)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold truncate flex items-center gap-1.5">
                    {m.name}
                    {m.wantToVisit && <Star size={11} fill="#FFCC00" stroke="#FFCC00" />}
                  </div>
                  <div className="text-[11px] text-[var(--color-subtext)] mt-0.5">{m.org}</div>
                </div>
                {/* スキップボタン (案2のポイント) */}
                <button
                  onClick={() => toggleSkip(m.id)}
                  aria-label={m.skipped ? '復元' : 'スキップ'}
                  className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors active:scale-95 ${
                    m.skipped
                      ? 'bg-[#F2F2F7] text-[#666]'
                      : 'text-[#999] active:bg-[#F0F0F0]'
                  }`}>
                  <SkipForward size={16} strokeWidth={2.2} fill={m.skipped ? '#666' : 'none'} />
                </button>
                <ChevronRight size={14} className="text-[#bbb] shrink-0" />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 mb-12 text-[12px] text-[var(--color-subtext)] leading-relaxed">
          <p className="mb-1"><b>👍 良いところ</b>: 一覧見ながら 大量にスキップする時 圧倒的に速い。詳細開かなくていい</p>
          <p className="mb-1"><b>🤔 弱いところ</b>: カードのタップ領域が複雑化。誤タップでスキップしてしまうかも (確認 toast 必要)</p>
        </div>
      </div>
    </div>
  );
}
