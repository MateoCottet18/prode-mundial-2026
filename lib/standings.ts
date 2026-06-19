import {
  groupNames,
  matches as staticMatches,
  type GroupName,
  type Match,
  type Stage,
  type TeamSource,
} from "@/data/matches";
import { officialRoundOf32Slots, type QualifierSlot } from "@/data/knockout";
import {
  mergeKnockoutSchedule,
  resolveKnockoutSchedule,
  type KnockoutScheduleMap,
} from "@/lib/knockoutSchedule";
import { parseScore, type ResultsByMatch } from "@/lib/prode";

/**
 * NOTA: estas funciones aceptan `matchesList` y `overrides` opcionales.
 *
 * `matchesList` por default es el calendario estático de `data/matches.ts`,
 * `overrides` por default es vacío (cálculo 100% automático). Los callers que
 * usan `useMatches()` + `useQualificationOverrides()` siempre pasan los datos
 * vivos de Supabase para que las tablas y el bracket reflejen lo último.
 *
 * Sobre overrides: ver `supabase/qualification_overrides.sql`.
 *   * Slots de grupo:        '1A'..'2L'
 *   * Mejores terceros:      'BEST_THIRD_1'..'BEST_THIRD_8'
 *   * Lado puntual de KO:    '<stage>-<index>-<home|away>'
 */

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

/**
 * Mapa slot → equipo elegido manualmente por el admin.
 * Las claves son los `slot` definidos en `qualification_overrides.sql`.
 * Si una clave está presente, su valor reemplaza al cálculo automático.
 */
export type QualificationOverrides = Record<string, string>;

