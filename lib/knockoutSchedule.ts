import type { Match } from "@/data/matches";
import { formatKickoffArgentinaFromUtc } from "@/data/kickoffUtc";
import {
  buildDefaultKnockoutSchedule,
  FIFA_KNOCKOUT_KICKOFF_UTC,
  type KnockoutScheduleMap,
} from "@/data/knockoutKickoff";
import type { MatchRow } from "@/lib/supabase/types";

export type { KnockoutScheduleMap, KnockoutScheduleEntry } from "@/data/knockoutKickoff";

/** Construye mapa id → horario desde filas KO de Supabase. */
export function knockoutScheduleFromRows(rows: MatchRow[]): KnockoutScheduleMap {
  const schedule: KnockoutScheduleMap = {};
  for (const row of rows) {
    if (row.stage === "grupos" || !row.kickoff_utc) continue;
    schedule[row.id] = {
      kickoffUtc: row.kickoff_utc,
      kickoffArgentinaDisplay: row.kickoff_argentina_display,
      matchDate: row.match_date ?? undefined,
      venue: row.venue ?? undefined,
      city: row.city ?? undefined,
    };
  }
  return schedule;
}

/** DB → mapa; mezcla con calendario FIFA embebido (DB gana por id). */
export function resolveKnockoutSchedule(dbSchedule: KnockoutScheduleMap): KnockoutScheduleMap {
  const defaults = buildDefaultKnockoutSchedule();
  if (Object.keys(dbSchedule).length === 0) {
    return defaults;
  }
  return { ...defaults, ...dbSchedule };
}

/**
 * Aplica horario/sede desde schedule. NO modifica homeTeam/awayTeam (dinámicos).
 */
export function mergeKnockoutSchedule(
  match: Match,
  schedule: KnockoutScheduleMap,
): Match {
  const entry =
    schedule[match.id] ??
    (FIFA_KNOCKOUT_KICKOFF_UTC[match.id]
      ? buildDefaultKnockoutSchedule()[match.id]
      : undefined);

  if (!entry?.kickoffUtc) {
    return match;
  }

  return {
    ...match,
    kickoffUtc: entry.kickoffUtc,
    kickoffArgentina: entry.kickoffUtc,
    date: entry.matchDate ?? match.date,
    time: formatKickoffArgentinaFromUtc(entry.kickoffUtc),
    venue: entry.venue ?? match.venue,
    city: entry.city ?? match.city,
  };
}
