import type { MatchResult, ResultsByMatch } from "@/lib/prode";
import { getSupabaseClient } from "@/lib/supabase/client";
import { toScoreInput } from "@/lib/supabase/types";

function toMatchResult(row: {
  home_goals: number;
  away_goals: number;
  winner_team?: string | null;
  decided_by?: string | null;
}): MatchResult {
  return {
    ...toScoreInput(row.home_goals, row.away_goals),
    winnerTeam: row.winner_team ?? null,
    decidedBy:
      row.decided_by === "regular" || row.decided_by === "penalties"
        ? row.decided_by
        : null,
  };
}

export async function fetchResultsFromSupabase() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.from("results").select(
    "match_id,home_goals,away_goals,winner_team,decided_by",
  );

  if (error) {
    console.error("[result-fetch] error", error.message);
    throw new Error(error.message);
  }

  const mapped = Object.fromEntries(
    data.map((result) => [result.match_id, toMatchResult(result)]),
  ) as ResultsByMatch;

  const penaltyRows = data.filter((row) => row.decided_by === "penalties");
  if (penaltyRows.length) {
    console.log("[result-fetch] penalty results", penaltyRows);
  }

  return mapped;
}

export async function saveResultToSupabase(matchId: string, result: MatchResult) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return false;
  }

  const homeGoals = Number(result.home);
  const awayGoals = Number(result.away);
  const payload = {
    match_id: matchId,
    home_goals: homeGoals,
    away_goals: awayGoals,
    winner_team: result.winnerTeam ?? null,
    decided_by: result.decidedBy ?? null,
    status: "finished" as const,
    updated_at: new Date().toISOString(),
  };

  console.log("[result-save] payload", payload);

  const { data, error } = await supabase
    .from("results")
    .upsert(payload)
    .select("match_id,home_goals,away_goals,winner_team,decided_by")
    .single();

  if (error) {
    console.error("[result-save] error", error.message);
    throw new Error(error.message);
  }

  console.log("[result-save] saved row", data);
  console.log("[result-save] winner_team", data?.winner_team);
  console.log("[result-save] decided_by", data?.decided_by);

  return true;
}

export async function deleteResultFromSupabase(matchId: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return false;
  }

  const { error } = await supabase.from("results").delete().eq("match_id", matchId);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}
