#!/usr/bin/env npx tsx
/**
 * Verificación final pre-commit: 16avos, predicciones, árbol del bracket.
 * Uso: npx tsx scripts/finalKnockoutAudit.mts
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { officialRoundOf32Slots, type QualifierSlot } from "../data/knockout";
import {
  FIFA_MATCH_KICKOFF_UTC,
  KNOCKOUT_FIFA_MATCH_NUMBER,
} from "../data/knockoutKickoff";
import { formatThirdPoolPlaceholder } from "../data/thirdPlaceAnnexC";
import { matches as staticMatches } from "../data/matches";
import { buildBracket } from "../lib/bracket/buildBracket";
import { knockoutScheduleFromRows } from "../lib/knockoutSchedule";
import type { ResultsByMatch } from "../lib/prode";
import {
  getKnockoutMatches,
  qualifierSlotId,
  type QualificationOverrides,
} from "../lib/standings";
import type { MatchRow } from "../lib/supabase/types";

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

function slotDisplay(slot: QualifierSlot): string {
  if (slot.type === "third_pool") {
    return formatThirdPoolPlaceholder(slot.eligibleGroups);
  }
  return qualifierSlotId(slot);
}

function formatArg(utc: string | undefined): string {
  if (!utc) return "—";
  const d = new Date(utc);
  const date = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
  return `${date} ${time}`;
}

/** FIFA R16 feed pairs — winner of left 16avos id vs winner of right 16avos id */
const OFFICIAL_OCTAVOS_FEEDS: [string, string][] = [
  ["16avos-1", "16avos-2"], // M89
  ["16avos-3", "16avos-4"], // M90
  ["16avos-5", "16avos-6"], // M91
  ["16avos-7", "16avos-8"], // M92
  ["16avos-9", "16avos-10"], // M93
  ["16avos-11", "16avos-12"], // M94
  ["16avos-13", "16avos-14"], // M95
  ["16avos-15", "16avos-16"], // M96
];

const OFFICIAL_CUARTOS_FEEDS: [string, string][] = [
  ["octavos-1", "octavos-2"], // M97
  ["octavos-3", "octavos-4"], // M98
  ["octavos-5", "octavos-6"], // M99
  ["octavos-7", "octavos-8"], // M100
];

const OFFICIAL_SEMI_FEEDS: [string, string][] = [
  ["cuartos-1", "cuartos-2"], // M101
  ["cuartos-3", "cuartos-4"], // M102
];

loadEnvFile();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: resultRows, error: resErr } = await admin
  .from("results")
  .select("match_id,home_goals,away_goals");
if (resErr) {
  console.error(resErr.message);
  process.exit(1);
}

const results: ResultsByMatch = {};
for (const row of resultRows ?? []) {
  results[row.match_id] = { home: row.home_goals, away: row.away_goals };
}

const { data: koMatchRows } = await admin
  .from("matches")
  .select("*")
  .neq("stage", "grupos");
const knockoutSchedule = knockoutScheduleFromRows((koMatchRows ?? []) as MatchRow[]);

const { data: overrideRows } = await admin.from("qualification_overrides").select("slot,team_name");
const overrides: QualificationOverrides = {};
for (const row of overrideRows ?? []) {
  overrides[row.slot] = row.team_name;
}

const ko = getKnockoutMatches(results, staticMatches, overrides, knockoutSchedule);
const bracket = buildBracket(results, staticMatches, overrides, knockoutSchedule);

console.log("\n══════════════════════════════════════════════════════════════");
console.log("1) AUDIT 16AVOS — slots, equipos resueltos, FIFA, horarios");
console.log("══════════════════════════════════════════════════════════════\n");

console.log(
  "| id | home_slot | away_slot | equipos resueltos | FIFA# | kickoff_utc | hora ARG |",
);
console.log("| --- | --- | --- | --- | --- | --- | --- |");

for (let i = 0; i < 16; i++) {
  const id = `16avos-${i + 1}`;
  const [homeSlot, awaySlot] = officialRoundOf32Slots[i];
  const m = ko["16avos"][i];
  const fifa = KNOCKOUT_FIFA_MATCH_NUMBER[id];
  const utc = m.kickoffUtc ?? FIFA_MATCH_KICKOFF_UTC[fifa];
  console.log(
    `| ${id} | ${slotDisplay(homeSlot)} | ${slotDisplay(awaySlot)} | ${m.homeTeam} vs ${m.awayTeam} | M${fifa} | ${utc ?? "—"} | ${formatArg(utc)} |`,
  );
}

console.log("\n══════════════════════════════════════════════════════════════");
console.log("2) AUDIT PREDICCIONES 16avos (producción)");
console.log("══════════════════════════════════════════════════════════════\n");

const { data: predRows, error: predErr } = await admin
  .from("predictions")
  .select("match_id")
  .like("match_id", "16avos-%");

if (predErr) {
  console.error(predErr.message);
  process.exit(1);
}

const counts = new Map<string, number>();
for (const row of predRows ?? []) {
  counts.set(row.match_id, (counts.get(row.match_id) ?? 0) + 1);
}

const all16 = Array.from({ length: 16 }, (_, i) => `16avos-${i + 1}`);
console.log("match_id | count");
console.log("--- | ---");
let totalPreds = 0;
for (const id of all16) {
  const c = counts.get(id) ?? 0;
  totalPreds += c;
  console.log(`${id} | ${c}`);
}
console.log(`\nTotal predicciones 16avos: ${totalPreds}`);
const orphanIds = [...counts.keys()].filter((id) => !all16.includes(id));
if (orphanIds.length) {
  console.log("⚠ IDs huérfanos (no son 16avos-1..16):", orphanIds.join(", "));
} else {
  console.log("✓ Ningún match_id huérfano fuera de 16avos-1..16");
}

