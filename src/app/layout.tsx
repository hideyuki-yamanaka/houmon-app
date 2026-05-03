import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthShell from "../components/AuthShell";
import DesignTuner from "../components/DesignTuner";
import ServiceWorkerRegistration from "../components/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "家庭訪問アプリ",
  description: "家庭訪問の記録・管理ツール",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "家庭訪問",
  },
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

// ─── iOS スプラッシュ画像 (apple-touch-startup-image) ─────────────
// iPhone は media query で 物理解像度 + DPR + 向きを判定する。
// 公式の iPhone 主要解像度 (Portrait のみ。Landscape は iOS が自動回転処理)。
// 画像生成は scripts/generate-splash.sh で行う。デザイン差し替えも同スクリプトで再生成。
const APPLE_SPLASH = [
  // [width, height, device-width, device-height, dpr]
  { w: 640, h: 1136, dw: 320, dh: 568, dpr: 2 }, // iPhone SE 1st
  { w: 750, h: 1334, dw: 375, dh: 667, dpr: 2 }, // iPhone 6/7/8/SE2/SE3
  { w: 828, h: 1792, dw: 414, dh: 896, dpr: 2 }, // iPhone XR / 11
  { w: 1125, h: 2436, dw: 375, dh: 812, dpr: 3 }, // iPhone X/XS/11 Pro
  { w: 1170, h: 2532, dw: 390, dh: 844, dpr: 3 }, // iPhone 12/13/14
  { w: 1179, h: 2556, dw: 393, dh: 852, dpr: 3 }, // iPhone 14 Pro/15/15 Pro
  { w: 1242, h: 2208, dw: 414, dh: 736, dpr: 3 }, // iPhone 6+/7+/8+
  { w: 1242, h: 2688, dw: 414, dh: 896, dpr: 3 }, // iPhone XS Max/11 Pro Max
  { w: 1284, h: 2778, dw: 428, dh: 926, dpr: 3 }, // iPhone 12/13/14 Pro Max
  { w: 1290, h: 2796, dw: 430, dh: 932, dpr: 3 }, // iPhone 14/15 Pro Max
] as const;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <head>
        {APPLE_SPLASH.map((s) => (
          <link
            key={`${s.w}x${s.h}`}
            rel="apple-touch-startup-image"
            media={`(device-width: ${s.dw}px) and (device-height: ${s.dh}px) and (-webkit-device-pixel-ratio: ${s.dpr}) and (orientation: portrait)`}
            href={`/splash/apple-splash-${s.w}x${s.h}.png`}
          />
        ))}
      </head>
      <body className="h-full bg-[var(--color-bg)]">
        <div className="h-full max-w-[1366px] mx-auto pb-[calc(60px+env(safe-area-inset-bottom))] relative">
          <AuthShell>{children}</AuthShell>
        </div>
        {/* 開発環境専用のデザイン調整パネル。本番ビルドでは描画されない */}
        <DesignTuner />
        {/* PWA: Service Worker 登録 (本番ビルドのみ動作) */}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
