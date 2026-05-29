import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDirectory = path.dirname(fileURLToPath(import.meta.url));
loadEnvConfig(path.resolve(appDirectory, "../.."));

const nextConfig: NextConfig = {
  transpilePackages: ["@orchard/database", "@orchard/shared", "@orchard/n8n-client"]
};

export default nextConfig;
