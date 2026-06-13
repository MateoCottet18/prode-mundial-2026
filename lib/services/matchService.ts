import type { GroupName, Match, Matchday, Stage } from "@/data/matches";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { MatchRow } from "@/lib/supabase/types";

/**
 * Servicio de partidos.
 *
 * Fuente de verdad: tabla `public.matches` en Supabase (ver `supabase/matches.sql`).
 * Sólo se persisten los 72 partidos de fase de grupos. Las llaves de eliminación
 * directa se generan en el cliente desde los resultados (`lib/standings.ts`).
 */

/**
 * Trae todos los partidos de Supabase y los mapea al tipo `Match` que ya usa
 * la UI. Devuelve `null` si Supabase no está configurado y `[]` si la tabla
 * está vacía o se rompió la query (el caller decide si caer al fallback local).
 */
export async function fetchMatchesFromSupabase(): Promise<Match[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("matches")
    .select(
      "id,home_team,away_team,match_date,kickoff_time,kickoff_argentina,group_name,stage,matchday,venue,city",
    )
    .order("matchday", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true });

  if (error) {
    console.error("[matchService] error leyendo matches", error.message);
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map(rowToMatch);
}

function rowToMatch(row: MatchRow): Match {
  // Tip de tipos: en la app `group` puede ser un GroupName ("Grupo A"…) o un Stage
  // (16avos, octavos, …). Para los partidos en DB es siempre un grupo de fase de
  // grupos, así que `group_name` es el GroupName. Si en el futuro guardamos KO en
  // DB, su `group_name` podría ser null y `stage` indica la fase.
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
    time: row.kickoff_time ?? "A definir",
    kickoffArgentina: row.kickoff_argentina ?? null,
    homeTeam: row.home_team,
    awayTeam: row.away_team,
    venue: row.venue ?? "",
    city: row.city ?? "",
  };
}
