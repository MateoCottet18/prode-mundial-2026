import type { Match } from "@/data/matches";

export type BracketRound =
  | "16avos"
  | "octavos"
  | "cuartos"
  | "semifinal"
  | "final"
  | "tercer-puesto";

export type BracketSide = "left" | "right";

export type BracketMode = "view" | "admin";

/**
 * Estructura armada del bracket completo.
 *
 * Convención FIFA 2026: mitad izquierda alimenta semifinal-1 (M101),
 * mitad derecha alimenta semifinal-2 (M102). Ver `data/knockoutBracketTree.ts`.
 *
 * `final` y `tercerPuesto` se renderizan al centro junto al trofeo.
 */
export type BracketLayout = {
  left: {
    r32: Match[]; // 8
    octavos: Match[]; // 4
    cuartos: Match[]; // 2
    semifinal: Match; // 1
  };
  right: {
    r32: Match[]; // 8
    octavos: Match[]; // 4
    cuartos: Match[]; // 2
    semifinal: Match; // 1
  };
  final: Match;
  tercerPuesto: Match;
};
