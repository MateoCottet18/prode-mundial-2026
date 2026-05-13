import { worldCup2026Groups } from "@/data/groups";
import { officialKnockoutStages, officialRoundOf32Slots } from "@/data/knockout";
import { matches, type Match } from "@/data/matches";
import { worldCup2026Teams } from "@/data/teams";
import type { ResultsByMatch, ScoreInput } from "@/lib/prode";

export type WorldCupResultSyncPayload = {
  results: ResultsByMatch;
  syncedAt: string;
  source: "mock" | "official-api";
};

export const worldCup2026Sources = {
  teams: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/teams",
  matchSchedule:
    "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/match-schedule",
};

export const worldCup2026Fixture: Match[] = matches;

export { worldCup2026Groups, worldCup2026Teams };

export const worldCup2026KnockoutStructure = officialKnockoutStages;

export const worldCup2026OfficialCrosses = officialRoundOf32Slots;

// Prepared integration point: replace the mock source with an official sports data API.
export async function syncWorldCupResults(): Promise<WorldCupResultSyncPayload> {
  const mockResults: Record<string, ScoreInput> = {};

  return {
    results: mockResults,
    syncedAt: new Date().toISOString(),
    source: "mock",
  };
}
