import {
  syncWorldCupResults,
  worldCup2026Fixture,
  worldCup2026Groups,
  worldCup2026OfficialCrosses,
  worldCup2026Sources,
  worldCup2026Teams,
} from "@/data/worldcup2026";

export function getOfficialTeams() {
  return worldCup2026Teams;
}

export function getOfficialMatches() {
  return worldCup2026Fixture;
}

export async function syncWorldCupData() {
  const resultSync = await syncWorldCupResults();

  return {
    teams: worldCup2026Teams,
    groups: worldCup2026Groups,
    matches: worldCup2026Fixture,
    knockout: worldCup2026OfficialCrosses,
    sources: worldCup2026Sources,
    results: resultSync.results,
    syncedAt: resultSync.syncedAt,
    source: resultSync.source,
  };
}
