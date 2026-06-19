#!/usr/bin/env node
/** Reparación inmediata de points en producción (misma lógica que repair_points.sql) */
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

const [predictions, results] = await Promise.all([
  fetchAll(admin, "predictions", "id,match_id,home_goals,away_goals,points"),
  fetchAll(admin, "results", "match_id,home_goals,away_goals"),
]);

const resultMap = new Map(results.map((r) => [r.match_id, r]));
const idsByPoints = new Map();
let mismatches = 0;

for (const p of predictions) {
  const r = resultMap.get(p.match_id);
  if (!r) continue;
  const next = expectedPoints(p.home_goals, p.away_goals, r.home_goals, r.away_goals);
  if (next === p.points) continue;
  mismatches += 1;
  const list = idsByPoints.get(next) ?? [];
  list.push(p.id);
  idsByPoints.set(next, list);
}

const now = new Date().toISOString();
let updated = 0;
for (const [points, ids] of idsByPoints) {
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    const { error } = await admin
      .from("predictions")
      .update({ points, points_updated_at: now })
      .in("id", chunk);
    if (error) throw new Error(error.message);
    updated += chunk.length;
  }
}

const { data: boca } = await admin
  .from("profiles")
  .select("id,username")
  .eq("username", "boca2000")
  .maybeSingle();

let bocaA3 = null;
if (boca?.id) {
  const { data } = await admin
    .from("predictions")
    .select("match_id,home_goals,away_goals,points")
    .eq("user_id", boca.id)
    .eq("match_id", "a-3")
    .maybeSingle();
  bocaA3 = data;
}

console.log(JSON.stringify({ mismatches, updated, boca2000_a3: bocaA3 }, null, 2));
