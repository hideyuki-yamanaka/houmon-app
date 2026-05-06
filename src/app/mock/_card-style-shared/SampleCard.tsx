'use client';

// メンバーカード 枠線 + シャドウ 5 案 共有ロジック。
// App Store / Airbnb 風の「ミニマムだけど立体感」を狙う 5 パターン。
// 各案ページから import して使う。

import { ChevronRight, Clock, MapPin } from 'lucide-react';

export type Sample = {
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

export const samples: Sample[] = [
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

const youngBadge =
  'text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#0EA5E9] text-white leading-none whitespace-nowrap';

export type CardStyle = {
  /** カード自体の border。"none" or CSS 値 */
  border: string;
  /** box-shadow */
  shadow: string;
  /** border-radius (例: '12px') */
  radius: string;
};

export const STYLES: Record<1 | 2 | 3 | 4 | 5, { title: string; tagline: string; desc: string; style: CardStyle }> = {
  1: {
    title: '案 1: ボーダーレス + 柔らか二重シャドウ (App Store風)',
    tagline: 'App Store のアプリリストに寄せた、枠線なし + 近距離 & 遠距離の二重影',
    desc: 'border なし。box-shadow を「1px 近距離 + 12px 遠距離」の二重に重ねて、空気感のある柔らかい立体に。radius 12px。',
    style: {
      border: 'none',
      shadow: '0 1px 2px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.06)',
      radius: '12px',
    },
  },
  2: {
    title: '案 2: 極薄ボーダー + 控えめシャドウ (Airbnb風)',
    tagline: 'Airbnb の宿カードに寄せた、ヘアライン枠線 + 控えめ影',
    desc: '1px の極薄ボーダー (rgba 0.04) で輪郭をうっすら出しつつ、影は 0 2px 8px と控えめ。やぼったくならず輪郭が見える。radius 12px。',
    style: {
      border: '1px solid rgba(0,0,0,0.04)',
      shadow: '0 2px 8px rgba(0,0,0,0.05)',
      radius: '12px',
    },
  },
  3: {
    title: '案 3: ボーダーレス + 拡散シャドウ (浮遊感)',
    tagline: '輪郭を捨てて、影だけで立体感を表現',
    desc: 'border なし。0 4px 14px の拡散影一発で、白背景にふわっと浮く。シンプルだが立体感あり。radius 14px (角を少し大きめ)。',
    style: {
      border: 'none',
      shadow: '0 4px 14px rgba(0,0,0,0.08)',
      radius: '14px',
    },
  },
  4: {
    title: '案 4: 二段シャドウ Notion風 (奥行き)',
    tagline: '近距離 (1px) + 遠距離 (24px) を強めにかけて、はっきり浮かせる',
    desc: '近接の 1px シャドウで境界を補強しつつ、24px の長い遠距離影で奥行き。Notion のカードに近い「しっかり浮く」感じ。radius 12px。',
    style: {
      border: 'none',
      shadow: '0 1px 1px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.09)',
      radius: '12px',
    },
  },
  5: {
    title: '案 5: 上ハイライト + 拡散影 (ガラス風)',
    tagline: '上端に 1px の白いインセットハイライトを入れて、エッジを上品に光らせる',
    desc: 'inset 0 1px 0 rgba(255,255,255,0.9) で上端に白いハイライト + 0 4px 14px の拡散影。光が当たっているような上品さ。radius 12px。',
    style: {
      border: 'none',
      shadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 14px rgba(0,0,0,0.07)',
      radius: '12px',
    },
  },
};

export function StyledCard({ s, style }: { s: Sample; style: CardStyle }) {
  return (
    <div
      className="bg-white overflow-hidden flex"
      style={{
        borderRadius: style.radius,
        border: style.border,
        boxShadow: style.shadow,
      }}
    >
      <span className="w-[6px] shrink-0 self-stretch" style={{ background: s.hex }} />
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
        {s.address && (
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[#6B6B6B] truncate">
            <MapPin size={12} strokeWidth={1.8} className="shrink-0" />
            <span className="truncate">{s.address}</span>
          </div>
        )}
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[#6B6B6B]">
          <Clock size={12} strokeWidth={1.8} />
          {s.lastVisitText ?? '----年--月--日'}
        </div>
      </div>
    </div>
  );
}

export function StyleVariantSheet({
  variant,
  showSpec = true,
}: {
  variant: 1 | 2 | 3 | 4 | 5;
  showSpec?: boolean;
}) {
  const v = STYLES[variant];
  return (
    <section>
      <div className="mb-2 px-1">
        <h2 className="text-[15px] font-bold">{v.title}</h2>
        <p className="text-[11px] text-[#6B6B6B] mt-0.5 leading-snug">{v.tagline}</p>
        {showSpec && (
          <p className="text-[10px] text-[#9CA3AF] mt-1 leading-snug">{v.desc}</p>
        )}
      </div>
      {/* ボトムシート風: 白背景 + 角丸 + 余白 */}
      <div className="bg-white rounded-2xl pt-3 pb-4 px-3 space-y-2.5">
        {samples.map((s) => (
          <StyledCard key={s.id} s={s} style={v.style} />
        ))}
      </div>
      {showSpec && (
        <pre className="mt-2 text-[10px] text-[#6B6B6B] bg-[#F8F8F8] rounded-md p-2 overflow-x-auto leading-snug">{`border: ${v.style.border}\nbox-shadow: ${v.style.shadow}\nborder-radius: ${v.style.radius}`}</pre>
      )}
    </section>
  );
}
