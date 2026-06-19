#!/usr/bin/env node
/**
 * Diagnóstico de predicciones y puntos (producción).
 *
 * Uso:
 *   node scripts/auditPredictions.mjs
 *
 * Requiere en .env.local (o variables de entorno):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function scorePrediction(predHome, predAway, resHome, resAway) {
  if (predHome === resHome && predAway === resAway) {
    return 3;
  }
  const predSign = Math.sign(predHome - predAway);
  const resSign = Math.sign(resHome - resAway);
  return predSign === resSign ? 1 : 0;
}

const now = new Date();

console.log("\n=== 1) Partidos abiertos/cerrados ===\n");
const { data: matches, error: matchError } = await admin
  .from("matches")
  .select("id,home_team,away_team,kickoff_argentina")
  .order("kickoff_argentina", { ascending: true, nullsFirst: false });

if (matchError) {
  console.error(matchError.message);
  process.exit(1);
}

const { data: results } = await admin.from("results").select("match_id");
const resultSet = new Set((results ?? []).map((r) => r.match_id));

for (const m of matches ?? []) {
  const hasResult = resultSet.has(m.id);
  let locked = false;
  let reason = "open";
  if (hasResult) {
    locked = true;
    reason = "result_loaded";
  } else if (!m.kickoff_argentina) {
    locked = true;
    reason = "schedule_unconfirmed";
  } else if (now >= new Date(m.kickoff_argentina)) {
    locked = true;
    reason = "kickoff_passed";
  }
  console.log(
    [
      m.id,
      `${m.home_team} vs ${m.away_team}`,
      `kickoff=${m.kickoff_argentina ?? "NULL"}`,
      `locked=${locked}`,
      reason,
    ].join(" | "),
  );
}

console.log("\n=== 2) Predicciones modificadas tarde (updated_at >= kickoff) ===\n");
const { data: predictions } = await admin
  .from("predictions")
  .select("id,user_id,match_id,home_goals,away_goals,points,updated_at");

const matchById = new Map((matches ?? []).map((m) => [m.id, m]));
let lateCount = 0;
for (const p of predictions ?? []) {
  const m = matchById.get(p.match_id);
  if (!m?.kickoff_argentina) continue;
  if (new Date(p.updated_at) >= new Date(m.kickoff_argentina)) {
    lateCount += 1;
    console.log(
      `${p.user_id} | ${p.match_id} | updated=${p.updated_at} | kickoff=${m.kickoff_argentina}`,
    );
  }
}
if (lateCount === 0) console.log("(ninguna)");

console.log("\n=== 3) Puntos incorrectos vs regla 3/1/0 ===\n");
const { data: resultRows } = await admin.from("results").select("match_id,home_goals,away_goals");
const resultByMatch = new Map((resultRows ?? []).map((r) => [r.match_id, r]));
let wrongPoints = 0;
for (const p of predictions ?? []) {
  const r = resultByMatch.get(p.match_id);
  if (!r) continue;
  const expected = scorePrediction(p.home_goals, p.away_goals, r.home_goals, r.away_goals);
  if ((p.points ?? -1) !== expected) {
    wrongPoints += 1;
    console.log(
      `${p.match_id} | user=${p.user_id} | stored=${p.points} expected=${expected}`,
    );
  }
}
if (wrongPoints === 0) console.log("(ninguna)");

console.log("\n=== 4) Partidos con resultado y predicciones sin recalcular ===\n");
const byMatch = new Map();
for (const p of predictions ?? []) {
  if (!resultByMatch.has(p.match_id)) continue;
  const r = resultByMatch.get(p.match_id);
  const expected = scorePrediction(p.home_goals, p.away_goals, r.home_goals, r.away_goals);
  if ((p.points ?? -1) !== expected) {
    const entry = byMatch.get(p.match_id) ?? { wrong: 0, nulls: 0 };
    if (p.points == null) entry.nulls += 1;
    else entry.wrong += 1;
    byMatch.set(p.match_id, entry);
  }
}
if (byMatch.size === 0) {
  console.log("(ninguno)");
} else {
  for (const [matchId, stats] of byMatch) {
    console.log(`${matchId} | wrong=${stats.wrong} null=${stats.nulls}`);
  }
}

console.log("\nDone.\n");
