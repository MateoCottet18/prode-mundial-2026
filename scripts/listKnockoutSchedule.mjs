/** Lista horarios KO en UTC y Argentina. node scripts/listKnockoutSchedule.mjs */
import fs from "node:fs";

const src = fs.readFileSync("data/knockoutKickoff.ts", "utf8");
const tz = "America/Argentina/Buenos_Aires";

function parseFifaById() {
  const map = {};
  const block = src.match(/export const KNOCKOUT_FIFA_MATCH_NUMBER[\s\S]*?=\s*\{([\s\S]*?)\n\};/);
  const re = /"([^"]+)":\s*(\d+)/g;
  let m;
  while ((m = re.exec(block[1]))) map[m[1]] = Number(m[2]);
  return map;
}

function parseKickoffByFifa() {
  const map = {};
  const block = src.match(/export const FIFA_MATCH_KICKOFF_UTC[\s\S]*?=\s*\{([\s\S]*?)\n\};/);
  const re = /(\d+):\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(block[1]))) map[Number(m[1])] = m[2];
  return map;
}

function roundLabel(id) {
  if (id.startsWith("16avos")) return "R32";
  if (id.startsWith("octavos")) return "R16";
  if (id.startsWith("cuartos")) return "QF";
  if (id.startsWith("semifinal")) return "SF";
  if (id === "tercer-puesto") return "3P";
  return "FINAL";
}

function stageOrder(id) {
  const r = roundLabel(id);
  const order = { R32: 1, R16: 2, QF: 3, SF: 4, "3P": 5, FINAL: 6 };
  return order[r] * 100 + (id === "tercer-puesto" ? 0 : Number(id.split("-").pop()));
}

const fifaById = parseFifaById();
const kickoffByFifa = parseKickoffByFifa();
const fmt = (utc) =>
  new Intl.DateTimeFormat("es-AR", {
    timeZone: tz,
    hourCycle: "h23",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(utc));

const rows = Object.keys(fifaById)
  .sort((a, b) => stageOrder(a) - stageOrder(b))
  .map((id) => {
    const utc = kickoffByFifa[fifaById[id]];
    return { id, round: roundLabel(id), fifa: fifaById[id], utc, arg: fmt(utc) };
  });

console.log("| ID | Ronda | FIFA # | UTC | Argentina |");
console.log("|---|---|---:|---|---|");
for (const r of rows) {
  console.log(`| ${r.id} | ${r.round} | ${r.fifa} | ${r.utc} | ${r.arg} |`);
}
