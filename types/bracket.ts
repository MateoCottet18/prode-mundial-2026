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
 * Convención: el bracket se dibuja espejado. La mitad izquierda contiene los
 * primeros 8 partidos de 16avos, los primeros 4 de octavos, los 2 primeros de
 * cuartos y la primera semifinal. La mitad derecha contiene el resto.
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
