import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const { data } = await admin.from("predictions").select("match_id");
const counts = {};
for (const r of data ?? []) {
  if (
    !r.match_id.includes("avos") &&
    !r.match_id.includes("cuartos") &&
    !r.match_id.includes("semifinal") &&
    r.match_id !== "final-1" &&
    r.match_id !== "tercer-puesto"
  ) {
    continue;
  }
  counts[r.match_id] = (counts[r.match_id] ?? 0) + 1;
}

console.log("Todas las predicciones KO en producción:\nmatch_id | count\n--- | ---");
for (const k of Object.keys(counts).sort()) {
  console.log(`${k} | ${counts[k]}`);
}
console.log(`\nTotal KO: ${Object.values(counts).reduce((a, b) => a + b, 0)}`);
