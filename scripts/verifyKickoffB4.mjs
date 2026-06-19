#!/usr/bin/env node
/** Verifica Canadá vs Qatar (b-4): 2026-06-18T22:00:00Z → 19:00 Argentina */

const ARG_TZ = "America/Argentina/Buenos_Aires";
const utc = "2026-06-18T22:00:00Z";

function formatKickoffArgentina(instantIso) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ARG_TZ,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(instantIso));
}

const art = formatKickoffArgentina(utc);
const ok = utc === "2026-06-18T22:00:00Z" && art === "19:00";

console.log(
  JSON.stringify(
    { match: "b-4 Canadá vs Qatar", kickoff_utc: utc, hora_argentina: art, ok },
    null,
    2,
  ),
);

process.exit(ok ? 0 : 1);
