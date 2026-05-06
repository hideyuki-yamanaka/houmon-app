// メンバーカード 枠線 + シャドウ + 角丸 10 案。
// /mock/card-style-* と DesignTuner の両方から参照する単一ソース。
//
// 各案は実在アプリの elevation 表現を参考にしている (inspiration 参照)。
// 「ミニマムだけど立体感」のスペクトラムを 10 パターンで網羅。

export type CardStylePreset = {
  id: number;
  title: string;
  inspiration: string;
  rationale: string;
  /** CSS border-radius (例: '12px') */
  radius: string;
  /** CSS border ショートハンド (例: 'none' / '1px solid rgba(0,0,0,0.04)') */
  borderStyle: string;
  /** CSS box-shadow */
  shadow: string;
};

export const CARD_STYLE_PRESETS: CardStylePreset[] = [
  {
    id: 1,
    title: 'App Store風 二重シャドウ',
    inspiration: 'iOS App Store / Today タブの大型カード',
    rationale:
      '近距離 1px (接地感) + 遠距離 6-16px (空気感) を重ねて、輪郭は影の濃淡だけで形成。border は 0。これが Apple 純正の elevation の基本形。',
    radius: '12px',
    borderStyle: 'none',
    shadow: '0 1px 2px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.06)',
  },
  {
    id: 2,
    title: 'Airbnb風 ヘアライン+控えめ影',
    inspiration: 'Airbnb 宿泊カード / プロフィールカード',
    rationale:
      '1px 極薄ボーダー (rgba 0.04) で輪郭をかすかに出しつつ、影は 0 2px 8px と控えめ。線が薄いのでやぼったくならず、一覧で並べたとき境界がスッと見える。',
    radius: '12px',
    borderStyle: '1px solid rgba(0,0,0,0.04)',
    shadow: '0 2px 8px rgba(0,0,0,0.05)',
  },
  {
    id: 3,
    title: 'Apple Health風 単一拡散影',
    inspiration: 'Apple Health / Fitness のカード',
    rationale:
      'border なし、影だけで浮かせる。0 4px 14px の単発拡散影で柔らかく浮く。角丸を 14px と少し大きめに取って Apple 系の優しさを出す。',
    radius: '14px',
    borderStyle: 'none',
    shadow: '0 4px 14px rgba(0,0,0,0.08)',
  },
  {
    id: 4,
    title: 'Notion風 二段 elevation',
    inspiration: 'Notion のカードビュー / ポップオーバー',
    rationale:
      '近距離 1px (シャープな接地) + 遠距離 24px (大きく拡散) の二段で奥行き。影は離れた位置まで伸び、はっきり「浮いてる」感じが出る。',
    radius: '12px',
    borderStyle: 'none',
    shadow: '0 1px 1px rgba(0,0,0,0.03), 0 8px 24px rgba(0,0,0,0.09)',
  },
  {
    id: 5,
    title: 'iOS Control Center風 上ハイライト',
    inspiration: 'iOS コントロールセンター / ウィジェット',
    rationale:
      '上端 1px に inset の白いハイライトを入れて、光が当たっているような上品さ。+ 拡散影で浮遊感。ガラス・タイル感のあるリッチな仕上がり。',
    radius: '12px',
    borderStyle: 'none',
    shadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 14px rgba(0,0,0,0.07)',
  },
  {
    id: 6,
    title: 'Linear風 シャープ枠線',
    inspiration: 'Linear / Vercel ダッシュボードのカード',
    rationale:
      '影は捨てて、1px のクリスプな border (rgba 0.06) だけで分離。フラット & クリーン。情報量の多い画面で「サクサクしてる」感じを出すのに有効。',
    radius: '8px',
    borderStyle: '1px solid rgba(0,0,0,0.06)',
    shadow: 'none',
  },
  {
    id: 7,
    title: 'Material Elevation 2dp',
    inspiration: 'Google Material Design / Gmail / Calendar カード',
    rationale:
      'Material の elevation 2 を踏襲。0 1px 2px (輪郭) + 0 2px 4px (近距離) を重ねて、角は 8px と保守的。Google プロダクト系の堅実な elevation。',
    radius: '8px',
    borderStyle: 'none',
    shadow: '0 1px 2px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)',
  },
  {
    id: 8,
    title: 'Stripe風 ヘアライン+極小影',
    inspiration: 'Stripe Dashboard / Vercel UI',
    rationale:
      '1px 薄ボーダー (rgba 0.05) + 0 1px 3px の極小シャドウ。境界はビシッとあるが、シャドウが控えめなのでフラット寄りの印象。情報密度の高い管理画面向け。',
    radius: '8px',
    borderStyle: '1px solid rgba(0,0,0,0.05)',
    shadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  {
    id: 9,
    title: 'Spotify風 広拡散影',
    inspiration: 'Spotify アルバムカード / Apple Music',
    rationale:
      '0 8px 32px と広く拡散させて「グワッ」と浮かせる。角丸 8px と引き締めることで、影の存在感とコントラストを強調。タップしたくなるリッチ感。',
    radius: '8px',
    borderStyle: 'none',
    shadow: '0 8px 32px rgba(0,0,0,0.08)',
  },
  {
    id: 10,
    title: 'Cool Tint 影 (Vercel系)',
    inspiration: 'Vercel / Linear (ダーク寄り背景下のカード)',
    rationale:
      'シャドウの色を純黒ではなく、わずかに青みを帯びた濃紺 (rgba 17,24,39,*) にする。背景白でも空気感が「冷たく澄んだ」印象になり、テック寄りの上品さが出る。',
    radius: '12px',
    borderStyle: 'none',
    shadow: '0 1px 2px rgba(17,24,39,0.04), 0 6px 18px rgba(17,24,39,0.08)',
  },
];
