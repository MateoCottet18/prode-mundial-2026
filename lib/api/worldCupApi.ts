import { worldCup2026Fixture, worldCup2026Groups, worldCup2026Teams } from "@/data/worldcup2026";

export async function getWorldCupTeams() {
  return worldCup2026Teams;
}

export async function getWorldCupMatches() {
  return worldCup2026Fixture;
}

export async function getWorldCupGroups() {
  return worldCup2026Groups;
}

export async function syncWorldCupDataFromExternalApi() {
  return {
    teams: worldCup2026Teams,
    groups: worldCup2026Groups,
    matches: worldCup2026Fixture,
    source: "local-fallback",
    syncedAt: new Date().toISOString(),
  };
}
