import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomTabBar from "../components/BottomTabBar";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="h-full bg-[var(--color-bg)]">
        <div className="h-full max-w-[1366px] mx-auto pb-[calc(60px+env(safe-area-inset-bottom))]">
          {children}
        </div>
        <BottomTabBar />
      </body>
    </html>
  );
}
