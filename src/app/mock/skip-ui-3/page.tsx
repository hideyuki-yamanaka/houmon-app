'use client';

// 案3: リストカード 左スワイプ で スキップ
// iOS メール風。カードを左にスワイプすると 赤背景に「⏭ スキップ」が出る。
// 視覚ノイズはゼロ、慣れたら最速。

import Link from 'next/link';
import { useRef, useState } from 'react';
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

function SwipeRow({ m, onSkip }: { m: MemberRow; onSkip: () => void }) {
  const [x, setX] = useState(0);
  const startXRef = useRef<number | null>(null);
  const ACTION_W = 88;

  const handleStart = (clientX: number) => { startXRef.current = clientX - x; };
  const handleMove = (clientX: number) => {
    if (startXRef.current == null) return;
    const next = Math.min(0, Math.max(-ACTION_W * 1.4, clientX - startXRef.current));
    setX(next);
  };
  const handleEnd = () => {
    if (startXRef.current == null) return;
    startXRef.current = null;
    // 半分以上引いてたら 開いた状態でキープ、それ以下なら戻す
    if (x < -ACTION_W * 0.5) setX(-ACTION_W); else setX(0);
  };

  return (
    <div className="relative rounded-xl overflow-hidden border border-black/10">
      {/* 背面 アクション */}
      <button
        onClick={() => { onSkip(); setX(0); }}
        className="absolute right-0 top-0 bottom-0 bg-[#FF9500] text-white px-4 flex flex-col items-center justify-center"
        style={{ width: ACTION_W }}>
        <SkipForward size={20} strokeWidth={2.2} />
        <span className="text-[11px] font-bold mt-1">スキップ</span>
      </button>
      {/* 前面 カード */}
      <div
        className="bg-white flex items-center gap-3 py-2 pl-3 pr-3 select-none"
        style={{ transform: `translateX(${x}px)`, transition: startXRef.current == null ? 'transform 220ms cubic-bezier(0.32, 0.72, 0, 1)' : 'none', willChange: 'transform' }}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => { if (e.buttons === 1) handleMove(e.clientX); }}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}>
        <div className="w-9 h-9 rounded-full text-white text-sm font-bold flex items-center justify-center shrink-0"
             style={{ background: m.color }}>{m.name.slice(0, 1)}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold truncate flex items-center gap-1.5">
            {m.name}
            {m.wantToVisit && <Star size={11} fill="#FFCC00" stroke="#FFCC00" />}
          </div>
          <div className="text-[11px] text-[var(--color-subtext)] mt-0.5">{m.org}</div>
        </div>
        <ChevronRight size={14} className="text-[#bbb] shrink-0" />
      </div>
    </div>
  );
}

export default function Page() {
  const [rows, setRows] = useState<MemberRow[]>(INITIAL);
  const [tab, setTab] = useState<'go' | 'no' | 'skip'>('go');

  const skip = (id: string) => setRows(prev => prev.map(r => r.id === id ? { ...r, skipped: true } : r));
  const restore = (id: string) => setRows(prev => prev.map(r => r.id === id ? { ...r, skipped: false } : r));
  const visible = rows.filter(r => tab === 'go' ? !r.skipped : tab === 'skip' ? r.skipped : false);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="px-4 pt-6 pb-3 max-w-md mx-auto">
        <Link href="/mock/skip-ui" className="text-xs text-[var(--color-subtext)] underline">← 一覧へ戻る</Link>
        <h1 className="text-xl font-bold mt-2">案3 左スワイプでスキップ</h1>
        <p className="text-xs text-[var(--color-subtext)] mt-1">
          iOS メール風。カードを左にスーッと引いたら⏭が出る。試してみて。
        </p>
      </header>

      <div className="max-w-md mx-auto px-4">
        <div className="rounded-2xl border border-black/10 bg-white overflow-hidden shadow-sm">
          {/* タブ */}
          <div className="px-4 pt-3">
            <div className="w-10 h-1 bg-black/15 rounded-full mx-auto mb-3" />
            <div className="flex gap-1.5 bg-[#F2F2F7] rounded-full p-1">
              {([
                { key: 'go',   label: 'いける',  n: rows.filter(r => !r.skipped).length },
                { key: 'no',   label: 'いけない', n: 22 },
                { key: 'skip', label: 'スキップ', n: rows.filter(r => r.skipped).length },
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
          <div className="flex flex-col gap-2 px-3 pt-3 pb-4 min-h-[360px]">
            {visible.length === 0 && <div className="text-center text-[12px] text-[var(--color-subtext)] py-8">該当なし</div>}
            {visible.map(m => (
              tab === 'skip' ? (
                <div key={m.id} className="flex items-center gap-3 py-2 px-3 rounded-xl border border-black/10 bg-[#FAFAFA]">
                  <div className="w-9 h-9 rounded-full text-white text-sm font-bold flex items-center justify-center shrink-0 opacity-60"
                       style={{ background: m.color }}>{m.name.slice(0, 1)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[var(--color-subtext)] truncate">{m.name}</div>
                    <div className="text-[11px] text-[var(--color-subtext)] mt-0.5">{m.org}</div>
                  </div>
                  <button onClick={() => restore(m.id)} className="text-[11px] font-bold text-[#4A90C2] active:opacity-70">復元</button>
                </div>
              ) : (
                <SwipeRow key={m.id} m={m} onSkip={() => skip(m.id)} />
              )
            ))}
          </div>
        </div>

        <div className="mt-4 mb-12 text-[12px] text-[var(--color-subtext)] leading-relaxed">
          <p className="mb-1"><b>👍 良いところ</b>: 通常時はノイズ ゼロ。慣れたら最速。iOS ユーザーには直感的</p>
          <p className="mb-1"><b>🤔 弱いところ</b>: 発見性が低い (初見ユーザーが気づかない)。チュートリアル or ヒント表示が要る</p>
        </div>
      </div>
    </div>
  );
}
