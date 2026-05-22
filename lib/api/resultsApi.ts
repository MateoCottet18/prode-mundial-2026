import type { ResultsByMatch, ScoreInput } from "@/lib/prode";
import { getSupabaseClient } from "@/lib/supabase/client";
import { toScoreInput } from "@/lib/supabase/types";

export async function fetchResultsFromSupabase() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.from("results").select("match_id,home_goals,away_goals");

  if (error) {
    throw new Error(error.message);
  }

  return Object.fromEntries(
    data.map((result) => [result.match_id, toScoreInput(result.home_goals, result.away_goals)]),
  ) as ResultsByMatch;
}

export async function saveResultToSupabase(matchId: string, score: ScoreInput) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return false;
  }

  const homeGoals = Number(score.home);
  const awayGoals = Number(score.away);
  const { error } = await supabase.from("results").upsert({
    match_id: matchId,
    home_goals: homeGoals,
    away_goals: awayGoals,
    status: "finished",
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

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
