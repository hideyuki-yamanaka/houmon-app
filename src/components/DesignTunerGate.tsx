'use client';

// ──────────────────────────────────────────────────────────────
// DesignTuner の表示ゲート
//   - dev (NODE_ENV !== 'production') では常に表示
//   - 本番では URL に ?tuner=1 が付いたら有効化、localStorage に記憶
//   - ?tuner=0 で無効化 (localStorage クリア)
//   - これにより iPhone で本番 URL に ?tuner=1 を付ければ実機チューニング可能、
//     一般ユーザーには出ない
// ──────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import DesignTuner from './DesignTuner';

const STORAGE_KEY = 'houmon-app:design-tuner-enabled';

export default function DesignTunerGate() {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      setEnabled(true);
      return;
    }
    try {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('tuner');
      if (q === '1') {
        window.localStorage.setItem(STORAGE_KEY, '1');
        setEnabled(true);
        return;
      }
      if (q === '0') {
        window.localStorage.removeItem(STORAGE_KEY);
        setEnabled(false);
        return;
      }
      setEnabled(window.localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      setEnabled(false);
    }
  }, []);

  if (!enabled) return null;
  return <DesignTuner />;
}
