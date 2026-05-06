'use client';

// ──────────────────────────────────────────────────────────────
// メンバーカード ドロップシャドウ 10 案
//   - ボトムシート (白) と メンバーカード (白) が溶け合う問題を
//     シャドウのかけかたで解決する。10 種類のシャドウを比較。
//   - 各案の上に「ボトムシート風」 #FFFFFF 背景を敷いて検証。
// ──────────────────────────────────────────────────────────────

import Link from 'next/link';
import { ChevronRight, Clock, MapPin } from 'lucide-react';

type Sample = {
  id: string;
  name: string;
  nameKana: string;
  age: number;
  org: string;
  category?: 'young' | 'general';
  visited: boolean;
  lastVisitText?: string;
  address?: string;
  hex: string;
};

const samples: Sample[] = [
  {
    id: '1', name: '朝日 涼太', nameKana: 'あさひりょうた', age: 25,
    org: '豊岡本部・豊岡中央支部・歓喜地区',
    category: 'young', visited: false, address: '旭川市豊岡5条7丁目1-10', hex: '#0891B2',
  },
  {
    id: '2', name: '伊藤 直樹', nameKana: 'いとうなおき', age: 27,
    org: '東旭川本部・??部・??地区',
    category: 'young', visited: true, address: '旭川市東光6条8丁目',
    lastVisitText: '2026年5月5日 14時(1回)', hex: '#9F1239',
  },
  {
    id: '3', name: '加藤 寿希也', nameKana: 'かとうじゅきや', age: 26,
    org: '豊岡本部・豊岡部・香城地区',
    category: 'young', visited: false, address: '旭川市豊岡14条6丁目', hex: '#059669',
  },
];

const youngBadge = 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#0EA5E9] text-white leading-none whitespace-nowrap';

