import type { Match } from "@/data/matches";
import { FIFA_GROUP_KICKOFF_UTC } from "@/data/kickoffUtc";
import { parseScore, type ResultsByMatch } from "@/lib/prode";

/**
 * Horarios de partidos y cierre de predicciones.
 *
 * Fuente de verdad: `kickoff_utc` en Supabase (horario oficial FIFA en UTC).
 * La UI muestra la hora convertida a America/Argentina/Buenos_Aires.
 *
 * Regla de cierre:
 *   now >= kickoffUtc → cerrado por inicio
 *   now < kickoffUtc  → abierto
 *   + resultado cargado → cerrado (prioridad máxima)
 *
 * NO se convierte desde EDT, sede, ciudad ni timezone del navegador.
 * Sin kickoffUtc confirmado → cerrado ("Horario no confirmado").
 */

export const ARGENTINA_TZ = "America/Argentina/Buenos_Aires";

/** Resuelve el instante UTC del kickoff (DB → mapa FIFA). Sin legacy kickoffArgentina. */
export function resolveMatchKickoffUtc(match: Match): string | null {
  const raw =
    match.kickoffUtc?.trim() ||
    FIFA_GROUP_KICKOFF_UTC[match.id]?.trim() ||
    null;
  return raw || null;
}

/** Parsea el kickoff oficial del partido como Date (instante UTC). */
export function parseMatchKickoff(match: Match): Date | null {
  const raw = resolveMatchKickoffUtc(match);
  if (!raw) return null;
  const instant = new Date(raw);
  return Number.isNaN(instant.getTime()) ? null : instant;
}

/** Formatea un instante como "HH:mm" en hora de Argentina. */
export function formatKickoffArgentina(instant: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ARGENTINA_TZ,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  }).format(instant);
}

/** Formatea un instante como "dd/mm/aaaa HH:mm" en hora de Argentina (logs). */
export function formatDateTimeArgentina(instant: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ARGENTINA_TZ,
    hourCycle: "h23",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(instant);
}

/** Etiqueta "HH:mm" en que cierra la predicción, o null si no hay kickoff. */
export function getPredictionCloseLabel(match: Match): string | null {
  const kickoff = parseMatchKickoff(match);
  return kickoff ? formatKickoffArgentina(kickoff) : null;
}

/** Fecha corta del kickoff en Argentina (ej. "14 jun 2026"). */
export function getKickoffDateLabelArgentina(match: Match): string | null {
  const kickoff = parseMatchKickoff(match);
  if (!kickoff) return null;
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ARGENTINA_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(kickoff);
}

export function hasMatchResult(matchId: string, results: ResultsByMatch): boolean {
  return parseScore(results[matchId]) !== null;
}

export function isMatchOverdue(
  match: Match,
  results: ResultsByMatch,
  now: Date = new Date(),
): boolean {
  if (hasMatchResult(match.id, results)) return false;
  const kickoff = parseMatchKickoff(match);
  if (!kickoff) return false;
  return now.getTime() >= kickoff.getTime();
}

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

export type PredictionLock =
  | { locked: false }
  | { locked: true; reason: "result" | "kickoff" | "schedule"; message: string };

const loggedLockStates = new Set<string>();

function logLock(match: Match, kickoff: Date | null, now: Date, lock: PredictionLock): void {
  const reason = lock.locked ? lock.reason : "open";
  const key = `${match.id}|${lock.locked}|${reason}|${resolveMatchKickoffUtc(match) ?? ""}`;
  if (loggedLockStates.has(key)) return;
  loggedLockStates.add(key);
  console.log("[lock] matchId", match.id);
  console.log("[lock] kickoffUtc", resolveMatchKickoffUtc(match) ?? "sin fecha");
  console.log("[lock] kickoffArgentina", kickoff ? formatDateTimeArgentina(kickoff) : "sin fecha");
  console.log("[lock] nowArgentina", formatDateTimeArgentina(now));
  console.log("[lock] locked", lock.locked);
  console.log("[lock] reason", reason);
}

export function getPredictionLock(
  match: Match,
  hasResult: boolean,
  now: Date = new Date(),
): PredictionLock {
  const kickoff = parseMatchKickoff(match);

  let lock: PredictionLock;
  if (hasResult) {
    lock = {
      locked: true,
      reason: "result",
      message: "Predicción cerrada: el resultado ya fue cargado.",
    };
  } else if (!kickoff) {
    lock = {
      locked: true,
      reason: "schedule",
      message: "Horario no confirmado.",
    };
  } else if (now.getTime() >= kickoff.getTime()) {
    lock = {
      locked: true,
      reason: "kickoff",
      message: "Predicción cerrada: el partido ya comenzó.",
    };
  } else {
    lock = { locked: false };
  }

  logLock(match, kickoff, now, lock);
  return lock;
}

export function getPredictionLockFromResults(
  match: Match,
  results: ResultsByMatch,
  now: Date = new Date(),
): PredictionLock {
  return getPredictionLock(match, hasMatchResult(match.id, results), now);
}
