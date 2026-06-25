/**
 * Audita cruces R32: id interno, slot FIFA, kickoff, placeholder DB.
 * Ejecutar: node scripts/auditKnockoutBracket.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ARG_TZ = "America/Argentina/Buenos_Aires";

function parseFifaById(src) {
  const map = {};
  const block = src.match(/export const KNOCKOUT_FIFA_MATCH_NUMBER[\s\S]*?=\s*\{([\s\S]*?)\n\};/);
  if (!block) throw new Error("KNOCKOUT_FIFA_MATCH_NUMBER missing");
  const re = /"([^"]+)":\s*(\d+)/g;
  let m;
  while ((m = re.exec(block[1]))) {
    if (m[1].includes("-") || m[1] === "tercer-puesto") map[m[1]] = Number(m[2]);
  }
  return map;
}

function parseKickoffByFifa(src) {
  const map = {};
  const block = src.match(/export const FIFA_MATCH_KICKOFF_UTC[\s\S]*?=\s*\{([\s\S]*?)\n\};/);
  const re = /(\d+):\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(block[1]))) map[Number(m[1])] = m[2];
  return map;
}

function parseR32Slots(src) {
  const slots = [];
  const block = src.match(/export const officialRoundOf32Slots[\s\S]*?=\s*\[([\s\S]*?)\n\];/);
  const pairRe = /\[\s*([^\]]+)\s*,\s*([^\]]+)\s*\]/g;
  let m;
  while ((m = pairRe.exec(block[1]))) {
    slots.push([m[1].trim(), m[2].trim()]);
  }
  return slots;
}

function slotToLabel(expr) {
  const pool = expr.match(/T3\("([A-L])", "([A-L]+)"\)/);
  if (pool) {
    return `3° ${pool[2].split("").join("/")}`;
  }
  const w = expr.match(/W1\("([A-L])"\)/);
  if (w) return `1${w[1]}`;
  const r = expr.match(/R2\("([A-L])"\)/);
  if (r) return `2${r[1]}`;
  return expr;
}

function formatArg(utc) {
  const d = new Date(utc);
  const date = new Intl.DateTimeFormat("es-AR", {
    timeZone: ARG_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat("es-AR", {
    timeZone: ARG_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(d);
  return `${date} ${time}`;
}

const kickoffSrc = fs.readFileSync("data/knockoutKickoff.ts", "utf8");
const knockoutSrc = fs.readFileSync("data/knockout.ts", "utf8");
const fifaById = parseFifaById(kickoffSrc);
const kickoffByFifa = parseKickoffByFifa(kickoffSrc);
const r32 = parseR32Slots(knockoutSrc);

console.log("ID interno | Slot oficial | FIFA# | kickoff UTC | hora ARG | fuente");
console.log("---|---|---|---|---|---");

for (let i = 0; i < 16; i++) {
  const id = `16avos-${i + 1}`;
  const fifa = fifaById[id];
  const utc = kickoffByFifa[fifa];
  const [home, away] = r32[i];
  const slot = `${slotToLabel(home)} vs ${slotToLabel(away)}`;
  console.log(
    `${id} | ${slot} | M${fifa} | ${utc} | ${formatArg(utc)} | FIFA/Sofascore`,
  );
}
