'use client';

// 「最上端カード上端 fade」問題の解決案比較 mock。
// ベースは案 4 (Notion風 二段 elevation): 0 1px 1px(.03) + 0 8px 24px(.09), radius 12px。
// このベースに対して背景色 / inset hairline / 上向き極細影 を組み合わせて 10 案を比較。
//
// ヒデさん観察 (2026-05-06):
//   メンバーリストの最上端カード (朝日さん) の上端だけぼやけて見える。
//   原因: 下のカードは「上のカードのシャドウ + 下のカードのシャドウ」が累積して
//   境界くっきり、最上端は上に累積相手がいないので fade。

import Link from 'next/link';
import MemberCard from '../../../components/MemberCard';
import { samples } from '../_card-style-shared/SampleCard';

// ベースシャドウ (案 4 Notion風)
const BASE_SHADOW = '0 1px 1px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.09)';
const BASE_RADIUS = '12px';

type Variant = {
  num: number;
  approach: 'A' | 'B' | 'C' | 'A+B' | 'A+C' | 'A+B+C' | '基準';
  title: string;
  desc: string;
  /** ボトムシートの背景色 */
  sheetBg: string;
  /** カードの box-shadow (BASE_SHADOW にプラスする層を含む) */
  shadow: string;
  /** 角丸 */
  radius: string;
  /** border-style (基本 'none') */
  border: string;
};

const VARIANTS: Variant[] = [
  {
    num: 0,
    approach: '基準',
    title: '現状ベース (Notion風 案 4)',
    desc: '比較対象。背景 #FFF + 二段シャドウのみ。最上端カードの上端が fade する状態。',
    sheetBg: '#FFFFFF',
    shadow: BASE_SHADOW,
    radius: BASE_RADIUS,
    border: 'none',
  },
  {
    num: 1,
    approach: 'A',
    title: 'A 弱: 背景 #FAFAFA',
    desc: 'シート背景をほんのり灰色に。カードは白のまま、コントラストで全方向の輪郭が出る。最も低侵襲。',
    sheetBg: '#FAFAFA',
    shadow: BASE_SHADOW,
    radius: BASE_RADIUS,
    border: 'none',
  },
  {
    num: 2,
    approach: 'A',
    title: 'A 中: 背景 #F7F7F7',
    desc: 'もう一段グレー寄りに。コントラストが強まり輪郭が明確。Airbnb / Apple Music 系の感じ。',
    sheetBg: '#F7F7F7',
    shadow: BASE_SHADOW,
    radius: BASE_RADIUS,
    border: 'none',
  },
  {
    num: 3,
    approach: 'A',
    title: 'A 強: 背景 #F2F2F2',
    desc: 'はっきりグレー寄り。カードの分離は最大だが、シート全体がグレーっぽい印象になる。',
    sheetBg: '#F2F2F2',
    shadow: BASE_SHADOW,
    radius: BASE_RADIUS,
    border: 'none',
  },
  {
    num: 4,
    approach: 'B',
    title: 'B 弱: inset hairline rgba 0.03',
    desc: '全カードに極薄の inset 1px を全周追加。最上端も全方向に輪郭。背景は白のまま。',
    sheetBg: '#FFFFFF',
    shadow: `inset 0 0 0 1px rgba(0,0,0,0.03), ${BASE_SHADOW}`,
    radius: BASE_RADIUS,
    border: 'none',
  },
  {
    num: 5,
    approach: 'B',
    title: 'B 標準: inset hairline rgba 0.05',
    desc: 'inset hairline をやや濃くした版。輪郭はくっきりだが、線が見え始めるラインなので案件によってはやぼったく感じるかも。',
    sheetBg: '#FFFFFF',
    shadow: `inset 0 0 0 1px rgba(0,0,0,0.05), ${BASE_SHADOW}`,
    radius: BASE_RADIUS,
    border: 'none',
  },
  {
    num: 6,
    approach: 'C',
    title: 'C 弱: 上向き極細影 0 -1px 2px',
    desc: 'BASE_SHADOW に上向き 1px の極細影を追加。下に向かう影とは逆方向なので累積問題そのものを解決。',
    sheetBg: '#FFFFFF',
    shadow: `0 -1px 2px rgba(0,0,0,0.04), ${BASE_SHADOW}`,
    radius: BASE_RADIUS,
    border: 'none',
  },
  {
    num: 7,
    approach: 'C',
    title: 'C 強: 上向き極細影 0 -2px 4px',
    desc: '上向き影をしっかり目に。最上端の輪郭が強くなるが、下のカードでは「上下両方に影」状態になり立体感が増す副作用あり。',
    sheetBg: '#FFFFFF',
    shadow: `0 -2px 4px rgba(0,0,0,0.06), ${BASE_SHADOW}`,
    radius: BASE_RADIUS,
    border: 'none',
  },
  {
    num: 8,
    approach: 'A+C',
    title: 'A + C: 背景 #FAFAFA + 上向き影 弱',
    desc: '低侵襲な A と C を組合せ。背景の差で全体輪郭、上向き影で最上端をダメ押し。バランス良。',
    sheetBg: '#FAFAFA',
    shadow: `0 -1px 2px rgba(0,0,0,0.04), ${BASE_SHADOW}`,
    radius: BASE_RADIUS,
    border: 'none',
  },
  {
    num: 9,
    approach: 'A+B',
    title: 'A + B: 背景 #FAFAFA + inset hairline 弱',
    desc: '背景の差 + 全周ヘアラインで輪郭を二重に補強。シャープな印象が出る。',
    sheetBg: '#FAFAFA',
    shadow: `inset 0 0 0 1px rgba(0,0,0,0.03), ${BASE_SHADOW}`,
    radius: BASE_RADIUS,
    border: 'none',
  },
  {
    num: 10,
    approach: 'A+B+C',
    title: 'A + B + C: 全部盛り',
    desc: '背景 #FAFAFA + 上向き影 + inset hairline。最強の輪郭補強。やりすぎ感が出る可能性もあり。',
    sheetBg: '#FAFAFA',
    shadow: `inset 0 0 0 1px rgba(0,0,0,0.03), 0 -1px 2px rgba(0,0,0,0.03), ${BASE_SHADOW}`,
    radius: BASE_RADIUS,
    border: 'none',
  },
];

