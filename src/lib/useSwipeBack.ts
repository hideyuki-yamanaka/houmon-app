'use client';

// ──────────────────────────────────────────────────────────────
// useSwipeBack — iOS 風 「左端から右にスワイプで戻る」 hook
//
// 検出条件:
//   - touchstart の startX が 画面左端から 24px 以内
//   - touchmove で 横移動 80px 以上 (縦移動 < 横移動 / 2)
//   - touchend で onSwipeBack を発火
//
// 全画面共通で使えるよう、document に listener を貼る。
// passive: true で スクロールを邪魔しない。
// ──────────────────────────────────────────────────────────────

import { useEffect } from 'react';

const EDGE_PX = 24;        // 左端からの判定範囲
const MIN_DELTA_X = 80;    // 戻ると判定する 横移動量
const MAX_VERTICAL_RATIO = 0.5; // 縦/横 比率 上限 (これ以上縦に動いたら 通常スクロール扱い)

export function useSwipeBack(onSwipeBack: () => void, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;

    let startX = 0;
    let startY = 0;
    let active = false;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      if (t.clientX <= EDGE_PX) {
        startX = t.clientX;
        startY = t.clientY;
        active = true;
      } else {
        active = false;
      }
    };

    const onEnd = (e: TouchEvent) => {
      if (!active) return;
      active = false;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      if (dx >= MIN_DELTA_X && dy <= dx * MAX_VERTICAL_RATIO) {
        onSwipeBack();
      }
    };

    const onCancel = () => {
      active = false;
    };

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    document.addEventListener('touchcancel', onCancel, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onCancel);
    };
  }, [onSwipeBack, enabled]);
}
