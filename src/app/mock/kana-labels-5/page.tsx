'use client';

// ──────────────────────────────────────────────────────────────
// あ行・か行 ラベル 5 案 (sticky スクロール連動 + 控えめ重視)
//   - 各案ごとに max-height のスクロール領域を作って sticky 挙動を再現
//   - 「目立たない」「でもわかる」を両立させるバリエーション
// ──────────────────────────────────────────────────────────────

import Link from 'next/link';
import { ChevronRight, MapPin, Clock } from 'lucide-react';

type Sample = { name: string; kana: string; age: number; org: string; addr: string; hex: string };

const groups: { label: string; members: Sample[] }[] = [
  {
    label: 'あ',
    members: [
      { name: '朝日 涼太', kana: 'あさひりょうた', age: 25, org: '豊岡本部・豊岡中央支部・歓喜地区', addr: '旭川市豊岡5条7丁目1-10', hex: '#0891B2' },
      { name: '伊藤 直樹', kana: 'いとうなおき', age: 27, org: '東旭川本部・??部・??地区', addr: '旭川市東光6条8丁目', hex: '#9F1239' },
    ],
  },
  {
    label: 'か',
    members: [
      { name: '加藤 寿希也', kana: 'かとうじゅきや', age: 26, org: '豊岡本部・豊岡部・香城地区', addr: '旭川市豊岡14条6丁目', hex: '#059669' },
      { name: '加藤 龍我', kana: 'かとうりゅうが', age: 25, org: '豊岡本部・豊岡部・香城地区', addr: '旭川市豊岡14条6丁目', hex: '#059669' },
      { name: '我部山 翼', kana: 'かべやまつばさ', age: 27, org: '旭創価本部・東川部・??地区', addr: '東川町西町9丁目', hex: '#65A30D' },
    ],
  },
  {
    label: 'さ',
    members: [
      { name: '佐藤 波之', kana: 'さとうなみゆき', age: 32, org: '旭創価本部・空港部', addr: '旭川市東鷹栖4条3丁目', hex: '#4D7C0F' },
      { name: '佐藤 一郎', kana: 'さとういちろう', age: 45, org: '豊岡本部・光陽部・光輝地区', addr: '旭川市豊岡3条3丁目', hex: '#DC2626' },
    ],
  },
];

function Card({ s }: { s: Sample }) {
  return (
    <div
      className="bg-white rounded-md overflow-hidden flex"
      style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}
    >
      <span className="w-2 shrink-0 self-stretch" style={{ background: s.hex }} />
      <div className="flex-1 min-w-0 px-3 py-3">
        <span className="text-[10px] text-[#6B6B6B] block leading-tight">{s.kana}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[16px]">{s.name}</span>
          <span className="text-[11px] text-[#6B6B6B]">({s.age})</span>
          <ChevronRight size={20} className="text-[#9CA3AF] shrink-0 ml-auto" style={{ display: 'none' }} />
        </div>
        <div className="mt-0.5">
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F0F0F0] text-[#6B6B6B] inline-block max-w-full truncate">{s.org}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[#6B6B6B] truncate">
          <MapPin size={11} className="shrink-0" /><span className="truncate">{s.addr}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[#6B6B6B]">
          <Clock size={11} />----年--月--日
        </div>
      </div>
    </div>
  );
}

// ── 5 案のラベル ──

// 案 1: ほぼ無装飾の極小テキスト (sticky 上の白背景で透けない)
function Label1({ label }: { label: string }) {
  return (
    <div className="sticky top-0 z-10 bg-white pt-2 pb-1 -mx-3 px-3">
      <span className="text-[11px] text-[#9CA3AF] tracking-wide">{label}行</span>
    </div>
  );
}

// 案 2: 半透明 + backdrop-blur (透けるラベル、より自然な重なり)
function Label2({ label }: { label: string }) {
  return (
    <div className="sticky top-0 z-10 backdrop-blur-md pt-2 pb-1 -mx-3 px-3" style={{ background: 'rgba(255,255,255,0.7)' }}>
      <span className="text-[11px] font-medium text-[#6B6B6B]">{label}</span>
    </div>
  );
}

// 案 3: 右寄せアンカー (連絡帳風サイドインデックス)
function Label3({ label }: { label: string }) {
  return (
    <div className="sticky top-0 z-10 bg-white pt-2 pb-1 -mx-3 px-3 flex">
      <span className="ml-auto text-[10px] text-[#9CA3AF] tracking-widest">{label}</span>
    </div>
  );
}

// 案 4: 細い水平線 + 上に小さなカナ (区切り感+上品)
function Label4({ label }: { label: string }) {
  return (
    <div className="sticky top-0 z-10 bg-white pt-3 pb-0 -mx-3 px-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-[#9CA3AF] tracking-wider">{label}</span>
        <span className="flex-1 h-px bg-[#E5E5E5]" />
      </div>
    </div>
  );
}

// 案 5: 左に小さな丸 + カナ (装飾を最小限のドットだけに)
function Label5({ label }: { label: string }) {
  return (
    <div className="sticky top-0 z-10 bg-white pt-2 pb-1 -mx-3 px-3 flex items-center gap-1.5">
      <span className="block w-1 h-1 rounded-full bg-[#9CA3AF]" />
      <span className="text-[10px] text-[#9CA3AF] tracking-wide">{label}</span>
    </div>
  );
}

const patterns: { num: number; title: string; desc: string; Label: (p: { label: string }) => React.JSX.Element }[] = [
  { num: 1, title: '極小テキストのみ', desc: '11px グレー文字だけ。スクロールに紛れる存在感ゼロ寄り。', Label: Label1 },
  { num: 2, title: '半透明 + ぼかし', desc: '70% 白 + backdrop-blur。重なる時にカードが透けて自然な印象。', Label: Label2 },
  { num: 3, title: '右寄せ サイドインデックス', desc: '右端に置いて目線の主動線(左)から外す。連絡帳風。', Label: Label3 },
  { num: 4, title: '細水平線 + 小カナ', desc: 'カナ + 横線で区切り感のみ。境界として機能、装飾感は希薄。', Label: Label4 },
  { num: 5, title: '小ドット + カナ', desc: '1×1 ドット + カナ。装飾を点だけにしたミニマル。', Label: Label5 },
];

export default function MockKanaLabels5Page() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-20">
      <div className="max-w-[420px] mx-auto px-3 py-4">
        <div className="mb-4">
          <h1 className="text-xl font-bold mb-1">あ行・か行 ラベル 5 案 v2</h1>
          <p className="text-[12px] text-[#6B6B6B] leading-snug">
            スクロール連動 (sticky top-0) 前提で、できるだけ目立たない案。各セクション内をスクロールして挙動確認。
          </p>
          <Link href="/" className="text-[12px] underline mt-2 inline-block">← ホームへ戻る</Link>
        </div>
        {patterns.map((p) => (
          <section key={p.num} className="mb-8">
            <div className="mb-1.5 px-1">
              <h2 className="text-[14px] font-bold">案 {p.num}: {p.title}</h2>
              <p className="text-[11px] text-[#6B6B6B] mt-0.5">{p.desc}</p>
            </div>
            {/* ボトムシート風ラッパー (高さ固定で sticky 挙動を見られる) */}
            <div className="bg-white rounded-2xl px-3 pt-1 pb-4 max-h-[360px] overflow-y-auto">
              {groups.map((g) => (
                <div key={g.label}>
                  <p.Label label={g.label} />
                  <div className="flex flex-col gap-2 pb-2">
                    {g.members.map((s) => <Card key={s.name} s={s} />)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
