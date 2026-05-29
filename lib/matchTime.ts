import type { Match } from "@/data/matches";
import { parseScore, type ResultsByMatch } from "@/lib/prode";

/**
 * Parsing del horario de inicio de un partido + helpers asociados.
 *
 * Formato esperado:
 *   date: "11 jun 2026"   -> día (1-2 dígitos) + mes en español (3 letras) + año (4 dígitos)
 *   time: "15:00 EDT"     -> HH:MM + zona horaria (EDT = UTC-4, EST = UTC-5)
 *
 * Los partidos generados de eliminación directa pueden tener "A definir";
 * en ese caso devolvemos `null` y NUNCA se consideran vencidos ni se cierran
 * por kickoff (no podés bloquear algo que no sabés cuándo arranca).
 */

const SPANISH_MONTHS: Record<string, number> = {
  ene: 0,
  feb: 1,
  mar: 2,
  abr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  sep: 8,
  set: 8,
  oct: 9,
  nov: 10,
  dic: 11,
};

// Mapeo zona -> offset respecto UTC en minutos (UTC = local - offset).
// Si llega una zona no conocida, asumimos EDT (UTC-4) por ser la del Mundial 2026.
const TIMEZONE_OFFSET_MINUTES: Record<string, number> = {
  EDT: -240, // UTC-4
  EST: -300, // UTC-5
  CDT: -300, // UTC-5
  CST: -360, // UTC-6
  MDT: -360, // UTC-6
  MST: -420, // UTC-7
  PDT: -420, // UTC-7
  PST: -480, // UTC-8
  UTC: 0,
  GMT: 0,
};

export function parseMatchKickoff(match: Match): Date | null {
  if (!match?.date || !match?.time) return null;
  if (/a definir/i.test(match.date) || /a definir/i.test(match.time)) return null;

  const dateMatch = match.date.trim().match(/^(\d{1,2})\s+([a-záéíóúñ]+)\s+(\d{4})$/i);
  if (!dateMatch) return null;
  const day = Number(dateMatch[1]);
  const monthKey = dateMatch[2].slice(0, 3).toLowerCase();
  const month = SPANISH_MONTHS[monthKey];
  const year = Number(dateMatch[3]);
  if (month === undefined || Number.isNaN(day) || Number.isNaN(year)) return null;

  const timeMatch = match.time.trim().match(/^(\d{1,2}):(\d{2})(?:\s+([A-Z]{2,4}))?$/);
  if (!timeMatch) return null;
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  const tz = (timeMatch[3] ?? "EDT").toUpperCase();
  const offsetMinutes = TIMEZONE_OFFSET_MINUTES[tz] ?? -240;

  // Date.UTC interpreta los args como UTC; le sumamos -offset para convertir
  // un horario local-en-tz a UTC. Ej: 15:00 EDT (UTC-4) -> 19:00 UTC.
  const timestamp = Date.UTC(year, month, day, hours, minutes) - offsetMinutes * 60_000;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function hasMatchResult(matchId: string, results: ResultsByMatch): boolean {
  return parseScore(results[matchId]) !== null;
}

/**
 * Un partido está "vencido sin resultado" cuando:
 *   - tiene un kickoff parseable
 *   - ese kickoff ya pasó respecto a `now`
 *   - todavía no hay resultado cargado
 */
export function isMatchOverdue(
  match: Match,
  results: ResultsByMatch,
  now: Date = new Date(),
): boolean {
  if (hasMatchResult(match.id, results)) return false;
  const kickoff = parseMatchKickoff(match);
  if (!kickoff) return false;
  return kickoff.getTime() <= now.getTime();
}

/** Lista (ordenada por kickoff asc) de partidos vencidos sin resultado. */
export function getOverdueMatches(
  matches: Match[],
  results: ResultsByMatch,
  now: Date = new Date(),
): Match[] {
  return matches
    .filter((match) => isMatchOverdue(match, results, now))
    .sort((a, b) => {
      const ka = parseMatchKickoff(a)?.getTime() ?? 0;
      const kb = parseMatchKickoff(b)?.getTime() ?? 0;
      return ka - kb;
    });
}

/** Lista (ordenada por kickoff desc) de partidos con resultado cargado. */
export function getMatchesWithResults(
  matches: Match[],
  results: ResultsByMatch,
): Match[] {
  return matches
    .filter((match) => hasMatchResult(match.id, results))
    .sort((a, b) => {
      const ka = parseMatchKickoff(a)?.getTime() ?? 0;
      const kb = parseMatchKickoff(b)?.getTime() ?? 0;
      return kb - ka;
    });
}

/** Texto del estado de un partido para mostrarlo al admin. */
export function getMatchStatus(
  match: Match,
  results: ResultsByMatch,
  now: Date = new Date(),
): "finalizado" | "en_curso" | "vencido_sin_resultado" | "programado" | "sin_fecha" {
  const kickoff = parseMatchKickoff(match);
  const hasResult = hasMatchResult(match.id, results);
  if (hasResult) return "finalizado";
  if (!kickoff) return "sin_fecha";
  const diff = now.getTime() - kickoff.getTime();
  if (diff < 0) return "programado";
  // Asumimos un margen de 2.5 h para "en curso" antes de marcarlo vencido.
  if (diff < 2.5 * 60 * 60 * 1000) return "en_curso";
  return "vencido_sin_resultado";
}

export function matchStatusLabel(status: ReturnType<typeof getMatchStatus>): string {
  switch (status) {
    case "finalizado":
      return "Finalizado";
    case "en_curso":
      return "En curso";
    case "vencido_sin_resultado":
      return "Vencido sin resultado";
    case "programado":
      return "Programado";
    case "sin_fecha":
      return "Sin fecha";
  }
}

// =============================================================================
// Lock de predicciones
//
// La predicción de un partido está ABIERTA hasta que se cumpla cualquiera de:
//   1) el admin cargó el resultado oficial
//   2) ya pasó el kickoff
// Cualquiera de las dos cierra la predicción y deja la card en modo lectura.
// =============================================================================

export type PredictionLock =
  | { locked: false }
  | { locked: true; reason: "result" | "kickoff"; message: string };

/**
 * Decide si la predicción del partido está abierta o cerrada.
 *
 * @param match     partido (con date/time)
 * @param hasResult true si el admin ya cargó un resultado oficial
 * @param now       opcional — para tests / re-evaluación en intervalos
 */
export function getPredictionLock(
  match: Match,
  hasResult: boolean,
  now: Date = new Date(),
): PredictionLock {
  if (hasResult) {
    return {
      locked: true,
      reason: "result",
      message: "Predicción cerrada: el resultado ya fue cargado.",
    };
  }
  const kickoff = parseMatchKickoff(match);
  if (kickoff && now.getTime() >= kickoff.getTime()) {
    return {
      locked: true,
      reason: "kickoff",
      message: "Predicción cerrada: el partido ya comenzó.",
    };
  }
  return { locked: false };
}

/**
 * Atajo cuando ya tenés el mapa de resultados cargado (caso típico en
 * `app/partidos/page.tsx`): evita repetir el `parseScore(...)` afuera.
 */
export function getPredictionLockFromResults(
  match: Match,
  results: ResultsByMatch,
  now: Date = new Date(),
): PredictionLock {
  return getPredictionLock(match, hasMatchResult(match.id, results), now);
}
