#!/usr/bin/env node
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const env = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
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

async function fetchAll(admin, table, select) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    const { data, error } = await admin.from(table).select(select).range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const [predictions, results, profiles] = await Promise.all([
  fetchAll(admin, "predictions", "id,user_id,match_id,home_goals,away_goals,points"),
  fetchAll(admin, "results", "match_id,home_goals,away_goals"),
  fetchAll(admin, "profiles", "id,username"),
]);

const resultMap = new Map(results.map((r) => [r.match_id, r]));
const userMap = new Map(profiles.map((p) => [p.id, p.username]));

const mismatches = [];
for (const p of predictions) {
  const r = resultMap.get(p.match_id);
  if (!r) continue;
  const exp = expectedPoints(p.home_goals, p.away_goals, r.home_goals, r.away_goals);
  if (exp !== p.points) {
    mismatches.push({
      username: userMap.get(p.user_id) ?? p.user_id,
      match_id: p.match_id,
      prediction: `${p.home_goals}-${p.away_goals}`,
      result: `${r.home_goals}-${r.away_goals}`,
      points: p.points,
      expected: exp,
    });
  }
}

const boca = mismatches.filter((m) => m.username === "boca2000");
const byMatch = new Map();
for (const m of mismatches) {
  byMatch.set(m.match_id, (byMatch.get(m.match_id) ?? 0) + 1);
}

console.log(
  JSON.stringify(
    {
      predictions: predictions.length,
      results: results.length,
      mismatches: mismatches.length,
      byMatch: Object.fromEntries([...byMatch.entries()].sort()),
      boca2000: boca,
    },
    null,
    2,
  ),
);
