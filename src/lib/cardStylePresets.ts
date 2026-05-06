// メンバーカード ドロップシャドウ 10 案 (v2)。
// 全案とも 2 層以上のマルチレイヤー box-shadow で「明確な立体感」を出す。
// /mock/card-style-* と DesignTuner の両方からこのファイルを参照する単一ソース。
//
// 案の並びは「控えめ → 濃い・強い」のグラデ。
// ヒデさん指示 (2026-05-06): かなり濃いめ・しっかり目の案も含める。
//
// 設計指針:
//   - 1 層シャドウは廃止。全案 2-3 層の重ねがけ。
//     (近距離 = 接地感、中距離 = 厚み、遠距離 = 浮遊感、を組合せる)
//   - border は基本 'none'。シャドウだけで輪郭を出すアプローチに統一。
//   - radius は 10-14px の範囲で適度に変化を持たせる。
//   - inspiration は実在のデザインシステム (Tailwind / Material / Apple) から採集。

export type CardStylePreset = {
  id: number;
  title: string;
  inspiration: string;
  rationale: string;
  /** CSS border-radius (例: '12px') */
  radius: string;
  /** CSS border ショートハンド (例: 'none' / '1px solid rgba(0,0,0,0.04)') */
  borderStyle: string;
  /** CSS box-shadow (multi-layer) */
  shadow: string;
};

export const CARD_STYLE_PRESETS: CardStylePreset[] = [
  {
    id: 1,
    title: '2層 ソフト (Apple軽め)',
    inspiration: 'iOS 標準カード',
    rationale:
      '近距離 1px (接地感) + 中距離 4px (柔らか厚み) の 2 層。最も控えめだが 1 層に比べてエッジが立ち、紙のような質感が出る。',
    radius: '12px',
    borderStyle: 'none',
    shadow: '0 1px 2px rgba(0,0,0,0.06), 0 4px 8px rgba(0,0,0,0.08)',
  },
  {
    id: 2,
    title: 'Tailwind shadow-md (2層)',
    inspiration: 'Tailwind UI / shadcn のデフォルトカード',
    rationale:
      'Tailwind 標準の shadow-md。スプレッド -1/-2 で輪郭をタイトに引き締めつつ 2 層で奥行きを出す、SaaS 系で最もよく使われる無難な立体感。',
    radius: '12px',
    borderStyle: 'none',
    shadow: '0 4px 6px -1px rgba(0,0,0,0.10), 0 2px 4px -2px rgba(0,0,0,0.10)',
  },
  {
    id: 3,
    title: 'Material 3 (接地強2層)',
    inspiration: 'Google Material 3 elevation 1',
    rationale:
      'Material 3 elevation 1 を踏襲。近距離に 30% の濃い接地影 + 中距離 1px-3px のぼやけ影で「机に置いた感」が強い。Google プロダクト系のしっかり感。',
    radius: '12px',
    borderStyle: 'none',
    shadow: '0 1px 2px rgba(0,0,0,0.30), 0 1px 3px 1px rgba(0,0,0,0.15)',
  },
  {
    id: 4,
    title: '3層 滑らかグラデ',
    inspiration: 'CSS Tricks "smooth shadow"',
    rationale:
      '近 1px + 中 4px + 遠 12px の 3 層を段階的に重ねて、エッジから遠くへ滑らかに薄れる影。1 層だと出ないグラデーションの自然さを 3 層で再現。',
    radius: '12px',
    borderStyle: 'none',
    shadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.06), 0 12px 24px rgba(0,0,0,0.08)',
  },
  {
    id: 5,
    title: 'ハイライト + 2層 (ガラス感)',
    inspiration: 'iOS コントロールセンター + Notion カード',
    rationale:
      '上端 1px の白いインセットハイライトで光が当たっている表現 + 下に 2 層の拡散影で奥行き。光源を意識した「ガラスタイル」風のリッチ感。',
    radius: '12px',
    borderStyle: 'none',
    shadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 2px 4px rgba(0,0,0,0.10), 0 12px 24px rgba(0,0,0,0.14)',
  },
  {
    id: 6,
    title: 'Tailwind shadow-xl (2層しっかり)',
    inspiration: 'Tailwind UI / Vercel ダッシュボード',
    rationale:
      'Tailwind shadow-xl。20px と 8px の大ぼかしを 2 層、-5/-6 のスプレッド負で輪郭を引き締めつつ「ぐっ」と浮かせる。モーダル相当の強い elevation。',
    radius: '12px',
    borderStyle: 'none',
    shadow: '0 20px 25px -5px rgba(0,0,0,0.12), 0 8px 10px -6px rgba(0,0,0,0.10)',
  },
  {
    id: 7,
    title: '3層 立体強 (リッチ)',
    inspiration: 'Notion ポップオーバー / Apple Wallet パス',
    rationale:
      '近 1px + 中 8px + 遠 24px の 3 層で大きく奥行き。「明らかに浮いている」感じが出るので、CTA や強調したいカードに有効。タップしたくなるリッチさ。',
    radius: '14px',
    borderStyle: 'none',
    shadow: '0 1px 2px rgba(0,0,0,0.08), 0 8px 16px rgba(0,0,0,0.12), 0 24px 48px rgba(0,0,0,0.16)',
  },
  {
    id: 8,
    title: 'Material 5 (大濃 2層)',
    inspiration: 'Google Material elevation 5 (Dialog)',
    rationale:
      'Material elevation の最大級。8px ぼかし + 6px スプレッド + 30% の近距離濃影で、しっかり浮きつつ接地も強い。情報の重要度を強調したい時の選択肢。',
    radius: '12px',
    borderStyle: 'none',
    shadow: '0 8px 12px 6px rgba(0,0,0,0.15), 0 4px 4px 0 rgba(0,0,0,0.30)',
  },
  {
    id: 9,
    title: 'Tailwind 2xl (大濃 2層)',
    inspiration: 'Tailwind UI shadow-2xl ベース',
    rationale:
      '25px の超大ぼかしを -12 スプレッドで遠くまでふわっと、近距離 8px 補助層で接地。グラビアのような「重さ」と立体感を両立。最も「浮遊感」が強い案。',
    radius: '12px',
    borderStyle: 'none',
    shadow: '0 25px 50px -12px rgba(0,0,0,0.25), 0 8px 16px -4px rgba(0,0,0,0.10)',
  },
  {
    id: 10,
    title: 'ステッカー超濃 (3層 boldest)',
    inspiration: '物理的にステッカーを貼ったような重い影',
    rationale:
      '近 2px (18%) + 中 8px (22%) + 遠 24px (16%) の 3 層、いずれも黒く濃い。シールが紙にしっかり貼り付いたような物理感。10 案中もっとも「濃く・しっかり」目立つ立体表現。',
    radius: '10px',
    borderStyle: 'none',
    shadow: '0 2px 4px rgba(0,0,0,0.18), 0 8px 16px rgba(0,0,0,0.22), 0 24px 40px rgba(0,0,0,0.16)',
  },
];
