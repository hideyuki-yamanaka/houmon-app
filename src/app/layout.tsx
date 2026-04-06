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
        <div className="h-full max-w-[920px] mx-auto pb-[calc(60px+env(safe-area-inset-bottom))]">
          {children}
        </div>
        <BottomTabBar />
      </body>
    </html>
  );
}
