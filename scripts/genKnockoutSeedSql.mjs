/**
 * Genera supabase/knockout_matches_seed.sql desde data/knockoutKickoff.ts
 * Ejecutar: node scripts/genKnockoutSeedSql.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ARG_TZ = "America/Argentina/Buenos_Aires";

const OFFICIAL_R32 = [
  [["Grupo A", 1], ["Grupo B", 2]],
  [["Grupo C", 1], ["third", 1]],
  [["Grupo E", 1], ["Grupo F", 2]],
  [["Grupo G", 1], ["third", 2]],
  [["Grupo B", 1], ["Grupo A", 2]],
  [["Grupo D", 1], ["third", 3]],
  [["Grupo F", 1], ["Grupo E", 2]],
  [["Grupo H", 1], ["third", 4]],
  [["Grupo I", 1], ["Grupo J", 2]],
  [["Grupo K", 1], ["third", 5]],
  [["Grupo J", 1], ["Grupo I", 2]],
  [["Grupo L", 1], ["third", 6]],
  [["Grupo C", 2], ["third", 7]],
  [["Grupo D", 2], ["Grupo G", 2]],
  [["Grupo H", 2], ["third", 8]],
  [["Grupo K", 2], ["Grupo L", 2]],
];

function slotLabel(slot) {
  if (slot[0] === "third") return `BEST_THIRD_${slot[1]}`;
  const letter = slot[0].replace("Grupo ", "");
  return `${slot[1]}${letter}`;
}

function winnerPlaceholder(prevStage, index) {
  return `Ganador ${prevStage}-${index}`;
}

function buildPlaceholders() {
  const map = {};
  OFFICIAL_R32.forEach((pair, index) => {
    const id = `16avos-${index + 1}`;
    map[id] = { home: slotLabel(pair[0]), away: slotLabel(pair[1]) };
  });
  for (let i = 1; i <= 8; i++) {
    map[`octavos-${i}`] = {
      home: winnerPlaceholder("16avos", i * 2 - 1),
      away: winnerPlaceholder("16avos", i * 2),
    };
  }
  for (let i = 1; i <= 4; i++) {
    map[`cuartos-${i}`] = {
      home: winnerPlaceholder("octavos", i * 2 - 1),
      away: winnerPlaceholder("octavos", i * 2),
    };
  }
  for (let i = 1; i <= 2; i++) {
    map[`semifinal-${i}`] = {
      home: winnerPlaceholder("cuartos", i * 2 - 1),
      away: winnerPlaceholder("cuartos", i * 2),
    };
  }
  map["final-1"] = {
    home: winnerPlaceholder("semifinal", 1),
    away: winnerPlaceholder("semifinal", 2),
  };
  map["tercer-puesto"] = {
    home: "Perdedor semifinal-1",
    away: "Perdedor semifinal-2",
  };
  return map;
}

function parseFifaById(src) {
  const map = {};
  const re = /"([^"]+)":\s*(\d+)/g;
  const block = src.match(
    /export const KNOCKOUT_FIFA_MATCH_NUMBER[\s\S]*?=\s*\{([\s\S]*?)\n\};/,
  );
  if (!block) throw new Error("KNOCKOUT_FIFA_MATCH_NUMBER no encontrado");
  let m;
  while ((m = re.exec(block[1]))) {
    if (m[1].includes("-") || m[1] === "tercer-puesto") map[m[1]] = Number(m[2]);
  }
  return map;
}

function parseKickoffByFifa(src) {
  const map = {};
  const block = src.match(/export const FIFA_MATCH_KICKOFF_UTC[\s\S]*?=\s*\{([\s\S]*?)\n\};/);
  if (!block) throw new Error("FIFA_MATCH_KICKOFF_UTC no encontrado");
  const re = /(\d+):\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(block[1]))) map[Number(m[1])] = m[2];
  return map;
}

function parseVenueByFifa(src) {
  const map = {};
  const re = /(\d+):\s*\{\s*venue:\s*"([^"]+)",\s*city:\s*"([^"]+)"\s*\}/g;
  const block = src.match(/export const FIFA_MATCH_VENUE[\s\S]*?=\s*\{([\s\S]*?)\n\};/);
  if (!block) throw new Error("FIFA_MATCH_VENUE no encontrado");
  let m;
  while ((m = re.exec(block[1]))) {
    map[Number(m[1])] = { venue: m[2], city: m[3] };
  }
  return map;
}

function sqlEscape(value) {
  return String(value).replace(/'/g, "''");
}

function formatArgentinaTime(utcIso) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ARG_TZ,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(utcIso));
}

function formatArgentinaDate(utcIso) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ARG_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(utcIso));
}

function formatArgentinaDisplay(utcIso) {
  return `${formatArgentinaDate(utcIso)} ${formatArgentinaTime(utcIso)} (Argentina)`;
}

function stageForId(id) {
  if (id === "tercer-puesto") return "final";
  if (id.startsWith("16avos")) return "16avos";
  if (id.startsWith("octavos")) return "octavos";
  if (id.startsWith("cuartos")) return "cuartos";
  if (id.startsWith("semifinal")) return "semifinal";
  return "final";
}

function sortIds(ids) {
  const order = { "16avos": 1, octavos: 2, cuartos: 3, semifinal: 4, final: 5 };
  return [...ids].sort((a, b) => {
    const sa = stageForId(a);
    const sb = stageForId(b);
    if (order[sa] !== order[sb]) return order[sa] - order[sb];
    if (a === "tercer-puesto") return -1;
    if (b === "tercer-puesto") return 1;
    return a.localeCompare(b, "es", { numeric: true });
  });
}

const src = fs.readFileSync(path.join("data", "knockoutKickoff.ts"), "utf8");
const fifaById = parseFifaById(src);
const kickoffByFifa = parseKickoffByFifa(src);
const venueByFifa = parseVenueByFifa(src);
const placeholders = buildPlaceholders();

const ids = sortIds(Object.keys(fifaById));
if (ids.length !== 32) {
  throw new Error(`Se esperaban 32 partidos KO, hay ${ids.length}`);
}

const valueRows = ids.map((id) => {
  const fifa = fifaById[id];
  const utc = kickoffByFifa[fifa];
  const venue = venueByFifa[fifa];
  const ph = placeholders[id];
  const stage = stageForId(id);
  if (!utc || !venue || !ph) {
    throw new Error(`Datos incompletos para ${id} (FIFA #${fifa})`);
  }

  return `(
  '${sqlEscape(id)}',
  '${sqlEscape(ph.home)}',
  '${sqlEscape(ph.away)}',
  '${sqlEscape(formatArgentinaDate(utc))}',
  '${sqlEscape(formatArgentinaTime(utc))}',
  '${utc}'::timestamptz,
  '${utc}'::timestamptz,
  '${sqlEscape(formatArgentinaDisplay(utc))}',
  null,
  '${stage}',
  null,
  '${sqlEscape(venue.venue)}',
  '${sqlEscape(venue.city)}'
)`;
});

const sql = `-- =============================================================================
-- Prode Mundial 2026 — knockout_matches_seed.sql
--
-- Inserta/actualiza los 32 partidos de fase eliminatoria en public.matches.
-- Fuente de horarios: FIFA (UTC) — ver data/knockoutKickoff.ts
--
-- IMPORTANTE:
--   - home_team / away_team son PLACEHOLDERS (1A, Ganador 16avos-1, …).
--   - La app resuelve equipos reales en cliente (standings + overrides).
--   - kickoff_utc es la fuente de verdad para UI y cierre de predicciones.
--
-- IDEMPOTENTE: ON CONFLICT (id) DO UPDATE — no toca filas de grupos.
--
-- Generado con: node scripts/genKnockoutSeedSql.mjs
-- =============================================================================

insert into public.matches (
  id,
  home_team,
  away_team,
  match_date,
  kickoff_time,
  kickoff_utc,
  kickoff_argentina,
  kickoff_argentina_display,
  group_name,
  stage,
  matchday,
  venue,
  city
) values
${valueRows.join(",\n")}
on conflict (id) do update set
  home_team = excluded.home_team,
  away_team = excluded.away_team,
  match_date = excluded.match_date,
  kickoff_time = excluded.kickoff_time,
  kickoff_utc = excluded.kickoff_utc,
  kickoff_argentina = excluded.kickoff_argentina,
  kickoff_argentina_display = excluded.kickoff_argentina_display,
  group_name = excluded.group_name,
  stage = excluded.stage,
  matchday = excluded.matchday,
  venue = excluded.venue,
  city = excluded.city,
  updated_at = now();

-- Verificación rápida (esperado: total_ko = 32, con_kickoff = 32)
-- select
--   count(*) filter (where stage <> 'grupos') as total_ko,
--   count(*) filter (where stage <> 'grupos' and kickoff_utc is not null) as con_kickoff
-- from public.matches;
`;

const outPath = path.join("supabase", "knockout_matches_seed.sql");
fs.writeFileSync(outPath, sql, "utf8");
console.log(`Wrote ${outPath} (${ids.length} knockout matches)`);
