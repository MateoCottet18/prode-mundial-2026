import { calculatePoints, parseScore, type PredictionsByUser, type ResultsByMatch, type SavedPredictionsByUser, type ScoreInput } from "@/lib/prode";
import { getSupabaseClient } from "@/lib/supabase/client";
import { toScoreInput } from "@/lib/supabase/types";

export async function fetchPredictionsFromSupabase() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("predictions")
    .select("user_id,match_id,home_goals,away_goals");

  if (error) {
    throw new Error(error.message);
  }

  const predictions: PredictionsByUser = {};
  const savedPredictions: SavedPredictionsByUser = {};

  data.forEach((prediction) => {
    predictions[prediction.user_id] = {
      ...(predictions[prediction.user_id] ?? {}),
      [prediction.match_id]: toScoreInput(prediction.home_goals, prediction.away_goals),
    };
    savedPredictions[prediction.user_id] = {
      ...(savedPredictions[prediction.user_id] ?? {}),
      [prediction.match_id]: true,
    };
  });

  return { predictions, savedPredictions };
}

export async function savePredictionToSupabase({
  userId,
  matchId,
  score,
  results,
}: {
  userId: string;
  matchId: string;
  score: ScoreInput;
  results: ResultsByMatch;
}) {
  const supabase = getSupabaseClient();
  const parsedScore = parseScore(score);

  if (!supabase || !parsedScore) {
    return false;
  }

  const points = calculatePoints(score, results[matchId], true) ?? 0;
  const { error } = await supabase.from("predictions").upsert({
    user_id: userId,
    match_id: matchId,
    home_goals: parsedScore.home,
    away_goals: parsedScore.away,
    points,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

export async function deletePredictionFromSupabase(userId: string, matchId: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("predictions")
    .delete()
    .eq("user_id", userId)
    .eq("match_id", matchId);

  if (error) {
    throw new Error(error.message);
  }
  return true;
}

export async function recalculatePredictionPoints(results: ResultsByMatch) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return false;
  }

  const { data, error } = await supabase
    .from("predictions")
    .select("id,match_id,home_goals,away_goals");

  if (error) {
    throw new Error(error.message);
  }

  await Promise.all(
    data.map((prediction) => {
      const score = toScoreInput(prediction.home_goals, prediction.away_goals);
      const points = calculatePoints(score, results[prediction.match_id], true) ?? 0;
      return supabase
        .from("predictions")
        .update({ points })
        .eq("id", prediction.id);
    }),
  );

  return true;
}
