'use client';

// 案5: 今日のおすすめ訪問 (スマートピックアップ)
// 「行ける × 未訪問 × 近場」で自動ピックアップした 5-10 人をカード表示。
// タップで地図にルート展開。
// 「今 何すればええんやろ」を考えなくていい状態を作る。

import Link from 'next/link';

type Suggestion = {
  id: string;
  name: string;
  org: string;
  color: string;
  distance: string;
  reason: string;
};

const SUGGESTIONS: Suggestion[] = [
  { id: '1', name: '田中 一郎',   org: '本部A', color: '#E45A5A', distance: '0.4km', reason: '未訪問 × 近い' },
  { id: '2', name: '佐藤 花子',   org: '本部B', color: '#4A90C2', distance: '0.6km', reason: '前回 不在 (1ヶ月前)' },
  { id: '3', name: '山田 太郎',   org: '本部C', color: '#5FA86A', distance: '0.8km', reason: '⭐ 行きたい登録' },
  { id: '4', name: '渡辺 さとし', org: '本部B', color: '#4A90C2', distance: '1.1km', reason: '未訪問' },
  { id: '5', name: '高橋 健二',   org: '本部A', color: '#E45A5A', distance: '1.3km', reason: '同方向' },
];

export default function Page() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <header className="px-4 pt-6 pb-3 max-w-md mx-auto">
        <Link href="/mock/visit-flow" className="text-xs text-[var(--color-subtext)] underline">← 一覧へ戻る</Link>
        <h1 className="text-xl font-bold mt-2">案5 今日のおすすめ訪問</h1>
        <p className="text-xs text-[var(--color-subtext)] mt-1">
          「行ける × 未訪問 × 近場」で自動抽出。考えなくても 次の行動が決まる。
        </p>
      </header>

      <div className="max-w-md mx-auto px-4">
        <div className="rounded-2xl border border-black/10 bg-white overflow-hidden shadow-sm">
          {/* ヘッダー */}
          <div className="px-4 pt-4 pb-3 bg-gradient-to-b from-[#FFFBEC] to-white border-b border-black/5">
            <div className="text-[11px] text-[#8B6F00] font-bold tracking-wide">✨ 今日のおすすめ</div>
            <div className="text-[20px] font-extrabold mt-1">
              この {SUGGESTIONS.length} 人 まわれそう
            </div>
            <div className="text-[11px] text-[var(--color-subtext)] mt-1">
              現在地から 1.5km 以内 ・ 未訪問のみ ・ 対象外を除外
            </div>
          </div>

          {/* 訪問順カード (横スワイプ可) */}
          <div className="px-3 py-3 flex gap-2 overflow-x-auto">
            {SUGGESTIONS.map((s, i) => (
              <div key={s.id}
                   className="shrink-0 w-44 rounded-xl border border-black/10 bg-white p-3 active:scale-[0.98] transition-transform">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full text-white text-[12px] font-bold flex items-center justify-center"
                       style={{ background: s.color }}>{s.name.slice(0, 1)}</div>
                  <div className="text-[10px] text-[var(--color-subtext)] ml-auto">#{i + 1}</div>
                </div>
                <div className="text-[13px] font-bold mt-2 truncate">{s.name}</div>
                <div className="text-[10px] text-[var(--color-subtext)] mt-0.5">{s.org} ・ {s.distance}</div>
                <div className="mt-2 text-[10px] bg-[#FFF8E1] text-[#7A4F00] rounded-full px-2 py-0.5 inline-block border border-[#F0CB80]/40">
                  {s.reason}
                </div>
              </div>
            ))}
          </div>

          {/* ルート表示ボタン */}
          <div className="px-4 pb-4">
            <button className="w-full bg-[#111] text-white rounded-full py-3 font-bold text-[13px] active:opacity-80 transition-opacity">
              🗺 マップにルート表示
            </button>
            <button className="w-full mt-2 text-[12px] text-[var(--color-subtext)] underline underline-offset-2">
              条件を調整する (距離・優先度)
            </button>
          </div>

          {/* 疑似マップ: ルートライン */}
          <div className="m-3 mt-0 rounded-xl bg-[#f6efe2] h-44 relative overflow-hidden border border-black/5">
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px) 0 0/24px 24px,' +
                          'linear-gradient(0deg, rgba(0,0,0,0.04) 1px, transparent 1px) 0 0/24px 24px',
            }} />
            {/* ルートライン */}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              <polyline points="50,160 90,110 160,90 220,60 280,40"
                        fill="none" stroke="#4A90C2" strokeWidth="3" strokeDasharray="4 4" strokeLinecap="round" />
            </svg>
            {/* 順番付きピン */}
            {[
              { x: 14, y: 80, n: '現' },
              { x: 28, y: 55, n: '1' },
              { x: 50, y: 45, n: '2' },
              { x: 68, y: 30, n: '3' },
              { x: 85, y: 20, n: '4' },
            ].map((p, i) => (
              <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2"
                   style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shadow-md border-2 border-white ${
                  p.n === '現' ? 'bg-[#4285F4] text-white' : 'bg-white text-[#111]'
                }`}>{p.n}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 mb-12 text-[12px] text-[var(--color-subtext)] leading-relaxed">
          <p className="mb-1"><b>👍 良いところ</b>: 「次 どこ行く?」の悩みがなくなる。経路最適化で時間短縮</p>
          <p className="mb-1"><b>🤔 弱いところ</b>: 自動ピックアップの「条件」設計が肝。ヒデさんの判断軸を反映する必要</p>
        </div>
      </div>
    </div>
  );
}
