import { groupNames, matches, type GroupName, type Match, type Stage } from "@/data/matches";
import { officialRoundOf32Slots, type QualifierSlot } from "@/data/knockout";
import { parseScore, type ResultsByMatch } from "@/lib/prode";

export type TeamStanding = {
  team: string;
  group: GroupName;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

export function getGroupStandings(results: ResultsByMatch) {
  const standings = Object.fromEntries(
    groupNames.map((group) => {
      const teams = new Set<string>();

      matches
        .filter((match) => match.group === group)
        .forEach((match) => {
          teams.add(match.homeTeam);
          teams.add(match.awayTeam);
        });

      return [
        group,
        [...teams].map((team) => ({
          team,
          group,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
        })),
      ];
    }),
  ) as Record<GroupName, TeamStanding[]>;

  matches.forEach((match) => {
    const score = parseScore(results[match.id]);

    if (!score || !groupNames.includes(match.group as GroupName)) {
      return;
    }

    const group = match.group as GroupName;
    const homeStanding = standings[group].find((standing) => standing.team === match.homeTeam);
    const awayStanding = standings[group].find((standing) => standing.team === match.awayTeam);

    if (!homeStanding || !awayStanding) {
      return;
    }

    homeStanding.played += 1;
    awayStanding.played += 1;
    homeStanding.goalsFor += score.home;
    homeStanding.goalsAgainst += score.away;
    awayStanding.goalsFor += score.away;
    awayStanding.goalsAgainst += score.home;

    if (score.home > score.away) {
      homeStanding.won += 1;
      homeStanding.points += 3;
      awayStanding.lost += 1;
    } else if (score.away > score.home) {
      awayStanding.won += 1;
      awayStanding.points += 3;
      homeStanding.lost += 1;
    } else {
      homeStanding.drawn += 1;
      awayStanding.drawn += 1;
      homeStanding.points += 1;
      awayStanding.points += 1;
    }
  });

  groupNames.forEach((group) => {
    standings[group].forEach((standing) => {
      standing.goalDifference = standing.goalsFor - standing.goalsAgainst;
    });
    standings[group].sort(compareStandings);
  });

  return standings;
}

export function getThirdPlacedTeams(standings: Record<GroupName, TeamStanding[]>) {
  return groupNames
    .filter((group) => isGroupComplete(standings[group]))
    .map((group) => standings[group][2])
    .filter(Boolean)
    .sort(compareStandings)
    .slice(0, 8);
}

export function getKnockoutMatches(results: ResultsByMatch) {
  const standings = getGroupStandings(results);
  const thirdPlacedTeams = getThirdPlacedTeams(standings);
  const roundOf32 = officialRoundOf32Slots.map(([homeSlot, awaySlot], index) =>
    buildKnockoutMatch("16avos", index + 1, resolveSlot(homeSlot, standings, thirdPlacedTeams), resolveSlot(awaySlot, standings, thirdPlacedTeams)),
  );
  const octavos = buildNextRound("octavos", roundOf32, results);
  const cuartos = buildNextRound("cuartos", octavos, results);
  const semifinal = buildNextRound("semifinal", cuartos, results);
  const final = buildNextRound("final", semifinal, results);

  return {
    "16avos": roundOf32,
    octavos,
    cuartos,
    semifinal,
    final,
  } satisfies Record<Exclude<Stage, "grupos">, Match[]>;
}

export function getAllGeneratedMatches(results: ResultsByMatch) {
  const knockout = getKnockoutMatches(results);

  return [
    ...matches,
    ...knockout["16avos"],
    ...knockout.octavos,
    ...knockout.cuartos,
    ...knockout.semifinal,
    ...knockout.final,
  ];
}

export function getMatchWinner(match: Match, results: ResultsByMatch) {
  const score = parseScore(results[match.id]);

  if (!score) {
    return null;
  }

  if (score.home === score.away) {
    return null;
  }

  return score.home > score.away ? match.homeTeam : match.awayTeam;
}

function resolveSlot(
  slot: QualifierSlot,
  standings: Record<GroupName, TeamStanding[]>,
  thirdPlacedTeams: TeamStanding[],
) {
  if (slot.type === "third") {
    return thirdPlacedTeams[slot.index - 1]?.team ?? `${slot.index}° mejor tercero`;
  }

  if (!isGroupComplete(standings[slot.group])) {
    return `${slot.position}° ${slot.group}`;
  }

  return standings[slot.group][slot.position - 1]?.team ?? `${slot.position}° ${slot.group}`;
}

function buildKnockoutMatch(stage: Exclude<Stage, "grupos">, index: number, homeTeam: string, awayTeam: string): Match {
  return {
    id: `${stage}-${index}`,
    group: stage,
    matchday: null,
    stage,
    date: "A definir",
    time: "A definir",
    homeTeam,
    awayTeam,
    venue: "A definir",
    city: "A definir",
  };
}

function buildNextRound(stage: Exclude<Stage, "grupos">, previousRound: Match[], results: ResultsByMatch) {
  return Array.from({ length: previousRound.length / 2 }, (_, index) => {
    const homeSource = previousRound[index * 2];
    const awaySource = previousRound[index * 2 + 1];

    return buildKnockoutMatch(
      stage,
      index + 1,
      getMatchWinner(homeSource, results) ?? `Ganador ${homeSource.id}`,
      getMatchWinner(awaySource, results) ?? `Ganador ${awaySource.id}`,
    );
  });
}

function compareStandings(teamA: TeamStanding, teamB: TeamStanding) {
  return (
    teamB.points - teamA.points ||
    teamB.goalDifference - teamA.goalDifference ||
    teamB.goalsFor - teamA.goalsFor ||
    teamA.team.localeCompare(teamB.team)
  );
}

function isGroupComplete(groupStandings: TeamStanding[]) {
  return groupStandings.every((standing) => standing.played === 3);
}
