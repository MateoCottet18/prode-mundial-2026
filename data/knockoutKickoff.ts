/**
 * Kickoff oficial FIFA — fase eliminatoria (32 partidos).
 * Fuente: FIFA / calendario publicado (horarios Eastern Time → UTC).
 */
import { formatKickoffArgentinaDisplay } from "@/data/kickoffUtc";
import { officialRoundOf32Slots, type QualifierSlot } from "@/data/knockout";
import type { Stage } from "@/data/matches";

export type KnockoutRoundCode = "R32" | "R16" | "QF" | "SF" | "3P" | "FINAL";

/** Número de partido FIFA (73–104) por id de la app. */
export const KNOCKOUT_FIFA_MATCH_NUMBER: Record<string, number> = {
  "16avos-1": 74,
  "16avos-2": 77,
  "16avos-3": 73,
  "16avos-4": 75,
  "16avos-5": 76,
  "16avos-6": 78,
  "16avos-7": 79,
  "16avos-8": 80,
  "16avos-9": 83,
  "16avos-10": 84,
  "16avos-11": 81,
  "16avos-12": 82,
  "16avos-13": 86,
  "16avos-14": 88,
  "16avos-15": 85,
  "16avos-16": 87,
  "octavos-1": 89,
  "octavos-2": 90,
  "octavos-3": 91,
  "octavos-4": 92,
  "octavos-5": 93,
  "octavos-6": 94,
  "octavos-7": 95,
  "octavos-8": 96,
  "cuartos-1": 97,
  "cuartos-2": 98,
  "cuartos-3": 99,
  "cuartos-4": 100,
  "semifinal-1": 101,
  "semifinal-2": 102,
  "tercer-puesto": 103,
  "final-1": 104,
};

export const FIFA_MATCH_KICKOFF_UTC: Record<number, string> = {
  73: "2026-06-28T19:00:00Z",
  74: "2026-06-29T20:30:00Z",
  75: "2026-06-30T01:00:00Z",
  76: "2026-06-29T17:00:00Z",
  77: "2026-06-30T21:00:00Z",
  78: "2026-06-30T17:00:00Z",
  79: "2026-07-01T01:00:00Z",
  80: "2026-07-01T16:00:00Z",
  81: "2026-07-02T00:00:00Z",
  82: "2026-07-01T20:00:00Z",
  83: "2026-07-02T23:00:00Z",
  84: "2026-07-02T19:00:00Z",
  85: "2026-07-03T03:00:00Z",
  86: "2026-07-03T22:00:00Z",
  87: "2026-07-04T01:30:00Z",
  88: "2026-07-03T18:00:00Z",
  89: "2026-07-04T21:00:00Z",
  90: "2026-07-04T17:00:00Z",
  91: "2026-07-05T20:00:00Z",
  92: "2026-07-06T00:00:00Z",
  93: "2026-07-06T19:00:00Z",
  94: "2026-07-07T00:00:00Z",
  95: "2026-07-07T16:00:00Z",
  96: "2026-07-07T20:00:00Z",
  97: "2026-07-09T20:00:00Z",
  98: "2026-07-10T19:00:00Z",
  99: "2026-07-11T21:00:00Z",
  100: "2026-07-12T01:00:00Z",
  101: "2026-07-14T19:00:00Z",
  102: "2026-07-15T19:00:00Z",
  103: "2026-07-18T21:00:00Z",
  104: "2026-07-19T19:00:00Z",
};

export const FIFA_MATCH_VENUE: Record<number, { venue: string; city: string }> = {
  73: { venue: "SoFi Stadium", city: "Los Angeles" },
  74: { venue: "Gillette Stadium", city: "Boston" },
  75: { venue: "Estadio BBVA", city: "Monterrey" },
  76: { venue: "NRG Stadium", city: "Houston" },
  77: { venue: "MetLife Stadium", city: "New York/New Jersey" },
  78: { venue: "AT&T Stadium", city: "Dallas" },
  79: { venue: "Estadio Azteca", city: "Mexico City" },
  80: { venue: "Mercedes-Benz Stadium", city: "Atlanta" },
  81: { venue: "Levi's Stadium", city: "San Francisco Bay Area" },
  82: { venue: "Lumen Field", city: "Seattle" },
  83: { venue: "BMO Field", city: "Toronto" },
  84: { venue: "SoFi Stadium", city: "Los Angeles" },
  85: { venue: "BC Place", city: "Vancouver" },
  86: { venue: "Hard Rock Stadium", city: "Miami" },
  87: { venue: "Arrowhead Stadium", city: "Kansas City" },
  88: { venue: "AT&T Stadium", city: "Dallas" },
  89: { venue: "Lincoln Financial Field", city: "Philadelphia" },
  90: { venue: "NRG Stadium", city: "Houston" },
  91: { venue: "MetLife Stadium", city: "New York/New Jersey" },
  92: { venue: "Estadio Azteca", city: "Mexico City" },
  93: { venue: "AT&T Stadium", city: "Dallas" },
  94: { venue: "Lumen Field", city: "Seattle" },
  95: { venue: "Mercedes-Benz Stadium", city: "Atlanta" },
  96: { venue: "BC Place", city: "Vancouver" },
  97: { venue: "Gillette Stadium", city: "Boston" },
  98: { venue: "SoFi Stadium", city: "Los Angeles" },
  99: { venue: "Hard Rock Stadium", city: "Miami" },
  100: { venue: "Arrowhead Stadium", city: "Kansas City" },
  101: { venue: "AT&T Stadium", city: "Dallas" },
  102: { venue: "Mercedes-Benz Stadium", city: "Atlanta" },
  103: { venue: "Hard Rock Stadium", city: "Miami" },
  104: { venue: "MetLife Stadium", city: "New York/New Jersey" },
};

