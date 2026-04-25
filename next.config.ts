import type { NextConfig } from "next";

// 🔴 重要: output: 'export' を入れない
//   - GH Pages 時代の名残で 'export' が指定されていたが、Vercel 一本化(2026-04-23)
//     後はSSR/ISR を使えないと困るので外した。
//   - 'export' のままだと dynamicParams: true が使えず、新規追加した訪問ログ等が
//     ビルド後に 404 になる致命バグが発生する(2026-04-25 修正)。
const nextConfig: NextConfig = {
  basePath: process.env.BASE_PATH || '',
  images: { unoptimized: true },
};

export default nextConfig;
