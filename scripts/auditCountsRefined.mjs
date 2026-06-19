#!/usr/bin/env node
/**
 * Conteos de auditoría — foco en EDICIÓN tardía de marcador.
 * node scripts/auditCountsRefined.mjs
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

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

let { data: preds, error: predError } = await admin
  .from("predictions")
  .select("id,match_id,created_at,updated_at,points_updated_at");

if (predError?.message?.includes("points_updated_at")) {
  ({ data: preds, error: predError } = await admin
    .from("predictions")
    .select("id,match_id,created_at,updated_at"));
}

if (predError) {
  console.error(predError.message);
  process.exit(1);
}

const { data: matches } = await admin.from("matches").select("id,kickoff_argentina");
const matchById = new Map((matches ?? []).map((m) => [m.id, m]));

let legacyUpdatedAfterKickoff = 0;
let historicSuspects = 0;

for (const p of preds ?? []) {
  const m = matchById.get(p.match_id);
  if (!m?.kickoff_argentina) continue;
  const ko = new Date(m.kickoff_argentina);
  const created = new Date(p.created_at);
  const updated = new Date(p.updated_at);
  if (updated >= ko) legacyUpdatedAfterKickoff++;
  if (created < ko && updated >= ko && updated > created) historicSuspects++;
}

let realLateEdits = null;
const { data: auditRows, error: auditError } = await admin
  .from("prediction_audit_log")
  .select("id,prediction_id,match_id,changed_at,old_home_goals,old_away_goals,new_home_goals,new_away_goals");

if (!auditError && auditRows) {
  const predById = new Map((preds ?? []).map((p) => [p.id, p]));
  realLateEdits = 0;
  for (const row of auditRows) {
    const m = matchById.get(row.match_id);
    const p = predById.get(row.prediction_id);
    if (!m?.kickoff_argentina || !p) continue;
    const ko = new Date(m.kickoff_argentina);
    const created = new Date(p.created_at);
    const changed = new Date(row.changed_at);
    const scoreChanged =
      row.old_home_goals !== row.new_home_goals ||
      row.old_away_goals !== row.new_away_goals;
    if (created < ko && changed >= ko && scoreChanged) realLateEdits++;
  }
}

console.log(
  JSON.stringify(
    {
      pasado_NO_prueba_final: {
        filas_updated_at_despues_kickoff: legacyUpdatedAfterKickoff,
        sospechosos_historicos_posible_edicion_o_recalc: historicSuspects,
        nota: "Estas cifras NO prueban edición tardía real (updated_at incluía recálculo de points)",
      },
      desde_ahora_audit_log: auditError
        ? { estado: "prediction_audit_log no disponible — ejecutar prediction_audit.sql" }
        : { ediciones_tardias_reales: realLateEdits },
    },
    null,
    2,
  ),
);
