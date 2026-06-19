#!/usr/bin/env node
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

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const { data: preds } = await admin.from("predictions").select("id,user_id,match_id,home_goals,away_goals,points,updated_at");
const { data: matches } = await admin.from("matches").select("id,kickoff_argentina");
const { data: results } = await admin.from("results").select("match_id,home_goals,away_goals");

const matchById = new Map((matches ?? []).map((m) => [m.id, m]));
const resultByMatch = new Map((results ?? []).map((r) => [r.match_id, r]));

function score(ph, pa, rh, ra) {
  if (ph === rh && pa === ra) return 3;
  return Math.sign(ph - pa) === Math.sign(rh - ra) ? 1 : 0;
}

let late = 0;
for (const p of preds ?? []) {
  const m = matchById.get(p.match_id);
  if (!m?.kickoff_argentina) continue;
  if (new Date(p.updated_at) >= new Date(m.kickoff_argentina)) late++;
}

let wrong = 0;
for (const p of preds ?? []) {
  const r = resultByMatch.get(p.match_id);
  if (!r) continue;
  const exp = score(p.home_goals, p.away_goals, r.home_goals, r.away_goals);
  if ((p.points ?? -1) !== exp) wrong++;
}

const badMatches = new Set();
for (const p of preds ?? []) {
  const r = resultByMatch.get(p.match_id);
  if (!r) continue;
  const exp = score(p.home_goals, p.away_goals, r.home_goals, r.away_goals);
  if (p.points == null || p.points !== exp) badMatches.add(p.match_id);
}

console.log(
  JSON.stringify(
    {
      query2_late_predictions: late,
      query3_wrong_points: wrong,
      query4_matches_without_recalc: badMatches.size,
    },
    null,
    2,
  ),
);
