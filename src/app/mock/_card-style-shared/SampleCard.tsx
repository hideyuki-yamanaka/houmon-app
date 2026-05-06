'use client';

// メンバーカード 枠線 + シャドウ 10 案 共有ロジック (v2)。
//
// v1 (5 案) は独自に組んだダミーカードだったが、ヒデさん指示でリアルな
// MemberCard コンポーネントに当て込む形に変更。
// 各案ごとに以下を CSS 変数で渡し、.ios-card の見た目だけ差し替える:
//   --tune-mc-radius        (角丸)
//   --tune-mc-border-style  (border ショートハンド or 'none')
//   --tune-mc-shadow        (box-shadow)
//
// 10 案の出典/参考は STYLES の inspiration / desc に記載。
// 「ミニマムだけど立体感」を狙った実在アプリの典型的な elevation を採集。

import MemberCard from '../../../components/MemberCard';
import type { MemberWithVisitInfo } from '../../../lib/types';
import { CARD_STYLE_PRESETS, type CardStylePreset } from '../../../lib/cardStylePresets';

const now = new Date().toISOString();

// ヒデさん運用と整合したサンプル 3 件 (ヤング含む)。
// 組織色は MemberCard 内で district から取られるが、見た目を安定させるため
// 既存のサンプル住所/組織を使ってリアルな見た目に近づける。
export const samples: MemberWithVisitInfo[] = [
  {
    id: 'sample-1',
    name: '朝日 涼太',
    nameKana: 'あさひりょうた',
    honbu: '豊岡本部',
    bu: '豊岡中央支部',
    district: '歓喜地区',
    category: 'young',
    address: '旭川市豊岡5条7丁目1-10',
    age: 25,
    visitCycleDays: 60,
    createdAt: now,
    updatedAt: now,
    totalVisits: 0,
    isOverdue: false,
  },
  {
    id: 'sample-2',
    name: '伊藤 直樹',
    nameKana: 'いとうなおき',
    honbu: '東旭川本部',
    bu: '?',
    district: '?',
    category: 'young',
    address: '旭川市東光6条8丁目',
    age: 27,
    visitCycleDays: 60,
    createdAt: now,
    updatedAt: now,
    totalVisits: 1,
    isOverdue: false,
    lastVisitDate: '2026-05-05',
    lastVisitHour: 14,
  },
  {
    id: 'sample-3',
    name: '加藤 寿希也',
    nameKana: 'かとうじゅきや',
    honbu: '豊岡本部',
    bu: '豊岡部',
    district: '香城地区',
    category: 'young',
    address: '旭川市豊岡14条6丁目',
    age: 26,
    visitCycleDays: 60,
    createdAt: now,
    updatedAt: now,
    totalVisits: 0,
    isOverdue: false,
  },
];

export type CardStyle = {
  border: string;
  shadow: string;
  radius: string;
};

export type StyleEntry = {
  num: number;
  title: string;
  inspiration: string;
  rationale: string;
  style: CardStyle;
};

// 10 案: 単一ソース (lib/cardStylePresets.ts) から派生。
// このファイルは旧 mock の互換のため STYLES 形式で再エクスポートする。
export const STYLES: StyleEntry[] = CARD_STYLE_PRESETS.map((p: CardStylePreset) => ({
  num: p.id,
  title: p.title,
  inspiration: p.inspiration,
  rationale: p.rationale,
  style: { border: p.borderStyle, shadow: p.shadow, radius: p.radius },
}));


/** 各案のスタイルを CSS 変数として渡すラッパー。
 *  内部の .ios-card がこの変数を拾って描画される。 */
export function StyleScope({
  style,
  children,
}: {
  style: CardStyle;
  children: React.ReactNode;
}) {
  return (
    <div
      style={
        {
          '--tune-mc-radius': style.radius,
          '--tune-mc-border-style': style.border,
          '--tune-mc-shadow': style.shadow,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

export function StyleVariantSheet({
  entry,
  showSpec = true,
}: {
  entry: StyleEntry;
  showSpec?: boolean;
}) {
  return (
    <section>
      <div className="mb-2 px-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h2 className="text-[15px] font-bold">案 {entry.num}: {entry.title}</h2>
        </div>
        <p className="text-[11px] text-[#0EA5E9] mt-0.5 leading-snug">
          参考: {entry.inspiration}
        </p>
        {showSpec && (
          <p className="text-[11px] text-[#6B6B6B] mt-1 leading-relaxed">
            {entry.rationale}
          </p>
        )}
      </div>
      {/* ボトムシート風: 白背景 + 角丸 + 余白 (実際の MembersListSheet 内と同じ条件) */}
      <div className="bg-white rounded-2xl pt-3 pb-4 px-3 space-y-2.5">
        <StyleScope style={entry.style}>
          {samples.map((m) => (
            <MemberCard key={m.id} member={m} />
          ))}
        </StyleScope>
      </div>
      {showSpec && (
        <pre className="mt-2 text-[10px] text-[#6B6B6B] bg-[#F8F8F8] rounded-md p-2 overflow-x-auto leading-snug">{`border: ${entry.style.border}\nbox-shadow: ${entry.style.shadow}\nborder-radius: ${entry.style.radius}`}</pre>
      )}
    </section>
  );
}
