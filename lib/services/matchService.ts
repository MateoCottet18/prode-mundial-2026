import type { GroupName, Match, Matchday, Stage } from "@/data/matches";
import { formatKickoffArgentinaFromUtc } from "@/data/kickoffUtc";
import type { KnockoutScheduleMap } from "@/data/knockoutKickoff";
import { knockoutScheduleFromRows } from "@/lib/knockoutSchedule";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { MatchRow } from "@/lib/supabase/types";

/**
 * Servicio de partidos.
 *
 * Fuente de verdad: tabla `public.matches` en Supabase.
 * - Fase grupos: equipos fijos en DB.
 * - Fase eliminatoria: placeholders en DB + horarios; equipos dinámicos en cliente.
 */

export type MatchesFetchResult = {
  groupMatches: Match[];
  knockoutSchedule: KnockoutScheduleMap;
};

/**
 * Trae partidos de grupos + horarios KO desde Supabase.
 * Los partidos KO no se mezclan en `groupMatches` (evita pisar standings).
 */
export async function fetchMatchesFromSupabase(): Promise<MatchesFetchResult | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("matches")
    .select(
      "id,home_team,away_team,match_date,kickoff_time,kickoff_utc,kickoff_argentina,kickoff_argentina_display,group_name,stage,matchday,venue,city",
    )
    .order("matchday", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true });

  if (error) {
    console.error("[matchService] error leyendo matches", error.message);
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    return { groupMatches: [], knockoutSchedule: {} };
  }

  const groupRows = data.filter((row) => row.stage === "grupos");
  const koRows = data.filter((row) => row.stage !== "grupos");

  return {
    groupMatches: groupRows.map(rowToGroupMatch),
    knockoutSchedule: knockoutScheduleFromRows(koRows),
  };
}

function rowToGroupMatch(row: MatchRow): Match {
  const groupOrStage: GroupName | Stage =
    row.group_name && row.group_name.startsWith("Grupo ")
      ? (row.group_name as GroupName)
      : (row.stage as Stage);

  return {
    id: row.id,
    group: groupOrStage,
    matchday: row.matchday ? (row.matchday as Matchday) : null,
    stage: row.stage,
    date: row.match_date ?? "A definir",
    time: row.kickoff_utc
      ? formatKickoffArgentinaFromUtc(row.kickoff_utc)
      : (row.kickoff_time ?? "A definir"),
    kickoffUtc: row.kickoff_utc ?? null,
    kickoffArgentina: row.kickoff_argentina ?? null,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    venue: row.venue ?? "",
    city: row.city ?? "",
  };
}
