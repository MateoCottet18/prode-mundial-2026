import fs from "node:fs";

const src = fs.readFileSync("data/matches.ts", "utf8");
const blockRe =
  /id:\s*"([^"]+)"[\s\S]*?date:\s*"([^"]+)"[\s\S]*?time:\s*"([^"]+)"[\s\S]*?homeTeam:\s*"([^"]+)"[\s\S]*?awayTeam:\s*"([^"]+)"/g;

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

/** Overrides manuales cuando la hora Argentina oficial difiere del cálculo base. */
const OVERRIDES = {
  "d-2": "2026-06-14T01:00:00-03:00",
};

function pad(n) {
  return String(n).padStart(2, "0");
}

function formatArgentinaIso(year, month, day, hour, minute) {
  return `${year}-${pad(month + 1)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00-03:00`;
}

function toKickoffArgentina(id, dateStr, timeStr) {
  if (OVERRIDES[id]) return OVERRIDES[id];

  const dm = dateStr.match(/^(\d{1,2})\s+([a-záéíóúñ]+)\s+(\d{4})$/i);
  const tm = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!dm || !tm) return null;

  const day = Number(dm[1]);
  const month = months[dm[2].slice(0, 3).toLowerCase()];
  const year = Number(dm[3]);
  let hour = Number(tm[1]);
  const minute = Number(tm[2]);
  if (month === undefined) return null;

  // Conversión base desde el fixture legacy (EDT + 1h = hora Argentina).
  // Partidos 00:00 EDT → 01:00 del día siguiente en Argentina.
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

const matches = [];
let m;
while ((m = blockRe.exec(src))) {
  matches.push({ id: m[1], date: m[2], time: m[3], home: m[4], away: m[5] });
}

console.log("-- SQL updates --");
for (const x of matches) {
  const k = toKickoffArgentina(x.id, x.date, x.time);
  console.log(
    `UPDATE public.matches SET kickoff_argentina = '${k}'::timestamptz WHERE id = '${x.id}'; -- ${x.home} vs ${x.away}`,
  );
}

console.log("\n-- d-2 check --");
const d2 = matches.find((x) => x.id === "d-2");
console.log(d2, toKickoffArgentina("d-2", d2.date, d2.time));
console.log("TOTAL", matches.length);
