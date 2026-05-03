'use client';

// ──────────────────────────────────────────────────────────────
// InstallBanner — iOS Safari 限定 ホーム画面追加 案内バナー
//
// iOS Safari は beforeinstallprompt をサポートしないため、
// 「共有 → ホーム画面に追加」を案内するバナーを下に出す。
//
// 表示条件 (全部満たした時のみ):
//   - iOS Safari (iPhone/iPad)
//   - standalone モードで開いていない (まだ追加してない)
//   - localStorage に dismiss 履歴が無い
//
// 一度 dismiss したら localStorage に記憶して二度と出さない。
// ──────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'houmon-install-banner-dismissed';

function detectIOSSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    // iPad は iOS 13+ で Mac と同じ UA を返すので touch 数で判定
    (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  if (!isIOS) return false;
  // Chrome/Firefox on iOS は CriOS / FxiOS。これらは PWA 追加できないので除外
  const isSafari = !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isSafari;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS は navigator.standalone, 他は display-mode media query
  const navStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const mqStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches ?? false;
  return navStandalone || mqStandalone;
}

export default function InstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!detectIOSSafari()) return;
    if (isStandalone()) return;
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === '1') return;
    } catch {
      // localStorage 不可なら 表示はする
    }
    // 初期描画後 少し待ってから出す (画面ガタつき防止)
    const t = setTimeout(() => setShow(true), 800);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // 無視
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="ホーム画面に追加する案内"
      className="fixed left-2 right-2 z-[60] bottom-[calc(60px+env(safe-area-inset-bottom)+8px)] mx-auto max-w-[360px] rounded-2xl bg-white shadow-lg border border-black/5 px-4 py-3"
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 text-[13px] leading-snug text-gray-800">
          <div className="font-semibold mb-1">ホームに追加すると もっと使いやすいで</div>
          <div className="text-gray-600">
            下の <span aria-label="共有ボタン">共有ボタン</span> →
            「ホーム画面に追加」でアプリみたいに開けるよ
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="閉じる"
          className="shrink-0 -mr-1 -mt-1 p-1 text-gray-400 hover:text-gray-700 active:scale-95 transition"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
