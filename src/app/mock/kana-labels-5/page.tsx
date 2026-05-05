'use client';

// ──────────────────────────────────────────────────────────────
// あ行・か行 ラベルのデザイン 5 案
//   - メンバーカードがシャドウ付きになって、現状の細小ラベルが浮いて見える
//   - カードと馴染む案を 5 つ並べて比較
// ──────────────────────────────────────────────────────────────

import Link from 'next/link';
import { ChevronRight, Clock, MapPin } from 'lucide-react';

type Sample = { name: string; kana: string; age: number; org: string; addr: string; hex: string };
const groups = [
  {
    label: 'あ',
    members: [
      { name: '朝日 涼太', kana: 'あさひりょうた', age: 25, org: '豊岡本部・豊岡中央支部・歓喜地区', addr: '旭川市豊岡5条7丁目1-10', hex: '#0891B2' },
      { name: '伊藤 直樹', kana: 'いとうなおき', age: 27, org: '東旭川本部・??部・??地区', addr: '旭川市東光6条8丁目', hex: '#9F1239' },
    ] as Sample[],
  },
  {
    label: 'か',
    members: [
      { name: '加藤 寿希也', kana: 'かとうじゅきや', age: 26, org: '豊岡本部・豊岡部・香城地区', addr: '旭川市豊岡14条6丁目', hex: '#059669' },
    ] as Sample[],
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

// ── 5 種類のラベル ──

// 案 1: 大きく太めの単独行
function Label1({ label }: { label: string }) {
  return (
    <div className="px-1 pt-3 pb-2 text-[15px] font-bold text-[#111]">{label}行</div>
  );
}

// 案 2: ピル型バッジ (角丸薄背景)
function Label2({ label }: { label: string }) {
  return (
    <div className="pt-3 pb-1.5 px-1">
      <span className="inline-block text-[12px] font-bold px-2.5 py-1 rounded-full bg-[#111] text-white">{label}</span>
    </div>
  );
}

// 案 3: 左に縦アクセントライン
function Label3({ label }: { label: string }) {
  return (
    <div className="pt-3 pb-2 flex items-center gap-2">
      <span className="block w-1 h-4 rounded-full bg-[#111]" />
      <span className="text-[14px] font-bold text-[#111]">{label}行</span>
    </div>
  );
}

// 案 4: アンダーラインで横切る
function Label4({ label }: { label: string }) {
  return (
    <div className="pt-3 pb-1.5 flex items-center gap-2">
      <span className="text-[13px] font-bold text-[#111]">{label}</span>
      <span className="flex-1 h-px bg-[#E5E5E5]" />
    </div>
  );
}

// 案 5: ふんわりピル + 件数バッジ
function Label5({ label, count }: { label: string; count: number }) {
  return (
    <div className="pt-3 pb-2 flex items-center gap-1.5">
      <span className="inline-flex items-center gap-1 text-[12px] font-bold px-2 py-0.5 rounded-md bg-white border border-[#E5E5E5] text-[#111]">
        {label}
        <span className="text-[10px] font-normal text-[#9CA3AF] tabular-nums">{count}</span>
      </span>
    </div>
  );
}

const patterns = [
  { num: 1, title: '大きめ単独行', desc: '「か行」を 15px 太字で単独行に。カードと十分なコントラスト。', Label: Label1 },
  { num: 2, title: 'ピル型黒バッジ', desc: '黒い角丸ピルに「か」だけ。装飾性高い、リスト全体を引き締める。', Label: Label2 },
  { num: 3, title: '左に縦アクセントライン', desc: '左に短い縦帯 (1×4px) + 「か行」。カードの帯と呼応する装飾。', Label: Label3 },
  { num: 4, title: 'アンダーライン区切り', desc: '「か」の右に細い横線。セクション区切り感を強く出す。', Label: Label4 },
  { num: 5, title: '白ピル + 件数', desc: '白背景の角丸 + 細ボーダー + 人数。情報量を増やしつつ控えめ。', Label: Label5 },
];

export default function MockKanaLabels5Page() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-20">
      <div className="max-w-[420px] mx-auto px-3 py-4">
        <div className="mb-4">
          <h1 className="text-xl font-bold mb-1">あ行・か行 ラベル 5 案</h1>
          <p className="text-[12px] text-[#6B6B6B]">
            シャドウ付きカードと馴染む 50 音セクション見出し。各案を比較。
          </p>
          <Link href="/" className="text-[12px] underline mt-2 inline-block">← ホームへ戻る</Link>
        </div>
        {patterns.map((p) => (
          <section key={p.num} className="mb-8">
            <div className="mb-1.5 px-1">
              <h2 className="text-[14px] font-bold">案 {p.num}: {p.title}</h2>
              <p className="text-[11px] text-[#6B6B6B] mt-0.5">{p.desc}</p>
            </div>
            {/* ボトムシート風背景 */}
            <div className="bg-white rounded-2xl pt-1 pb-4 px-3">
              {groups.map((g) => (
                <div key={g.label}>
                  <p.Label label={g.label} count={g.members.length} />
                  <div className="flex flex-col gap-2">
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
