// Chequeo manual: cierre usa kickoffArgentina explícito (sin conversiones).
//
//   node scripts/lockChecks.mjs

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// Import compiled logic via dynamic eval of matchTime helpers (standalone copy)
const ARGENTINA_TZ = "America/Argentina/Buenos_Aires";

function parseKickoff(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatArgentina(instant) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ARGENTINA_TZ,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).format(instant);
}

function lock(iso, hasResult, now) {
  const kickoff = parseKickoff(iso);
  if (hasResult) return "result";
  if (kickoff && now.getTime() >= kickoff.getTime()) return "kickoff";
  return "open";
}

const src = readFileSync("data/matches.ts", "utf8");
const d2 = src.match(/id:\s*"d-2"[\s\S]*?kickoffArgentina:\s*"([^"]+)"/);
const j1 = src.match(/id:\s*"j-1"[\s\S]*?kickoffArgentina:\s*"([^"]+)"/);

let failures = 0;
function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "✅" : "❌"} ${label}: ${actual}${ok ? "" : ` (esperaba ${expected})`}`);
}

console.log("== kickoffArgentina en data/matches.ts ==");
check("d-2 ISO", d2?.[1], "2026-06-14T01:00:00-03:00");
check("d-2 hora ARG", formatArgentina(parseKickoff(d2?.[1])), "01:00");

console.log("\n== Prioridad de cierre (d-2) ==");
const ko = parseKickoff(d2?.[1]);
const tenMinBefore = new Date(ko.getTime() - 10 * 60000);
const future = new Date(ko.getTime() - 6 * 60 * 60000);
const after = new Date(ko.getTime() + 60000);
check("futuro -> open", lock(d2?.[1], false, future), "open");
check("10 min antes -> open", lock(d2?.[1], false, tenMinBefore), "open");
check("iniciado -> kickoff", lock(d2?.[1], false, after), "kickoff");
check("resultado -> result", lock(d2?.[1], true, future), "result");

console.log("\n== Otro partido (j-1 Argentina vs Argelia) ==");
check("j-1 hora ARG", formatArgentina(parseKickoff(j1?.[1])), "22:00");

console.log(`\n${failures === 0 ? "TODO OK ✅" : `${failures} FALLO(S) ❌`}`);
process.exit(failures === 0 ? 0 : 1);