export function getGroupStandings(
  results: ResultsByMatch,
  matchesList: Match[] = staticMatches,
) {
  const standings = Object.fromEntries(
    groupNames.map((group) => {
      const teams = new Set<string>();

      matchesList
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

  matchesList.forEach((match) => {
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

export function getKnockoutMatches(
  results: ResultsByMatch,
  matchesList: Match[] = staticMatches,
  overrides: QualificationOverrides = {},
  knockoutScheduleInput: KnockoutScheduleMap = {},
) {
  const schedule = resolveKnockoutSchedule(knockoutScheduleInput);
  const standings = getGroupStandings(results, matchesList);
  const thirdPlacedTeams = getThirdPlacedTeams(standings);

  const roundOf32 = officialRoundOf32Slots.map(([homeSlot, awaySlot], index) => {
    const matchIndex = index + 1;
    const home = pickQualifierTeam(
      `16avos-${matchIndex}-home`,
      qualifierSlotId(homeSlot),
      () => resolveQualifierSlot(homeSlot, standings, thirdPlacedTeams),
      overrides,
    );
    const away = pickQualifierTeam(
      `16avos-${matchIndex}-away`,
      qualifierSlotId(awaySlot),
      () => resolveQualifierSlot(awaySlot, standings, thirdPlacedTeams),
      overrides,
    );

    return mergeKnockoutSchedule(
      buildKnockoutMatch("16avos", matchIndex, home, away),
      schedule,
    );
  });

  const octavos = buildNextRound("octavos", roundOf32, results, overrides, schedule);
  const cuartos = buildNextRound("cuartos", octavos, results, overrides, schedule);
  const semifinal = buildNextRound("semifinal", cuartos, results, overrides, schedule);
  const final = buildNextRound("final", semifinal, results, overrides, schedule);
  const tercerPuesto = mergeKnockoutSchedule(
    buildThirdPlaceMatch(semifinal, results, overrides),
    schedule,
  );

  return {
    "16avos": roundOf32,
    octavos,
    cuartos,
    semifinal,
    final,
    tercerPuesto,
  } satisfies Record<Exclude<Stage, "grupos">, Match[]> & { tercerPuesto: Match };
}

export function getAllGeneratedMatches(
  results: ResultsByMatch,
  matchesList: Match[] = staticMatches,
  overrides: QualificationOverrides = {},
  knockoutScheduleInput: KnockoutScheduleMap = {},
) {
  const knockout = getKnockoutMatches(
    results,
    matchesList,
    overrides,
    knockoutScheduleInput,
  );

  return [
    ...matchesList,
    ...knockout["16avos"],
    ...knockout.octavos,
    ...knockout.cuartos,
    ...knockout.semifinal,
    ...knockout.final,
    knockout.tercerPuesto,
  ];
}

/**
 * Devuelve el "perdedor" de un partido eliminatorio si está cargado el resultado;
 * si no, devuelve null. Empate -> null (no hay perdedor sin penales modelados).
 */
export function getMatchLoser(match: Match, results: ResultsByMatch) {
  const score = parseScore(results[match.id]);
  if (!score || score.home === score.away) {
    return null;
  }
  return score.home > score.away ? match.awayTeam : match.homeTeam;
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

/**
 * Devuelve el id de slot textual de un `QualifierSlot` para mirar en
 * `qualification_overrides`. Ej: { type:'position', group:'Grupo A', position:1 } -> '1A'
 */
export function qualifierSlotId(slot: QualifierSlot): string {
  if (slot.type === "third") {
    return `BEST_THIRD_${slot.index}`;
  }
  const letter = slot.group.replace("Grupo ", "");
  return `${slot.position}${letter}`;
}

/**
 * Lista predefinida de los 32 slots base que el admin puede sobreescribir
 * desde el panel: 24 (1A..2L) + 8 (BEST_THIRD_1..8). Usada por la UI admin
 * para mostrar la grilla. Otros slots (lado puntual de KO) son válidos en DB
 * pero no aparecen en esta lista.
 */
export const baseQualifierSlots: { id: string; label: string }[] = [
  ...groupNames.flatMap((group) => {
    const letter = group.replace("Grupo ", "");
    return [
      { id: `1${letter}`, label: `1° ${group}` },
      { id: `2${letter}`, label: `2° ${group}` },
    ];
  }),
  ...Array.from({ length: 8 }, (_, index) => ({
    id: `BEST_THIRD_${index + 1}`,
    label: `${index + 1}° mejor tercero`,
  })),
];

function pickQualifierTeam(
  matchSideId: string,
  slotId: string | null,
  computeAuto: () => string,
  overrides: QualificationOverrides,
): { team: string; source: TeamSource } {
  const matchOverride = overrides[matchSideId];
  if (matchOverride) {
    console.log(`[overrides] usando override para slot ${matchSideId} -> ${matchOverride}`);
    return { team: matchOverride, source: "manual" };
  }
  if (slotId) {
    const slotOverride = overrides[slotId];
    if (slotOverride) {
      console.log(`[overrides] usando override para slot ${slotId} -> ${slotOverride}`);
      return { team: slotOverride, source: "manual" };
    }
  }
  return { team: computeAuto(), source: "auto" };
}

function resolveQualifierSlot(
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

function buildKnockoutMatch(
  stage: Exclude<Stage, "grupos">,
  index: number,
  home: { team: string; source: TeamSource },
  away: { team: string; source: TeamSource },
): Match {
  return {
    id: `${stage}-${index}`,
    group: stage,
    matchday: null,
    stage,
    date: "A definir",
    time: "A definir",
    homeTeam: home.team,
    awayTeam: away.team,
    homeTeamSource: home.source,
    awayTeamSource: away.source,
    venue: "A definir",
    city: "A definir",
  };
}

function buildThirdPlaceMatch(
  semis: Match[],
  results: ResultsByMatch,
  overrides: QualificationOverrides,
): Match {
  const semi1 = semis[0];
  const semi2 = semis[1];

  const home = pickQualifierTeam(
    "tercer-puesto-home",
    null,
    () => {
      const loser = semi1 ? getMatchLoser(semi1, results) : null;
      return loser ?? `Perdedor ${semi1?.id ?? "semifinal-1"}`;
    },
    overrides,
  );
  const away = pickQualifierTeam(
    "tercer-puesto-away",
    null,
    () => {
      const loser = semi2 ? getMatchLoser(semi2, results) : null;
      return loser ?? `Perdedor ${semi2?.id ?? "semifinal-2"}`;
    },
    overrides,
  );

  return {
    id: "tercer-puesto",
    group: "final",
    matchday: null,
    stage: "final",
    date: "A definir",
    time: "A definir",
    homeTeam: home.team,
    awayTeam: away.team,
    homeTeamSource: home.source,
    awayTeamSource: away.source,
    venue: "A definir",
    city: "A definir",
  };
}

function buildNextRound(
  stage: Exclude<Stage, "grupos">,
  previousRound: Match[],
  results: ResultsByMatch,
  overrides: QualificationOverrides,
  schedule: KnockoutScheduleMap,
) {
  return Array.from({ length: previousRound.length / 2 }, (_, index) => {
    const matchIndex = index + 1;
    const homeSource = previousRound[index * 2];
    const awaySource = previousRound[index * 2 + 1];

    const home = pickQualifierTeam(
      `${stage}-${matchIndex}-home`,
      null,
      () => getMatchWinner(homeSource, results) ?? `Ganador ${homeSource.id}`,
      overrides,
    );
    const away = pickQualifierTeam(
      `${stage}-${matchIndex}-away`,
      null,
      () => getMatchWinner(awaySource, results) ?? `Ganador ${awaySource.id}`,
      overrides,
    );

    return mergeKnockoutSchedule(
      buildKnockoutMatch(stage, matchIndex, home, away),
      schedule,
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
