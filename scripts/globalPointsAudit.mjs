#!/usr/bin/env node
/**
 * Auditoría global de puntos + reparación opcional + verificación ranking.
 * Uso:
 *   node scripts/globalPointsAudit.mjs           # solo auditar
 *   node scripts/globalPointsAudit.mjs --repair  # auditar + corregir + re-auditar
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const REPAIR = process.argv.includes("--repair");

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
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function audit(admin, profiles, results) {
  const predictions = await fetchAll(
    admin,
    "predictions",
    "id,user_id,match_id,home_goals,away_goals,points",
  );
  const resultMap = new Map(results.map((r) => [r.match_id, r]));
  const userMap = new Map(profiles.map((p) => [p.id, p.username]));
  const matchIdsWithResult = new Set(results.map((r) => r.match_id));

  const mismatches = [];
  let auditedWithResult = 0;

  for (const p of predictions) {
    const r = resultMap.get(p.match_id);
    if (!r) continue;
    auditedWithResult += 1;
    const exp = expectedPoints(p.home_goals, p.away_goals, r.home_goals, r.away_goals);
    if (exp !== p.points) {
      mismatches.push({
        id: p.id,
        username: userMap.get(p.user_id) ?? p.user_id,
        match_id: p.match_id,
        prediction: `${p.home_goals}-${p.away_goals}`,
        result: `${r.home_goals}-${r.away_goals}`,
        points_actual: p.points,
        points_expected: exp,
        diff: exp - p.points,
      });
    }
  }

  const byMatch = {};
  for (const m of mismatches) {
    byMatch[m.match_id] = (byMatch[m.match_id] ?? 0) + 1;
  }

  return {
    totalPredictions: predictions.length,
    totalResults: results.length,
    matchIdsWithResult: [...matchIdsWithResult].sort(),
    auditedWithResult,
    mismatches,
    byMatch,
  };
}

async function repair(admin, mismatches) {
  const idsByPoints = new Map();
  for (const m of mismatches) {
    const list = idsByPoints.get(m.points_expected) ?? [];
    list.push(m.id);
    idsByPoints.set(m.points_expected, list);
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
  return updated;
}

async function rankingTop20(admin) {
  const { data, error } = await admin
    .from("profiles")
    .select("username,name,role,prediction_aggregates(points,exact_count,correct_outcomes_count,saved_count)")
    .eq("role", "participante")
    .order("prediction_aggregates(points)", { ascending: false })
    .limit(20);
  if (error) {
    // fallback manual join via aggregates view
    const profiles = await fetchAll(admin, "profiles", "id,username,name,role");
    const aggregates = await fetchAll(
      admin,
      "prediction_aggregates",
      "user_id,points,exact_count,correct_outcomes_count,saved_count",
    );
    const aggMap = new Map(aggregates.map((a) => [a.user_id, a]));
    return profiles
      .filter((p) => p.role === "participante")
      .map((p) => ({
        username: p.username,
        name: p.name,
        points: aggMap.get(p.id)?.points ?? 0,
        exactos: aggMap.get(p.id)?.exact_count ?? 0,
        aciertos: aggMap.get(p.id)?.correct_outcomes_count ?? 0,
        guardadas: aggMap.get(p.id)?.saved_count ?? 0,
      }))
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.exactos - a.exactos ||
          b.aciertos - a.aciertos ||
          a.username.localeCompare(b.username, "es"),
      )
      .slice(0, 20);
  }
  return data;
}

async function bocaA3(admin) {
  const { data: pr } = await admin
    .from("profiles")
    .select("id,username")
    .eq("username", "boca2000")
    .maybeSingle();
  if (!pr?.id) return null;
  const [{ data: pred }, { data: res }, { data: agg }] = await Promise.all([
    admin
      .from("predictions")
      .select("match_id,home_goals,away_goals,points")
      .eq("user_id", pr.id)
      .eq("match_id", "a-3")
      .maybeSingle(),
    admin.from("results").select("home_goals,away_goals").eq("match_id", "a-3").maybeSingle(),
    admin.from("prediction_aggregates").select("*").eq("user_id", pr.id).maybeSingle(),
  ]);
  return { username: pr.username, prediction: pred, result: res, ranking: agg };
}

const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const [profiles, results] = await Promise.all([
  fetchAll(admin, "profiles", "id,username,name,role"),
  fetchAll(admin, "results", "match_id,home_goals,away_goals"),
]);

let report = await audit(admin, profiles, results);
let repaired = 0;

if (REPAIR && report.mismatches.length > 0) {
  repaired = await repair(admin, report.mismatches);
  report = await audit(admin, profiles, results);
}

const [top20, boca] = await Promise.all([rankingTop20(admin), bocaA3(admin)]);

const adminsInTop = top20.filter((r) => {
  const p = profiles.find((x) => x.username === r.username);
  return p?.role === "admin";
});

console.log(
  JSON.stringify(
    {
      mode: REPAIR ? "audit+repair" : "audit-only",
      summary: {
        total_predictions: report.totalPredictions,
        total_results: report.totalResults,
        predictions_with_loaded_result: report.auditedWithResult,
        inconsistencies_found: report.mismatches.length,
        corrected_this_run: repaired,
        matches_with_errors: report.byMatch,
      },
      examples: report.mismatches.slice(0, 10),
      boca2000_a3: boca,
      ranking_top20: top20,
      admin_in_top20: adminsInTop.length,
      final_status: report.mismatches.length === 0 ? "OK_ZERO_INCONSISTENCIES" : "ERRORS_REMAIN",
    },
    null,
    2,
  ),
);

process.exit(report.mismatches.length === 0 ? 0 : 1);
