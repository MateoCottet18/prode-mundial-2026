#!/usr/bin/env node
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = readFileSync(".env.local", "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

function expectedPoints(predHome, predAway, resHome, resAway) {
  if (predHome === resHome && predAway === resAway) return 3;
  const pred =
    predHome > predAway ? "local" : predAway > predHome ? "visitante" : "empate";
  const res = resHome > resAway ? "local" : resAway > resHome ? "visitante" : "empate";
  return pred === res ? 1 : 0;
}

const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: profile } = await admin
  .from("profiles")
  .select("id,username,name")
  .eq("username", "boca2000")
  .maybeSingle();

const matchId = "a-3";
const [{ data: match }, { data: result }] = await Promise.all([
  admin.from("matches").select("id,home_team,away_team").eq("id", matchId).maybeSingle(),
  admin.from("results").select("*").eq("match_id", matchId).maybeSingle(),
]);

let prediction = null;
if (profile?.id) {
  const { data } = await admin
    .from("predictions")
    .select("*")
    .eq("user_id", profile.id)
    .eq("match_id", matchId)
    .maybeSingle();
  prediction = data;
}

const exp =
  prediction && result
    ? expectedPoints(
        prediction.home_goals,
        prediction.away_goals,
        result.home_goals,
        result.away_goals,
      )
    : null;

console.log(
  JSON.stringify(
    {
      profile,
      match,
      result,
      prediction,
      expected_points: exp,
      diff: prediction && exp !== null ? exp - (prediction.points ?? 0) : null,
    },
    null,
    2,
  ),
);

const { data: allWrong } = await admin.from("predictions").select("id,user_id,match_id,home_goals,away_goals,points");
const { data: allResults } = await admin.from("results").select("match_id,home_goals,away_goals");
const resultMap = new Map((allResults ?? []).map((r) => [r.match_id, r]));

const mismatches = [];
for (const p of allWrong ?? []) {
  const r = resultMap.get(p.match_id);
  if (!r) continue;
  const expPts = expectedPoints(p.home_goals, p.away_goals, r.home_goals, r.away_goals);
  if (expPts !== (p.points ?? 0)) {
    mismatches.push({
      match_id: p.match_id,
      user_id: p.user_id,
      prediction: `${p.home_goals}-${p.away_goals}`,
      result: `${r.home_goals}-${r.away_goals}`,
      points: p.points,
      expected: expPts,
    });
  }
}

console.log("\nMISMATCHES_COUNT", mismatches.length);
if (mismatches.length) {
  console.log(JSON.stringify(mismatches.slice(0, 20), null, 2));
}
