import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@mantle/platform", "@mantle/ui"],
};

export default nextConfig;
