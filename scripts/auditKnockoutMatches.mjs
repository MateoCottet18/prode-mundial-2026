#!/usr/bin/env node
/** Audita eliminatorias: DB + slots generados en cliente */
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

const ROUND_LABEL = {
  "16avos": "R32",
  octavos: "R16",
  cuartos: "QF",
  semifinal: "SF",
  final: "FINAL",
};

const EXPECTED = { "16avos": 16, octavos: 8, cuartos: 4, semifinal: 2, final: 2 };
const EXPECTED_TOTAL = 32; // incluye final + tercer puesto (ambos stage=final en app)

function clientKnockoutIds() {
  const ids = [];
  for (let i = 1; i <= 16; i++) ids.push({ id: `16avos-${i}`, stage: "16avos", round: "R32" });
  for (let i = 1; i <= 8; i++) ids.push({ id: `octavos-${i}`, stage: "octavos", round: "R16" });
  for (let i = 1; i <= 4; i++) ids.push({ id: `cuartos-${i}`, stage: "cuartos", round: "QF" });
  for (let i = 1; i <= 2; i++) ids.push({ id: `semifinal-${i}`, stage: "semifinal", round: "SF" });
  ids.push({ id: "final-1", stage: "final", round: "FINAL" });
  ids.push({ id: "tercer-puesto", stage: "final", round: "3P" });
  return ids;
}

async function fetchAll(admin, table, select, filter) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    let q = admin.from(table).select(select);
    if (filter) q = filter(q);
    const { data, error } = await q.range(from, from + pageSize - 1);
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

const allMatches = await fetchAll(admin, "matches", "*");
const knockoutDb = allMatches.filter((m) => m.stage !== "grupos");

const byStageDb = {};
for (const m of knockoutDb) {
  byStageDb[m.stage] = (byStageDb[m.stage] ?? 0) + 1;
}

const clientIds = clientKnockoutIds();
const dbIdSet = new Set(allMatches.map((m) => m.id));

const missingInDb = clientIds.filter((c) => !dbIdSet.has(c.id));

const [predKo, resKo] = await Promise.all([
  fetchAll(admin, "predictions", "match_id", (q) =>
    q.or(
      "match_id.like.16avos-%,match_id.like.octavos-%,match_id.like.cuartos-%,match_id.like.semifinal-%,match_id.like.final-%,match_id.eq.tercer-puesto",
    ),
  ),
  fetchAll(admin, "results", "match_id", (q) =>
    q.or(
      "match_id.like.16avos-%,match_id.like.octavos-%,match_id.like.cuartos-%,match_id.like.semifinal-%,match_id.like.final-%,match_id.eq.tercer-puesto",
    ),
  ),
]);

const predKoIds = [...new Set(predKo.map((p) => p.match_id))].sort();
const resKoIds = [...new Set(resKo.map((r) => r.match_id))].sort();

const missingKickoffDb = knockoutDb
  .filter((m) => m.kickoff_utc == null)
  .map((m) => ({
    id: m.id,
    round: ROUND_LABEL[m.stage] ?? m.stage,
    home_team: m.home_team,
    away_team: m.away_team,
  }));

console.log(
  JSON.stringify(
    {
      public_matches: {
        total: allMatches.length,
        grupos: allMatches.length - knockoutDb.length,
        knockout: knockoutDb.length,
        by_stage: byStageDb,
        expected_by_stage: EXPECTED,
        expected_total_knockout: EXPECTED_TOTAL,
        counts_ok: Object.entries(EXPECTED).every(([s, n]) => (byStageDb[s] ?? 0) === n),
        missing_kickoff_utc: missingKickoffDb,
      },
      client_generated_slots: {
        total: clientIds.length,
        missing_from_db: missingInDb.length,
        ids_not_in_db: missingInDb.map((x) => x.id),
      },
      activity_without_db_rows: {
        predictions_match_ids: predKoIds,
        results_match_ids: resKoIds,
      },
      verdict:
        knockoutDb.length === 0
          ? "CRITICO: 0 eliminatorias en public.matches. Horarios KO solo en cliente con A definir / sin kickoff_utc."
          : missingKickoffDb.length > 0
            ? `FALTA kickoff_utc en ${missingKickoffDb.length} filas KO`
            : "OK",
    },
    null,
    2,
  ),
);
