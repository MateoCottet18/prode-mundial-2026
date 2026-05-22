import path from "path";
import { fileURLToPath } from "url";

/** Directory containing package.json, next.config.ts, and .env.local */
export const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

export const ENV_LOCAL_PATH = path.join(PROJECT_ROOT, ".env.local");
