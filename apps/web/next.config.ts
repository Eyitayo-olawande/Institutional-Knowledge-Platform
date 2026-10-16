import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@mantle/db", "@mantle/platform", "@mantle/ui"],
  serverExternalPackages: ["pg"],
  // Library uploads go through a server action; the default 1 MB limit
  // would refuse most files. Up to 10 files of 25 MB each per upload.
  experimental: { serverActions: { bodySizeLimit: "251mb" } },
};

export default nextConfig;
