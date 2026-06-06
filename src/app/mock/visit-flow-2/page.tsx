'use client';

// 案2: 進捗サマリーバナー (上部固定)
// ホーム画面 検索バーの直下に「対象 N人 / 完了 N人 / 残り N人 / 対象外 N人」を
// 常に表示。何もせんでも「今 どのくらい行けるか」が視界に入る。
// タップで詳細フィルタへ。

import Link from 'next/link';

const STATS = {
  target: 42,    // 実訪問対象
  done: 12,
  remain: 30,
  excluded: 30,  // 転居18 + 不明8 + 拒否4
};

export default function Page() {
  const progress = (STATS.done / STATS.target) * 100;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="px-4 pt-6 pb-3 max-w-md mx-auto">
        <Link href="/mock/visit-flow" className="text-xs text-[var(--color-subtext)] underline">← 一覧へ戻る</Link>
        <h1 className="text-xl font-bold mt-2">案2 進捗サマリーバナー</h1>
        <p className="text-xs text-[var(--color-subtext)] mt-1">
          開いた瞬間 「今 何人 行けるか・どれだけ終わったか」が常時見える。
        </p>
      </header>

      <div className="max-w-md mx-auto px-4">
        <div className="rounded-2xl border border-black/10 bg-white overflow-hidden shadow-sm">
          {/* 検索バー (既存) */}
          <div className="px-3 pt-3">
            <div className="bg-white border border-[#E5E5EA] rounded-full h-10 flex items-center px-4 text-[13px] text-[#8E8E93] shadow-sm">
              🔍 メンバー検索
            </div>
          </div>

          {/* 進捗サマリーバナー */}
          <button className="block w-full text-left px-3 mt-2">
            <div className="rounded-xl border border-black/10 bg-[linear-gradient(135deg,#F7FBFF,#F0F7FF)] p-3 active:opacity-80">
              {/* 上段: タイトルと「フィルタを開く」 */}
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-[var(--color-subtext)] font-semibold tracking-wide">📊 今日の状況</div>
                <div className="text-[11px] text-[#4A90C2] font-bold">調整 ▸</div>
              </div>
              {/* 大きい数字: 残り */}
              <div className="flex items-baseline gap-1 mt-1.5">
                <div className="text-[28px] font-extrabold leading-none">{STATS.remain}</div>
                <div className="text-[13px] text-[var(--color-subtext)]">人 行ける</div>
                <div className="text-[11px] text-[var(--color-subtext)] ml-auto self-end">
                  {STATS.done}/{STATS.target} 済
                </div>
              </div>
              {/* プログレスバー */}
              <div className="mt-2 h-2 rounded-full overflow-hidden bg-white/70">
                <div className="h-full bg-[#34C759]" style={{ width: `${progress}%` }} />
              </div>
              {/* 内訳 (チップ風) */}
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <span className="text-[10px] inline-flex items-center gap-1 bg-white/80 rounded-full px-2 py-0.5 border border-black/5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]" /> 完了 {STATS.done}
                </span>
                <span className="text-[10px] inline-flex items-center gap-1 bg-white/80 rounded-full px-2 py-0.5 border border-black/5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF9500]" /> 未訪問 {STATS.remain}
                </span>
                <span className="text-[10px] inline-flex items-center gap-1 bg-white/80 rounded-full px-2 py-0.5 border border-black/5 text-[var(--color-subtext)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#AF52DE]" /> 対象外 {STATS.excluded}
                </span>
              </div>
            </div>
          </button>

          {/* 疑似マップ */}
          <div className="m-3 mt-2 rounded-xl bg-[#f6efe2] h-44 relative overflow-hidden border border-black/5">
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px) 0 0/24px 24px,' +
                          'linear-gradient(0deg, rgba(0,0,0,0.04) 1px, transparent 1px) 0 0/24px 24px',
            }} />
            {/* ピン散らし */}
            {[
              { x: 20, y: 25, c: '#E45A5A' },
              { x: 60, y: 30, c: '#4A90C2' },
              { x: 35, y: 60, c: '#5FA86A' },
              { x: 75, y: 70, c: '#34C759' },
              { x: 50, y: 45, c: '#FF9500' },
            ].map((p, i) => (
              <div key={i} className="absolute -translate-x-1/2 -translate-y-full" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                <svg width={16} height={22} viewBox="0 0 28 40">
                  <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 40 14 40S28 24.5 28 14C28 6.268 21.732 0 14 0Z"
                        fill={p.c} stroke="#fff" />
                </svg>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 mb-12 text-[12px] text-[var(--color-subtext)] leading-relaxed">
          <p className="mb-1"><b>👍 良いところ</b>: 開くだけで状況がわかる。フリック不要。タップで詳細にも飛べる</p>
          <p className="mb-1"><b>🤔 弱いところ</b>: マップの面積が少し削られる。情報密度が高くて見づらく感じる人もいるかも</p>
        </div>
      </div>
    </div>
  );
}