// 共通カード本体 (シャドウは外側で指定)
function Card({ s, shadow, extraStyle, extraClass }: {
  s: Sample; shadow: string; extraStyle?: React.CSSProperties; extraClass?: string;
}) {
  return (
    <div
      className={`bg-white rounded-md overflow-hidden flex ${extraClass ?? ''}`}
      style={{ boxShadow: shadow, ...extraStyle }}
    >
      <span className="w-2 shrink-0 self-stretch" style={{ background: s.hex }} />
      <div className="flex-1 min-w-0 px-3 py-3">
        <span className="text-[10px] text-[#6B6B6B] block leading-tight">{s.nameKana}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-[15px]">{s.name}</span>
          <span className="text-[11px] text-[#6B6B6B]">({s.age})</span>
          {s.category === 'young' && <span className={youngBadge}>ヤング</span>}
          <ChevronRight size={20} className="text-[#9CA3AF] shrink-0 ml-auto" />
        </div>
        <div className="mt-0.5">
          <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-[#F0F0F0] text-[#6B6B6B] inline-block max-w-full truncate">
            {s.org}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[#6B6B6B] truncate">
          <MapPin size={12} strokeWidth={1.8} className="shrink-0" />
          <span className="truncate">{s.address}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[#6B6B6B]">
          <Clock size={12} strokeWidth={1.8} />
          {s.lastVisitText ?? '----年--月--日'}
        </div>
      </div>
    </div>
  );
}

const patterns: { num: number; title: string; desc: string;
  shadow: string; extraStyle?: React.CSSProperties; extraClass?: string }[] = [
  { num: 1, title: '極弱 シャドウ (1px ぼかし)',
    desc: '0 1px 2px rgba(0,0,0,0.05)。最も控えめ。下端だけほのかに浮く。',
    shadow: '0 1px 2px rgba(0,0,0,0.05)' },
  { num: 2, title: '弱 シャドウ (2px ぼかし)',
    desc: '0 1px 3px rgba(0,0,0,0.08)。標準的な「カード」感。',
    shadow: '0 1px 3px rgba(0,0,0,0.08)' },
  { num: 3, title: '中 シャドウ (4-6px ぼかし)',
    desc: '0 2px 6px rgba(0,0,0,0.1)。明確に浮いて見える。',
    shadow: '0 2px 6px rgba(0,0,0,0.1)' },
  { num: 4, title: '強 シャドウ (12px ぼかし)',
    desc: '0 4px 12px rgba(0,0,0,0.12)。立体感強め、リッチな見栄え。',
    shadow: '0 4px 12px rgba(0,0,0,0.12)' },
  { num: 5, title: '長い影 (16px 下方向)',
    desc: '0 8px 16px rgba(0,0,0,0.08)。下方向に長く伸びる影で奥行き感。',
    shadow: '0 8px 16px rgba(0,0,0,0.08)' },
  { num: 6, title: '二重シャドウ (近+遠)',
    desc: '0 1px 2px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.08)。Apple系の柔らかい二重影。',
    shadow: '0 1px 2px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.08)' },
  { num: 7, title: 'インセット境界線 (薄ボーダー)',
    desc: 'inset 0 0 0 1px rgba(0,0,0,0.06)。シャドウなしの代替、内側の薄いボーダー。',
    shadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)' },
  { num: 8, title: 'ボーダー + 弱シャドウ',
    desc: 'inset 0 0 0 1px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.06)。境界 + 浮き両立。',
    shadow: 'inset 0 0 0 1px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.06)' },
  { num: 9, title: '色付きシャドウ (組織色を弱く)',
    desc: '組織色を 8% 透過の影に。所属感とカード分離を両立。',
    shadow: '0 2px 8px rgba(0,0,0,0.05)',
    // 各カードの色付きシャドウは Card の中で個別化したいが、本案では統一。
    extraStyle: { boxShadow: '0 2px 8px rgba(13, 148, 136, 0.18)' } },
  { num: 10, title: '上方向シャドウ (浮き上がり感)',
    desc: '0 -2px 6px rgba(0,0,0,0.05), 0 4px 8px rgba(0,0,0,0.06)。上下両方の影で「浮いてる」感。',
    shadow: '0 -2px 6px rgba(0,0,0,0.05), 0 4px 8px rgba(0,0,0,0.06)' },
  { num: 11, title: 'はっきり強 (15%)',
    desc: '0 6px 16px rgba(0,0,0,0.15)。案 4 より一段強く、ワンランク浮く。',
    shadow: '0 6px 16px rgba(0,0,0,0.15)' },
  { num: 12, title: '立体的 (18%)',
    desc: '0 8px 24px rgba(0,0,0,0.18)。カードがはっきり背景から分離。',
    shadow: '0 8px 24px rgba(0,0,0,0.18)' },
  { num: 13, title: '二段 Notion風',
    desc: '0 2px 4px rgba(0,0,0,0.06), 0 12px 28px rgba(0,0,0,0.16)。近距離+遠距離で柔らかく強い影。',
    shadow: '0 2px 4px rgba(0,0,0,0.06), 0 12px 28px rgba(0,0,0,0.16)' },
  { num: 14, title: '二段くっきり Material風',
    desc: '0 1px 2px rgba(0,0,0,0.08), 0 8px 20px rgba(0,0,0,0.20)。Material elevation 風のはっきり影。',
    shadow: '0 1px 2px rgba(0,0,0,0.08), 0 8px 20px rgba(0,0,0,0.20)' },
];

export default function MockCardShadow10Page() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] pb-20">
      <div className="max-w-[420px] mx-auto px-3 py-4">
        <div className="mb-4">
          <h1 className="text-xl font-bold mb-1">メンバーカード ドロップシャドウ 14 案</h1>
          <p className="text-[12px] text-[#6B6B6B]">
            白いボトムシート背景の上に白いカードを並べた状態でシャドウ比較。
          </p>
          <Link href="/" className="text-[12px] underline mt-2 inline-block">← ホームへ戻る</Link>
        </div>

        {patterns.map((p) => (
          <section key={p.num} className="mb-8">
            <div className="mb-1.5 px-1">
              <h2 className="text-[14px] font-bold">案 {p.num}: {p.title}</h2>
              <p className="text-[11px] text-[#6B6B6B] mt-0.5">{p.desc}</p>
            </div>
            {/* ボトムシート風: 白背景 + 角丸 + 余白 */}
            <div className="bg-white rounded-2xl pt-3 pb-4 px-3 space-y-2">
              {samples.map((s) => (
                <Card
                  key={s.id}
                  s={s}
                  shadow={p.shadow}
                  extraStyle={p.extraStyle ? { ...p.extraStyle, boxShadow: p.extraStyle.boxShadow ?? p.shadow } : undefined}
                  extraClass={p.extraClass}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
