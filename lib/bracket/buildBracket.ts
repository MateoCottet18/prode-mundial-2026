import type { Match } from "@/data/matches";
import {
  BRACKET_LEFT_CUARTOS_IDS,
  BRACKET_LEFT_OCTAVOS_IDS,
  BRACKET_LEFT_R32_IDS,
  BRACKET_RIGHT_CUARTOS_IDS,
  BRACKET_RIGHT_OCTAVOS_IDS,
  BRACKET_RIGHT_R32_IDS,
} from "@/data/knockoutBracketTree";
import type { KnockoutScheduleMap } from "@/data/knockoutKickoff";
import type { ResultsByMatch } from "@/lib/prode";
import {
  getKnockoutMatches,
  type QualificationOverrides,
} from "@/lib/standings";
import type { BracketLayout } from "@/types/bracket";

function pickByIds(matches: Match[], ids: readonly string[]): Match[] {
  const byId = new Map(matches.map((match) => [match.id, match]));
  return ids.map((id) => {
    const match = byId.get(id);
    if (!match) {
      throw new Error(`[bracket] partido no encontrado: ${id}`);
    }
    return match;
  });
}

/**
 * Reorganiza el KO en layout espejado según el árbol FIFA 2026.
 *
 * Mitad izquierda (M101): 16avos 1–4 + 9–12 → oct 1,2,5,6 → cuartos 1–2 → semi-1
 * Mitad derecha (M102): 16avos 5–8 + 13–16 → oct 3,4,7,8 → cuartos 3–4 → semi-2
 */
export function buildBracket(
  results: ResultsByMatch,
  matchesList: Match[],
  overrides: QualificationOverrides = {},
  knockoutSchedule: KnockoutScheduleMap = {},
): BracketLayout {
  const ko = getKnockoutMatches(results, matchesList, overrides, knockoutSchedule);

  return {
    left: {
      r32: pickByIds(ko["16avos"], BRACKET_LEFT_R32_IDS),
      octavos: pickByIds(ko.octavos, BRACKET_LEFT_OCTAVOS_IDS),
      cuartos: pickByIds(ko.cuartos, BRACKET_LEFT_CUARTOS_IDS),
      semifinal: ko.semifinal[0],
    },
    right: {
      r32: pickByIds(ko["16avos"], BRACKET_RIGHT_R32_IDS),
      octavos: pickByIds(ko.octavos, BRACKET_RIGHT_OCTAVOS_IDS),
      cuartos: pickByIds(ko.cuartos, BRACKET_RIGHT_CUARTOS_IDS),
      semifinal: ko.semifinal[1],
    },
    final: ko.final[0],
    tercerPuesto: ko.tercerPuesto,
  };
}
