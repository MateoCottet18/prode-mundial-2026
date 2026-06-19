#!/usr/bin/env node
/**
 * Genera supabase/kickoff_utc_repair.sql y scripts/kickoff-audit-report.json
 */
import fs from "node:fs";
import {
  FIFA_GROUP_KICKOFF_UTC,
  formatKickoffArgentinaDisplay,
  formatKickoffArgentinaFromUtc,
} from "../data/kickoffUtc.ts";
import { matches } from "../data/matches.ts";

function diffHours(oldMs, newMs) {
  return Math.round(((oldMs - newMs) / 3_600_000) * 10) / 10;
}

const lines = [];
const audit = [];

lines.push(`-- =============================================================================
-- Prode Mundial 2026 — kickoff_utc_repair.sql
--
-- Fuente de verdad del cierre: kickoff_utc (horario oficial FIFA en UTC).
-- kickoff_argentina = mismo instante (compat legacy).
-- kickoff_argentina_display = etiqueta legible hora Argentina.
--
-- Idempotente. Ejecutar en Supabase SQL Editor.
-- Generado: ${new Date().toISOString()}
-- =============================================================================

alter table public.matches
  add column if not exists kickoff_utc timestamptz;

alter table public.matches
  add column if not exists kickoff_argentina_display text;

create index if not exists matches_kickoff_utc_idx
  on public.matches (kickoff_utc)
  where kickoff_utc is not null;

comment on column public.matches.kickoff_utc is
  'Kickoff oficial FIFA (UTC). Fuente de verdad para cierre de predicciones.';

comment on column public.matches.kickoff_argentina_display is
  'Etiqueta legible en hora Argentina (solo UI).';

-- ---------------------------------------------------------------------------
-- Actualización de los 72 partidos de grupos
-- ---------------------------------------------------------------------------
`);

for (const match of matches) {
  const utc = FIFA_GROUP_KICKOFF_UTC[match.id];
  if (!utc) {
    console.error("Falta kickoff UTC para", match.id);
    process.exit(1);
  }
  const display = formatKickoffArgentinaDisplay(utc);
  const old = match.kickoffArgentina ? new Date(match.kickoffArgentina) : null;
  const neu = new Date(utc);
  const oldArt = match.kickoffArgentina
    ? formatKickoffArgentinaFromUtc(match.kickoffArgentina)
    : null;
  const newArt = formatKickoffArgentinaFromUtc(utc);
  const delta = old && !Number.isNaN(old.getTime()) ? diffHours(old.getTime(), neu.getTime()) : null;

  audit.push({
    id: match.id,
    teams: `${match.homeTeam} vs ${match.awayTeam}`,
    kickoff_argentina_actual: match.kickoffArgentina ?? null,
    hora_argentina_actual: oldArt,
    kickoff_utc_correcto: utc,
    hora_argentina_correcta: newArt,
    diferencia_horas: delta,
    cambiado: delta !== 0,
  });

  lines.push(
    `UPDATE public.matches SET`,
    `  kickoff_utc = '${utc}'::timestamptz,`,
    `  kickoff_argentina = '${utc}'::timestamptz,`,
    `  kickoff_argentina_display = '${display.replace(/'/g, "''")}'`,
    `WHERE id = '${match.id}'; -- ${match.homeTeam} vs ${match.awayTeam}`,
    ``,
  );
}

lines.push(`notify pgrst, 'reload schema';`);
lines.push("");

fs.writeFileSync("supabase/kickoff_utc_repair.sql", lines.join("\n"));

const changed = audit.filter((r) => r.cambiado);
fs.writeFileSync(
  "scripts/kickoff-audit-report.json",
  JSON.stringify({ generatedAt: new Date().toISOString(), audit, changed }, null, 2),
);

console.log(JSON.stringify({ total: audit.length, changed: changed.length, b4: audit.find((r) => r.id === "b-4") }, null, 2));
