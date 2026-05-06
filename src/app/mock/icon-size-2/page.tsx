'use client';

// 案2: 全 44px 統一 (小さめ・薄影)
//   検索バー h-11, 丸ボタン w-11 h-11, アイコン 20, 薄影で統一

import IconSizeShell from '../icon-size/Shell';

export default function IconSize2() {
  return (
    <IconSizeShell
      label="案2 / 全 44px / icon 20 / 薄影"
      barHeight="h-11"
      buttonSize="w-11 h-11"
      iconSize={20}
      shadow="shadow-[0_2px_6px_rgba(0,0,0,0.15)]"
    />
  );
}