const missingIds = all16.filter((id) => !counts.has(id));
console.log(
  `Slots sin predicciones (${missingIds.length}/16): ${missingIds.length ? missingIds.join(", ") : "ninguno"}`,
);

console.log("\n══════════════════════════════════════════════════════════════");
console.log("3) VALIDACIÓN ÁRBOL DEL BRACKET (buildBracket / standings)");
console.log("══════════════════════════════════════════════════════════════\n");

function checkFeeds(
  label: string,
  feeds: [string, string][],
  round: { id: string; homeTeam: string; awayTeam: string }[],
) {
  let ok = true;
  for (let i = 0; i < feeds.length; i++) {
    const [left, right] = feeds[i];
    const match = round[i];
    const expectedHome = `Ganador ${left}`;
    const expectedAway = `Ganador ${right}`;
    const homeOk = match.homeTeam === expectedHome;
    const awayOk = match.awayTeam === expectedAway;
    const status = homeOk && awayOk ? "✓" : "✗";
    if (!homeOk || !awayOk) ok = false;
    console.log(
      `${status} ${label}-${i + 1}: ${match.homeTeam} vs ${match.awayTeam}  (esperado: ${expectedHome} vs ${expectedAway})`,
    );
  }
  return ok;
}

let treeOk = true;
treeOk = checkFeeds("octavos", OFFICIAL_OCTAVOS_FEEDS, ko.octavos) && treeOk;
treeOk = checkFeeds("cuartos", OFFICIAL_CUARTOS_FEEDS, ko.cuartos) && treeOk;
treeOk = checkFeeds("semifinal", OFFICIAL_SEMI_FEEDS, ko.semifinal) && treeOk;

const final = ko.final[0];
const finalHomeOk = final.homeTeam === "Ganador semifinal-1";
const finalAwayOk = final.awayTeam === "Ganador semifinal-2";
console.log(
  `${finalHomeOk && finalAwayOk ? "✓" : "✗"} final-1: ${final.homeTeam} vs ${final.awayTeam}  (esperado: Ganador semifinal-1 vs Ganador semifinal-2)`,
);
treeOk = treeOk && finalHomeOk && finalAwayOk;

const tp = ko.tercerPuesto;
const tpOk =
  tp.homeTeam === "Perdedor semifinal-1" && tp.awayTeam === "Perdedor semifinal-2";
console.log(
  `${tpOk ? "✓" : "✗"} tercer-puesto: ${tp.homeTeam} vs ${tp.awayTeam}`,
);
treeOk = treeOk && tpOk;

console.log("\n--- Bracket visual (izq / der) ---");
console.log("LEFT r32 ids:", bracket.left.r32.map((m) => m.id).join(", "));
console.log("RIGHT r32 ids:", bracket.right.r32.map((m) => m.id).join(", "));
console.log(
  "LEFT octavos feeds:",
  bracket.left.r32
    .map((m, i) => (i % 2 === 0 ? `[${m.id}+${bracket.left.r32[i + 1]?.id}]` : null))
    .filter(Boolean)
    .join(" "),
);

console.log("\n--- Cruces invertidos (home/away FIFA vs app) ---");
const FIFA_R32_HOME_AWAY: Record<number, [string, string]> = {
  73: ["2A", "2B"],
  74: ["1E", "3° A/B/C/D/F"],
  75: ["1F", "2C"],
  76: ["1C", "2F"],
  77: ["1I", "3° C/D/F/G/H"],
  78: ["2E", "2I"],
  79: ["1A", "3° C/E/F/H/I"],
  80: ["1L", "3° E/H/I/J/K"],
  81: ["1D", "3° B/E/F/I/J"],
  82: ["1G", "3° A/E/H/I/J"],
  83: ["2K", "2L"],
  84: ["1H", "2J"],
  85: ["1B", "3° E/F/G/I/J"],
  86: ["1J", "2H"],
  87: ["1K", "3° D/E/I/J/L"],
  88: ["2D", "2G"],
};

let inversionOk = true;
for (let i = 0; i < 16; i++) {
  const id = `16avos-${i + 1}`;
  const fifa = KNOCKOUT_FIFA_MATCH_NUMBER[id];
  const [expHome, expAway] = FIFA_R32_HOME_AWAY[fifa];
  const [homeSlot, awaySlot] = officialRoundOf32Slots[i];
  const actHome = slotDisplay(homeSlot);
  const actAway = slotDisplay(awaySlot);
  const ok = actHome === expHome && actAway === expAway;
  if (!ok) {
    inversionOk = false;
    console.log(`✗ ${id} (M${fifa}): esperado ${expHome} vs ${expAway}, tiene ${actHome} vs ${actAway}`);
  }
}
if (inversionOk) {
  console.log("✓ Los 16 cruces R32 coinciden con FIFA (home/away y slots, sin inversiones)");
}

console.log("\n══════════════════════════════════════════════════════════════");
console.log(
  inversionOk && treeOk
    ? "RESULTADO: LISTO PARA COMMIT — bracket y 16avos validados"
    : "RESULTADO: HAY ERRORES — revisar arriba",
);
console.log("══════════════════════════════════════════════════════════════\n");
