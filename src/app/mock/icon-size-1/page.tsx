'use client';

// 案1: 全 48px 統一 (大きめ・濃影)
//   検索バー h-12, 丸ボタン w-12 h-12, アイコン 22, 濃影で統一

import IconSizeShell from '../icon-size/Shell';

export default function IconSize1() {
  return (
    <IconSizeShell
      label="案1 / 全 48px / icon 22 / 濃影"
      barHeight="h-12"
      buttonSize="w-12 h-12"
      iconSize={22}
      shadow="shadow-[0_3px_10px_rgba(0,0,0,0.22)]"
    />
  );
}
