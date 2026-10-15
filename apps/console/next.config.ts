import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@mantle/db", "@mantle/platform", "@mantle/ui"],
  serverExternalPackages: ["pg"],
};

export default nextConfig;
