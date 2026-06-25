import type { GroupName } from "@/data/matches";

export type QualifierSlot =
  | { type: "position"; group: GroupName; position: 1 | 2 }
  /** @deprecated Usar third_pool. Mantenido para compat con overrides legacy. */
  | { type: "third"; index: number }
  /** Mejor tercero según Anexo C FIFA — oponente de un ganador de grupo. */
  | {
      type: "third_pool";
      winnerGroup: GroupName;
      eligibleGroups: GroupName[];
    };

const G = (letter: string): GroupName => `Grupo ${letter}` as GroupName;
const W1 = (letter: string) => ({ type: "position" as const, group: G(letter), position: 1 as const });
const R2 = (letter: string) => ({ type: "position" as const, group: G(letter), position: 2 as const });
const T3 = (winnerLetter: string, poolLetters: string) => ({
  type: "third_pool" as const,
  winnerGroup: G(winnerLetter),
  eligibleGroups: poolLetters.split("").map((l) => G(l)),
});

/**
 * Cruces oficiales R32 (16avos) alineados con FIFA M73–M88.
 * Índice N-1 → id `16avos-N` → `KNOCKOUT_FIFA_MATCH_NUMBER` en knockoutKickoff.ts.
 *
 * Fuente: FIFA / Sofascore bracket — jun 2026.
 */
export const officialRoundOf32Slots: [QualifierSlot, QualifierSlot][] = [
  [W1("E"), T3("E", "ABCDF")], // 16avos-1 → M74 Germany vs 3rd A/B/C/D/F
  [W1("I"), T3("I", "CDFGH")], // 16avos-2 → M77
  [R2("A"), R2("B")], // 16avos-3 → M73 South Africa vs Canada
  [W1("F"), R2("C")], // 16avos-4 → M75
  [W1("C"), R2("F")], // 16avos-5 → M76 Brazil vs 2F
  [R2("E"), R2("I")], // 16avos-6 → M78
  [W1("A"), T3("A", "CEFHI")], // 16avos-7 → M79 Mexico vs 3rd
  [W1("L"), T3("L", "EHIJK")], // 16avos-8 → M80
  [R2("K"), R2("L")], // 16avos-9 → M83
  [W1("H"), R2("J")], // 16avos-10 → M84
  [W1("D"), T3("D", "BEFIJ")], // 16avos-11 → M81 USA vs 3rd
  [W1("G"), T3("G", "AEHIJ")], // 16avos-12 → M82
  [W1("J"), R2("H")], // 16avos-13 → M86 Argentina vs 2H
  [R2("D"), R2("G")], // 16avos-14 → M88
  [W1("B"), T3("B", "EFGIJ")], // 16avos-15 → M85 Switzerland vs 3rd
  [W1("K"), T3("K", "DEIJL")], // 16avos-16 → M87
];

export const officialKnockoutStages = [
  "16avos",
  "Octavos",
  "Cuartos",
  "Semifinal",
  "Final",
] as const;
