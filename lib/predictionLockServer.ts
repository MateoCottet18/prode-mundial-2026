import type { ResultsByMatch } from "@/lib/prode";
import { parseScore } from "@/lib/prode";

export type PredictionSaveBlockReason =
  | "no_session"
  | "invalid_score"
  | "match_not_found"
  | "result_loaded"
  | "kickoff_passed"
  | "schedule_unconfirmed"
  | "admin_cannot_predict";

export type PredictionSaveGateResult =
  | { allowed: true; kickoffUtc: string }
  | { allowed: false; reason: PredictionSaveBlockReason; message: string };

type MatchKickoffRow = {
  id: string;
  kickoff_utc: string | null;
  kickoff_argentina?: string | null;
};

function resolveKickoffUtc(row: MatchKickoffRow | null | undefined): string | null {
  const raw = row?.kickoff_utc?.trim();
  return raw || null;
}

/**
 * Valida si un participante puede guardar/editar una predicción.
 * Fuente de verdad del horario: `public.matches.kickoff_utc`.
 */
export function validatePredictionSaveWindow(
  matchRow: MatchKickoffRow | null | undefined,
  hasResult: boolean,
  now: Date = new Date(),
): PredictionSaveGateResult {
  if (hasResult) {
    return {
      allowed: false,
      reason: "result_loaded",
      message: "Predicción cerrada: el resultado ya fue cargado.",
    };
  }

  const raw = resolveKickoffUtc(matchRow);
  if (!raw) {
    return {
      allowed: false,
      reason: "schedule_unconfirmed",
      message: "Horario no confirmado.",
    };
  }

  const kickoff = new Date(raw);
  if (Number.isNaN(kickoff.getTime())) {
    return {
      allowed: false,
      reason: "schedule_unconfirmed",
      message: "Horario no confirmado.",
    };
  }

  if (now.getTime() >= kickoff.getTime()) {
    return {
      allowed: false,
      reason: "kickoff_passed",
      message: "Predicción cerrada: el partido ya comenzó.",
    };
  }

  return { allowed: true, kickoffUtc: raw };
}

export function hasDbResult(
  matchId: string,
  results: ResultsByMatch | Record<string, { home_goals?: number; away_goals?: number } | undefined>,
): boolean {
  const row = results[matchId];
  if (!row) return false;
  if ("home_goals" in row && typeof row.home_goals === "number") {
    return Number.isInteger(row.home_goals) && Number.isInteger(row.away_goals);
  }
  return parseScore(row as { home: string; away: string }) !== null;
}