function StyledSheet({ v }: { v: Variant }) {
  return (
    <section className="mb-8">
      <div className="mb-2 px-1">
        <div className="flex items-baseline gap-2">
          <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#0EA5E9] text-white">
            {v.approach}
          </span>
          <h2 className="text-[14px] font-bold leading-tight">{v.title}</h2>
        </div>
        <p className="text-[11px] text-[#6B6B6B] mt-1 leading-snug">{v.desc}</p>
      </div>
      <div
        className="rounded-2xl pt-3 pb-4 px-3 space-y-2.5"
        style={{ background: v.sheetBg }}
      >
        <div
          style={
            {
              '--tune-mc-radius': v.radius,
              '--tune-mc-border-style': v.border,
              '--tune-mc-shadow': v.shadow,
            } as React.CSSProperties
          }
        >
          <div className="space-y-2.5">
            {samples.map((m) => (
              <MemberCard key={m.id} member={m} />
            ))}
          </div>
        </div>
      </div>
      <pre className="mt-2 text-[10px] text-[#6B6B6B] bg-[#FFFFFF] rounded-md p-2 overflow-x-auto leading-snug border border-[rgba(0,0,0,0.04)]">{`sheet-bg: ${v.sheetBg}\nbox-shadow: ${v.shadow}\nborder-radius: ${v.radius}`}</pre>
    </section>
  );
}

export default function TopFadeMockPage() {
  return (
    <div className="min-h-screen bg-[#1F2937] pb-20">
      {/* 外側はあえて濃いグレーにして、各シートの背景色がよく見えるように */}
      <div className="max-w-[420px] mx-auto px-3 py-4">
        <div className="mb-4 text-white">
          <h1 className="text-xl font-bold mb-1">最上端カード fade 解決案 比較</h1>
          <p className="text-[12px] text-[#D1D5DB] leading-snug">
            ベースは案 4 (Notion風 二段 elevation)。最上端カード (朝日さん) の上端が
            ぼやけて溶ける問題に対する解決策 A / B / C およびその組合せを 10 案で比較。
          </p>
          <Link href="/" className="text-[12px] underline mt-2 inline-block">← ホームへ戻る</Link>
        </div>

        {/* 凡例 */}
        <div className="bg-white rounded-xl p-3 mb-6 text-[11px] leading-snug">
          <p><b>A</b>: シート背景を白から薄グレーに変更 (低侵襲・全方向に効く)</p>
          <p><b>B</b>: 全カードに極薄の inset hairline (1px) を追加</p>
          <p><b>C</b>: 全カードに上向きの極細シャドウを追加 (累積方向の対称化)</p>
          <p className="mt-2 text-[#6B6B6B]">
            一番目立つのは「最上端カードの上端」の見え方。各案で朝日さんカードの上の境界がどう見えるかを比較してみてください。
          </p>
        </div>

        {VARIANTS.map((v) => (
          <StyledSheet key={v.num} v={v} />
        ))}
      </div>
    </div>
  );
}
