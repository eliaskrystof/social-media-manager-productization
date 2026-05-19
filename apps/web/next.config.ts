import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@orchard/database", "@orchard/shared", "@orchard/n8n-client"]
};

export default nextConfig;
