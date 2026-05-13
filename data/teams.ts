import { worldCup2026Groups } from "@/data/groups";
import type { GroupName } from "@/data/matches";

export type WorldCupTeam = {
  name: string;
  group: GroupName;
};

export const worldCup2026Teams: WorldCupTeam[] = worldCup2026Groups.flatMap((group) =>
  group.teams.map((team) => ({ name: team, group: group.name })),
);
