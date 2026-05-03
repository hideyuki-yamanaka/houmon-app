'use client';

// ──────────────────────────────────────────────────────────────
// ServiceWorkerRegistration
//
// /sw.js を Page 起動後に静かに register する。
// - 本番環境のみ有効 (NODE_ENV === 'production')
// - 既に登録済みなら再登録しない (Browser が差分検出して update してくれる)
// - 新しい SW が waiting 状態になったら、即時 activate を促す (skipWaiting)
// ──────────────────────────────────────────────────────────────

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    // 開発環境では無効化 (HMR との衝突防止)
    if (process.env.NODE_ENV !== 'production') return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        // 新しい SW が見つかったら、waiting に来たタイミングで skipWaiting を促す
        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing;
          if (!newSW) return;
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              // 既存ページがある & 新 SW が installed → 即時切替
              newSW.postMessage('SKIP_WAITING');
            }
          });
        });
      } catch (err) {
        console.warn('[SW] register failed:', err);
      }
    };

    // ページが落ち着いてから登録 (初期描画を邪魔しない)
    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  return null;
}
