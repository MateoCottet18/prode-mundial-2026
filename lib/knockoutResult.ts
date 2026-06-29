import type { Match, Stage } from "@/data/matches";
import {
  parseScore,
  type MatchResult,
  type ResultDecidedBy,
  type ScoreInput,
} from "@/lib/prode";

export function isKnockoutStage(stage: Stage): boolean {
  return stage !== "grupos";
}

export function isKnockoutMatch(match: Match): boolean {
  return isKnockoutStage(match.stage);
}

export type ResolvedResultMeta = {
  winnerTeam: string | null;
  decidedBy: ResultDecidedBy | null;
};

export function resolveResultMeta(
  match: Match,
  score: ScoreInput,
  penaltyWinnerTeam?: string | null,
): { ok: true; meta: ResolvedResultMeta } | { ok: false; error: string } {
  const parsed = parseScore(score);
  if (!parsed) {
    return { ok: false, error: "Marcá un marcador válido." };
  }

  if (!isKnockoutMatch(match)) {
    return { ok: true, meta: { winnerTeam: null, decidedBy: null } };
  }

  if (parsed.home !== parsed.away) {
    return {
      ok: true,
      meta: {
        winnerTeam: parsed.home > parsed.away ? match.homeTeam : match.awayTeam,
        decidedBy: "regular",
      },
    };
  }

  if (!penaltyWinnerTeam) {
    return { ok: false, error: "Definí quién avanzó por penales." };
  }

  if (penaltyWinnerTeam !== match.homeTeam && penaltyWinnerTeam !== match.awayTeam) {
    return { ok: false, error: "Ganador por penales inválido." };
  }

  return {
    ok: true,
    meta: { winnerTeam: penaltyWinnerTeam, decidedBy: "penalties" },
  };
}

export function needsPenaltyWinnerDefinition(
  match: Match,
  result?: MatchResult,
): boolean {
  if (!isKnockoutMatch(match) || !result) return false;
  const score = parseScore(result);
  if (!score || score.home !== score.away) return false;
  return !result.winnerTeam;
}

export function formatPenaltyAdvanceLabel(winnerTeam: string): string {
  return `Pasó ${winnerTeam} por penales`;
}

export function getPenaltyAdvanceLabel(
  match: Match,
  result?: MatchResult,
): string | null {
  if (!result?.winnerTeam || result.decidedBy !== "penalties") return null;
  return formatPenaltyAdvanceLabel(result.winnerTeam);
}
