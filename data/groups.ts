import { groupNames, matches, type GroupName } from "@/data/matches";

export type WorldCupGroup = {
  name: GroupName;
  teams: string[];
};

export const worldCup2026Groups: WorldCupGroup[] = groupNames.map((group) => {
  const teams = new Set<string>();

  matches
    .filter((match) => match.group === group)
    .forEach((match) => {
      teams.add(match.homeTeam);
      teams.add(match.awayTeam);
    });

  return { name: group, teams: [...teams] };
});
