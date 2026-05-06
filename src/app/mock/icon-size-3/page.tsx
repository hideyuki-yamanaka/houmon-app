'use client';

// 案3: 検索 48px / 丸ボタン 44px (中間案・濃影で統一)
//   検索バーは入力しやすい高さを維持、丸ボタンは控えめに

import IconSizeShell from '../icon-size/Shell';

export default function IconSize3() {
  return (
    <IconSizeShell
      label="案3 / 検索 48 / ボタン 44 / icon 20 / 濃影"
      barHeight="h-12"
      buttonSize="w-11 h-11"
      iconSize={20}
      shadow="shadow-[0_3px_10px_rgba(0,0,0,0.22)]"
    />
  );
}
