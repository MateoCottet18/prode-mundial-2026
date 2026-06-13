import fs from "node:fs";

const src = fs.readFileSync("data/matches.ts", "utf8");
const blockRe =
  /id:\s*"([^"]+)"[\s\S]*?date:\s*"([^"]+)"[\s\S]*?time:\s*"([^"]+)"[\s\S]*?homeTeam:/g;

const months = {
  ene: 0,
  feb: 1,
  mar: 2,
  abr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dic: 11,
};

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatArgentinaIso(year, month, day, hour, minute) {
  return `${year}-${pad(month + 1)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00-03:00`;
}

function toKickoffArgentina(dateStr, timeStr) {
  const dm = dateStr.match(/^(\d{1,2})\s+([a-záéíóúñ]+)\s+(\d{4})$/i);
  const tm = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!dm || !tm) return null;

  const day = Number(dm[1]);
  const month = months[dm[2].slice(0, 3).toLowerCase()];
  const year = Number(dm[3]);
  let hour = Number(tm[1]);
  const minute = Number(tm[2]);
  if (month === undefined) return null;

  if (hour === 0 && minute === 0) {
    const next = new Date(Date.UTC(year, month, day + 1));
    return formatArgentinaIso(
      next.getUTCFullYear(),
      next.getUTCMonth(),
      next.getUTCDate(),
      1,
      0,
    );
  }

  hour += 1;
  let outDay = day;
  let outMonth = month;
  let outYear = year;
  if (hour >= 24) {
    hour -= 24;
    const next = new Date(Date.UTC(year, month, day + 1));
    outYear = next.getUTCFullYear();
    outMonth = next.getUTCMonth();
    outDay = next.getUTCDate();
  }

  return formatArgentinaIso(outYear, outMonth, outDay, hour, minute);
}

const kickoffs = new Map();
let m;
while ((m = blockRe.exec(src))) {
  kickoffs.set(m[1], toKickoffArgentina(m[2], m[3]));
}

let out = src;
for (const [id, iso] of kickoffs) {
  const hasField = new RegExp(
    `id:\\s*"${id.replace(/-/g, "\\-")}"[\\s\\S]*?kickoffArgentina:`,
  ).test(out);

  if (hasField) {
    const re = new RegExp(
      `(id:\\s*"${id.replace(/-/g, "\\-")}"[\\s\\S]*?kickoffArgentina:\\s*")[^"]*(")`,
    );
    out = out.replace(re, `$1${iso}$2`);
  } else {
    const re = new RegExp(
      `(id:\\s*"${id.replace(/-/g, "\\-")}"[\\s\\S]*?time:\\s*"[^"]+",)\\s*(homeTeam:)`,
    );
    out = out.replace(re, `$1\n    kickoffArgentina: "${iso}",\n    $2`);
  }
}

fs.writeFileSync("data/matches.ts", out);
console.log("Patched", kickoffs.size, "matches");
console.log("d-2", kickoffs.get("d-2"));
