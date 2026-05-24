import type { Match } from "@/data/matches";
import type { ResultsByMatch } from "@/lib/prode";
import {
  getKnockoutMatches,
  type QualificationOverrides,
} from "@/lib/standings";
import type { BracketLayout } from "@/types/bracket";

/**
 * Toma los partidos de fase eliminatoria generados por `getKnockoutMatches`
 * y los reorganiza en una estructura espejada lista para el bracket visual.
 *
 * Convención FIFA 2026 (32 → 16 → 8 → 4 → 2 → 1):
 *   - Mitad izquierda  = 16avos #1..8, octavos #1..4, cuartos #1..2, semi #1
 *   - Mitad derecha    = 16avos #9..16, octavos #5..8, cuartos #3..4, semi #2
 *   - Centro           = final + tercer puesto
 *
 * Esta función es pura: no toca Supabase ni el state. Recibe `matchesList` y
 * `overrides` y se los pasa a `getKnockoutMatches` para que el cálculo respete
 * los overrides manuales del admin.
 */
export function buildBracket(
  results: ResultsByMatch,
  matchesList: Match[],
  overrides: QualificationOverrides = {},
): BracketLayout {
  const ko = getKnockoutMatches(results, matchesList, overrides);

  return {
    left: {
      r32: ko["16avos"].slice(0, 8),
      octavos: ko.octavos.slice(0, 4),
      cuartos: ko.cuartos.slice(0, 2),
      semifinal: ko.semifinal[0],
    },
    right: {
      r32: ko["16avos"].slice(8, 16),
      octavos: ko.octavos.slice(4, 8),
      cuartos: ko.cuartos.slice(2, 4),
      semifinal: ko.semifinal[1],
    },
    final: ko.final[0],
    tercerPuesto: ko.tercerPuesto,
  };
}
