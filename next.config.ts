import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/houmon-app',
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
