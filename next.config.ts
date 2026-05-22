import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import { PROJECT_ROOT } from "./lib/project-root";

/** Load .env.local from prodemundial/, not from a parent folder that has another package-lock.json */
loadEnvConfig(PROJECT_ROOT);

const nextConfig: NextConfig = {
  turbopack: {
    root: PROJECT_ROOT,
  },
};

export default nextConfig;
