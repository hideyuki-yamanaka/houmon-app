'use client';

// ──────────────────────────────────────────────────────────────
// あ行・か行 ラベル 3 案 (コンパクト・控えめ路線)
//   - 案 A: ページインジケーター風 (design-gallery 流用 / 右上ピル)
//   - 案 B: 左エッジ極細縦帯 (文字なし or 極小)
//   - 案 C: インラインミニチップ (角丸タグ・左寄せ)
//   sticky 挙動を確認するため各案ごとに max-height スクロール領域。
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
      style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}
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

// ── 案 A: ページインジケーター風 (右上ピル + frosted glass) ──
// design-gallery のページインジケーター (px-3 py-1.5 rounded-full bg-white/95 backdrop-blur shadow-md)
// を踏襲。右上に sticky で固定、スクロールしても常に「今どの行か」がわかる。
function LabelA({ label, count }: { label: string; count: number }) {
  return (
    <div className="sticky top-0 z-10 flex justify-end pt-1 pb-2 -mx-3 px-3 pointer-events-none">
      <div className="px-2.5 py-1 rounded-full bg-white/95 backdrop-blur shadow-sm border border-[#E5E5E5] text-[11px] tabular-nums">
        <span className="font-bold text-[#111]">{label}</span>
        <span className="text-[#9CA3AF]"> / {count}</span>
      </div>
    </div>
  );
}

// ── 案 B: 左エッジ極細縦バッジ (文字なし or 極小) ──
// セクションの存在を「ある」「ない」レベルで示す。装飾ゼロ路線。
// カードの左帯と区別するため、ラベル領域の左 4px に灰色の細帯 + 中央に極小カナ。
function LabelB({ label }: { label: string }) {
  return (
    <div className="sticky top-0 z-10 bg-white pt-1.5 pb-2 -mx-3 px-3">
      <div className="flex items-center gap-1.5">
        <span className="block w-0.5 h-3 bg-[#D1D5DB] rounded-full" />
        <span className="text-[10px] text-[#9CA3AF] font-medium tracking-wide">{label}</span>
      </div>
    </div>
  );
}

// ── 案 C: インラインミニチップ (角丸タグ・左寄せ) ──
// 既存の組織名チップ (bg-[#F0F0F0] rounded) と揃えた極小タグ。
// 「あ」だけを四角チップに入れて、視覚的に「タグである」と認識されやすい。
function LabelC({ label }: { label: string }) {
  return (
    <div className="sticky top-0 z-10 bg-white pt-1.5 pb-2 -mx-3 px-3">
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#F0F0F0] text-[#6B6B6B] tracking-wide inline-block">
        {label}
      </span>
    </div>
  );
}

const patterns: { num: string; title: string; desc: string; render: (g: { label: string; members: Sample[] }) => React.JSX.Element }[] = [
  {
    num: 'A', title: 'ページインジケーター風 (右上ピル)',
    desc: 'design-gallery のページ番号スタイル流用。frosted glass の小ピルを右上に sticky 配置、件数も表示。位置が目線から外れるので存在感は控えめ、でも常時見える。',
    render: (g) => <LabelA label={g.label} count={g.members.length} />,
  },
  {
    num: 'B', title: '左エッジ極細縦バッジ',
    desc: '左側に 2px の極細グレー縦バー + 小さなカナ。装飾を「点」レベルまで削ったミニマル。流し読みでは目に入らないが、注視するとセクション境界がわかる。',
    render: (g) => <LabelB label={g.label} />,
  },
  {
    num: 'C', title: 'インラインミニチップ (角丸タグ)',
    desc: 'カード内の組織名チップと同じ bg-[#F0F0F0] rounded-full スタイルで揃えた極小タグ。「タグである」とすぐ認識される、UI 全体の一貫性が高い。',
    render: (g) => <LabelC label={g.label} />,
  },
];

export default function MockKanaLabelsCompact3Page() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-20">
      <div className="max-w-[420px] mx-auto px-3 py-4">
        <div className="mb-4">
          <h1 className="text-xl font-bold mb-1">あ行・か行 ラベル 3 案 (コンパクト)</h1>
          <p className="text-[12px] text-[#6B6B6B] leading-snug">
            スクロール連動 (sticky top-0) 前提で、より控えめ・コンパクトな 3 案。各セクション内をスクロールして挙動確認。
          </p>
          <Link href="/mock/kana-labels-5" className="text-[12px] underline mt-2 inline-block mr-3">← 旧 5 案も見る</Link>
          <Link href="/" className="text-[12px] underline mt-2 inline-block">← ホームへ</Link>
        </div>
        {patterns.map((p) => (
          <section key={p.num} className="mb-8">
            <div className="mb-1.5 px-1">
              <h2 className="text-[14px] font-bold">案 {p.num}: {p.title}</h2>
              <p className="text-[11px] text-[#6B6B6B] mt-0.5 leading-snug">{p.desc}</p>
            </div>
            <div className="bg-white rounded-2xl px-3 pt-2 pb-4 max-h-[360px] overflow-y-auto">
              {groups.map((g) => (
                <div key={g.label}>
                  {p.render(g)}
                  <div className="flex flex-col gap-3 pb-3">
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
