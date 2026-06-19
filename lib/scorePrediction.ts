import { getResult, parseScore, type ScoreInput } from "@/lib/prode";

export type ScoredPrediction = {
  points: number;
  exact: boolean;
  outcome: boolean;
};

type ParsedGoals = { home: number; away: number };

function toParsedGoals(
  value: ScoreInput | ParsedGoals,
): ParsedGoals | null {
  if (
    typeof value === "object" &&
    typeof value.home === "number" &&
    typeof value.away === "number"
  ) {
    if (!Number.isInteger(value.home) || !Number.isInteger(value.away)) {
      return null;
    }
    return { home: value.home, away: value.away };
  }
  return parseScore(value as ScoreInput);
}

/**
 * Regla oficial de puntos (solo cuando hay resultado cargado).
 */
export function scorePrediction(
  prediction: ScoreInput | ParsedGoals,
  result: ScoreInput | ParsedGoals,
): ScoredPrediction | null {
  const parsedPrediction = toParsedGoals(prediction);
  const parsedResult = toParsedGoals(result);

  if (!parsedPrediction || !parsedResult) {
    return null;
  }

  const { home: predHome, away: predAway } = parsedPrediction;
  const { home: resHome, away: resAway } = parsedResult;

  if (predHome === resHome && predAway === resAway) {
    return { points: 3, exact: true, outcome: true };
  }

  if (getResult(predHome, predAway) === getResult(resHome, resAway)) {
    return { points: 1, exact: false, outcome: true };
  }

  return { points: 0, exact: false, outcome: false };
}

/** Puntos para persistir en `predictions.points` (0 si no hay resultado). */
export function pointsForStoredPrediction(
  prediction: ScoreInput,
  result: ScoreInput | undefined,
): number {
  if (!result || parseScore(result) === null) {
    return 0;
  }
  return scorePrediction(prediction, result)?.points ?? 0;
}