export const KNOCKOUT_ROUND_CODE: Record<string, KnockoutRoundCode> = {
  "16avos-1": "R32",
  "16avos-2": "R32",
  "16avos-3": "R32",
  "16avos-4": "R32",
  "16avos-5": "R32",
  "16avos-6": "R32",
  "16avos-7": "R32",
  "16avos-8": "R32",
  "16avos-9": "R32",
  "16avos-10": "R32",
  "16avos-11": "R32",
  "16avos-12": "R32",
  "16avos-13": "R32",
  "16avos-14": "R32",
  "16avos-15": "R32",
  "16avos-16": "R32",
  "octavos-1": "R16",
  "octavos-2": "R16",
  "octavos-3": "R16",
  "octavos-4": "R16",
  "octavos-5": "R16",
  "octavos-6": "R16",
  "octavos-7": "R16",
  "octavos-8": "R16",
  "cuartos-1": "QF",
  "cuartos-2": "QF",
  "cuartos-3": "QF",
  "cuartos-4": "QF",
  "semifinal-1": "SF",
  "semifinal-2": "SF",
  "tercer-puesto": "3P",
  "final-1": "FINAL",
};

function slotPlaceholderLabel(slot: QualifierSlot): string {
  if (slot.type === "third") {
    return `BEST_THIRD_${slot.index}`;
  }
  const letter = slot.group.replace("Grupo ", "");
  return `${slot.position}${letter}`;
}

function build16avosPlaceholders(): Record<string, { home: string; away: string }> {
  const out: Record<string, { home: string; away: string }> = {};
  officialRoundOf32Slots.forEach(([homeSlot, awaySlot], index) => {
    const id = `16avos-${index + 1}`;
    out[id] = {
      home: slotPlaceholderLabel(homeSlot),
      away: slotPlaceholderLabel(awaySlot),
    };
  });
  return out;
}

function winnerPlaceholder(prevStage: string, index: number): string {
  return `Ganador ${prevStage}-${index}`;
}

function buildAllPlaceholders(): Record<string, { home: string; away: string }> {
  const map = { ...build16avosPlaceholders() };
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

export const KNOCKOUT_DB_PLACEHOLDERS = buildAllPlaceholders();

export const KNOCKOUT_MATCH_IDS = Object.keys(KNOCKOUT_FIFA_MATCH_NUMBER);

export const FIFA_KNOCKOUT_KICKOFF_UTC: Record<string, string> = Object.fromEntries(
  KNOCKOUT_MATCH_IDS.map((id) => {
    const fifa = KNOCKOUT_FIFA_MATCH_NUMBER[id];
    return [id, FIFA_MATCH_KICKOFF_UTC[fifa]];
  }),
);

export type KnockoutScheduleEntry = {
  kickoffUtc: string;
  kickoffArgentinaDisplay?: string | null;
  matchDate?: string;
  venue?: string;
  city?: string;
  round?: KnockoutRoundCode;
};

export type KnockoutScheduleMap = Record<string, KnockoutScheduleEntry>;

export function getKnockoutStageForId(id: string): Exclude<Stage, "grupos"> {
  if (id === "tercer-puesto") return "final";
  if (id.startsWith("16avos")) return "16avos";
  if (id.startsWith("octavos")) return "octavos";
  if (id.startsWith("cuartos")) return "cuartos";
  if (id.startsWith("semifinal")) return "semifinal";
  return "final";
}

export function buildDefaultKnockoutSchedule(): KnockoutScheduleMap {
  const schedule: KnockoutScheduleMap = {};
  for (const id of KNOCKOUT_MATCH_IDS) {
    const fifa = KNOCKOUT_FIFA_MATCH_NUMBER[id];
    const utc = FIFA_MATCH_KICKOFF_UTC[fifa];
    const venue = FIFA_MATCH_VENUE[fifa];
    const instant = new Date(utc);
    const matchDate = new Intl.DateTimeFormat("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(instant);
    schedule[id] = {
      kickoffUtc: utc,
      kickoffArgentinaDisplay: formatKickoffArgentinaDisplay(utc),
      matchDate,
      venue: venue.venue,
      city: venue.city,
      round: KNOCKOUT_ROUND_CODE[id],
    };
  }
  return schedule;
}
