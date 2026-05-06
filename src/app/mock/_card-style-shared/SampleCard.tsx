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
  /** border ショートハンド ('none' or '1px solid rgba(...)') */
  border: string;
  /** box-shadow */
  shadow: string;
  /** border-radius (例: '12px') */
  radius: string;
};

export type StyleEntry = {
  num: number;
  title: string;
  inspiration: string;
  rationale: string;
  style: CardStyle;
};

// 10 案: 実在アプリの elevation/shadow パターンを研究して採集。
// 「ミニマム + ちょっと立体感」のスペクトラムを、控えめ→強め、
// シャドウ単独 → ボーダー+シャドウ → 着色シャドウ → ガラス、と幅を持って並べた。
export const STYLES: StyleEntry[] = [
  {
    num: 1,
    title: 'App Store 風 二重シャドウ',
    inspiration: 'iOS App Store / Today タブの大型カード',
    rationale:
      '近距離 1px (接地感) + 遠距離 6-16px (空気感) を重ねて、輪郭は影の濃淡だけで形成。border は 0。これが Apple 純正の elevation の基本形。',
    style: {
      border: 'none',
      shadow: '0 1px 2px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.06)',
      radius: '12px',
    },
  },
  {
    num: 2,
    title: 'Airbnb 風 ヘアライン+控えめ影',
    inspiration: 'Airbnb 宿泊カード / プロフィールカード',
    rationale:
      '1px 極薄ボーダー (rgba 0.04) で輪郭をかすかに出しつつ、影は 0 2px 8px と控えめ。線が薄いのでやぼったくならず、一覧で並べたとき境界がスッと見える。',
    style: {
      border: '1px solid rgba(0,0,0,0.04)',
      shadow: '0 2px 8px rgba(0,0,0,0.05)',
      radius: '12px',
    },
  },
  {
    num: 3,
    title: 'Apple Health 風 単一拡散影',
    inspiration: 'Apple Health / Fitness のカード',
    rationale:
      'border なし、影だけで浮かせる。0 4px 14px の単発拡散影で柔らかく浮く。角丸を 14px と少し大きめに取って Apple 系の優しさを出す。',
    style: {
      border: 'none',
      shadow: '0 4px 14px rgba(0,0,0,0.08)',
      radius: '14px',
    },
  },
  {
    num: 4,
    title: 'Notion 風 二段 elevation',
    inspiration: 'Notion のカードビュー / ポップオーバー',
    rationale:
      '近距離 1px (シャープな接地) + 遠距離 24px (大きく拡散) の二段で奥行き。影は離れた位置まで伸び、はっきり「浮いてる」感じが出る。',
    style: {
      border: 'none',
      shadow: '0 1px 1px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.09)',
      radius: '12px',
    },
  },
  {
    num: 5,
    title: 'iOS Control Center 風 上ハイライト',
    inspiration: 'iOS コントロールセンター / ウィジェット',
    rationale:
      '上端 1px に inset の白いハイライトを入れて、光が当たっているような上品さ。+ 拡散影で浮遊感。ガラス・タイル感のあるリッチな仕上がり。',
    style: {
      border: 'none',
      shadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 14px rgba(0,0,0,0.07)',
      radius: '12px',
    },
  },
  {
    num: 6,
    title: 'Linear 風 シャープ枠線',
    inspiration: 'Linear / Vercel ダッシュボードのカード',
    rationale:
      '影は捨てて、1px のクリスプな border (rgba 0.06) だけで分離。フラット & クリーン。情報量の多い画面で「サクサクしてる」感じを出すのに有効。',
    style: {
      border: '1px solid rgba(0,0,0,0.06)',
      shadow: 'none',
      radius: '8px',
    },
  },
  {
    num: 7,
    title: 'Material Elevation 2dp',
    inspiration: 'Google Material Design / Gmail / Calendar カード',
    rationale:
      'Material の elevation 2 を踏襲。0 1px 2px (輪郭) + 0 2px 4px (近距離) を重ねて、角は 8px と保守的。Google プロダクト系の堅実な elevation。',
    style: {
      border: 'none',
      shadow: '0 1px 2px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)',
      radius: '8px',
    },
  },
  {
    num: 8,
    title: 'Stripe 風 ヘアライン+極小影',
    inspiration: 'Stripe Dashboard / Vercel UI',
    rationale:
      '1px 薄ボーダー (rgba 0.05) + 0 1px 3px の極小シャドウ。境界はビシッとあるが、シャドウが控えめなのでフラット寄りの印象。情報密度の高い管理画面向け。',
    style: {
      border: '1px solid rgba(0,0,0,0.05)',
      shadow: '0 1px 3px rgba(0,0,0,0.04)',
      radius: '8px',
    },
  },
  {
    num: 9,
    title: 'Spotify 風 広拡散影',
    inspiration: 'Spotify アルバムカード / Apple Music',
    rationale:
      '0 8px 32px と広く拡散させて「グワッ」と浮かせる。角丸 8px と引き締めることで、影の存在感とコントラストを強調。タップしたくなるリッチ感。',
    style: {
      border: 'none',
      shadow: '0 8px 32px rgba(0,0,0,0.08)',
      radius: '8px',
    },
  },
  {
    num: 10,
    title: 'Cool Tint 影 (Vercel系)',
    inspiration: 'Vercel / Linear (ダーク寄り背景下のカード)',
    rationale:
      'シャドウの色を純黒ではなく、わずかに青みを帯びた濃紺 (rgba 17,24,39,*) にする。背景白でも空気感が「冷たく澄んだ」印象になり、テック寄りの上品さが出る。',
    style: {
      border: 'none',
      shadow: '0 1px 2px rgba(17,24,39,0.04), 0 6px 18px rgba(17,24,39,0.08)',
      radius: '12px',
    },
  },
];

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
