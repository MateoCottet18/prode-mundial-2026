import type { Match, Matchday } from "@/data/matches";
import type { ResultsByMatch } from "@/lib/prode";
import {
  ARGENTINA_TZ,
  formatKickoffArgentina,
  getPredictionLockFromResults,
  parseMatchKickoff,
} from "@/lib/matchTime";

export type PartidosFilter =
  | { type: "fecha"; value: Matchday }
  | { type: "eliminatoria" };

export function isPredictionOpen(
  match: Match,
  results: ResultsByMatch,
  now: Date = new Date(),
): boolean {
  return !getPredictionLockFromResults(match, results, now).locked;
}

function matchdayHasOpenMatches(
  matches: Match[],
  matchday: Matchday,
  results: ResultsByMatch,
  now: Date,
): boolean {
  return matches
    .filter((match) => match.stage === "grupos" && match.matchday === matchday)
    .some((match) => isPredictionOpen(match, results, now));
}

/**
 * Pestaña inicial al entrar a /partidos:
 * primera fecha con partidos abiertos; si ninguna, Fase eliminatoria.
 */
export function getDefaultPartidosFilter(
  matches: Match[],
  results: ResultsByMatch,
  now: Date = new Date(),
): PartidosFilter {
  const matchdays: Matchday[] = [1, 2, 3];
  for (const matchday of matchdays) {
    if (matchdayHasOpenMatches(matches, matchday, results, now)) {
      return { type: "fecha", value: matchday };
    }
  }
  return { type: "eliminatoria" };
}

export function getPartidosFilterLabel(filter: PartidosFilter): string {
  return filter.type === "fecha" ? `Fecha ${filter.value}` : "Fase eliminatoria";
}

export function getMatchesForPartidosFilter(
  filter: PartidosFilter,
  groupMatches: Match[],
  knockoutMatches: Match[],
): Match[] {
  if (filter.type === "eliminatoria") {
    return knockoutMatches;
  }
  return groupMatches.filter(
    (match) => match.stage === "grupos" && match.matchday === filter.value,
  );
}

function getArgentinaDateKey(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ARGENTINA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export type PartidosTabSummary = {
  tabLabel: string;
  openCount: number;
  missingPredictionCount: number;
  closingTodayCount: number;
  nextClose: { label: string; time: string } | null;
};

/**
 * Resumen de la pestaña activa para participantes.
 * Solo cuenta partidos abiertos (sin resultado y antes del kickoff Argentina).
 */
export function summarizePartidosTab(
  filter: PartidosFilter,
  tabMatches: Match[],
  results: ResultsByMatch,
  savedByMatchId: Record<string, boolean | undefined>,
  now: Date = new Date(),
): PartidosTabSummary {
  const tabLabel = getPartidosFilterLabel(filter);
  const openMatches = tabMatches.filter((match) =>
    isPredictionOpen(match, results, now),
  );
  const missingPredictionCount = openMatches.filter(
    (match) => !savedByMatchId[match.id],
  ).length;

  const todayKey = getArgentinaDateKey(now);
  const closingTodayCount = openMatches.filter((match) => {
    const kickoff = parseMatchKickoff(match);
    return kickoff !== null && getArgentinaDateKey(kickoff) === todayKey;
  }).length;

  const upcoming = openMatches
    .map((match) => ({ match, kickoff: parseMatchKickoff(match) }))
    .filter(
      (entry): entry is { match: Match; kickoff: Date } =>
        entry.kickoff !== null && entry.kickoff.getTime() > now.getTime(),
    )
    .sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());

  const next = upcoming[0];
  const nextClose = next
    ? {
        label: `${next.match.homeTeam} vs ${next.match.awayTeam}`,
        time: formatKickoffArgentina(next.kickoff),
      }
    : null;

  return {
    tabLabel,
    openCount: openMatches.length,
    missingPredictionCount,
    closingTodayCount,
    nextClose,
  };
}
