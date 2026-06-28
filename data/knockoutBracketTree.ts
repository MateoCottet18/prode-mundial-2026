/**
 * Árbol oficial FIFA 2026 — quién alimenta a quién en cada ronda.
 * Los ids internos (16avos-1, octavos-1, …) NO cambian; solo las conexiones.
 *
 * Fuente: FIFA M89–M104 / Wikipedia knockout bracket.
 */

/** Par [homeFeedId, awayFeedId] → partido destino index+1 de la ronda siguiente. */
export const FIFA_OCTAVOS_FEEDS: readonly [string, string][] = [
  ["16avos-1", "16avos-2"], // M89
  ["16avos-3", "16avos-4"], // M90
  ["16avos-5", "16avos-6"], // M91
  ["16avos-7", "16avos-8"], // M92
  ["16avos-9", "16avos-10"], // M93
  ["16avos-11", "16avos-12"], // M94
  ["16avos-13", "16avos-14"], // M95
  ["16avos-15", "16avos-16"], // M96
] as const;

/**
 * Cuartos: NO es emparejar octavos consecutivos.
 * M98 = W93+W94 (octavos 5+6), M99 = W91+W92 (octavos 3+4).
 */
export const FIFA_CUARTOS_FEEDS: readonly [string, string][] = [
  ["octavos-1", "octavos-2"], // M97
  ["octavos-5", "octavos-6"], // M98
  ["octavos-3", "octavos-4"], // M99
  ["octavos-7", "octavos-8"], // M100
] as const;

export const FIFA_SEMIFINAL_FEEDS: readonly [string, string][] = [
  ["cuartos-1", "cuartos-2"], // M101
  ["cuartos-3", "cuartos-4"], // M102
] as const;

export const FIFA_FINAL_FEEDS: readonly [string, string][] = [
  ["semifinal-1", "semifinal-2"], // M104
] as const;

/**
 * Orden visual mitad izquierda/derecha del bracket (M101 vs M102).
 * Mitad izquierda → semifinal-1 (M101): ramas M97 + M98.
 * Mitad derecha → semifinal-2 (M102): ramas M99 + M100 (Brasil y Argentina).
 */
export const BRACKET_LEFT_R32_IDS = [
  "16avos-1",
  "16avos-2",
  "16avos-3",
  "16avos-4",
  "16avos-9",
  "16avos-10",
  "16avos-11",
  "16avos-12",
] as const;

export const BRACKET_RIGHT_R32_IDS = [
  "16avos-5",
  "16avos-6",
  "16avos-7",
  "16avos-8",
  "16avos-13",
  "16avos-14",
  "16avos-15",
  "16avos-16",
] as const;

export const BRACKET_LEFT_OCTAVOS_IDS = [
  "octavos-1",
  "octavos-2",
  "octavos-5",
  "octavos-6",
] as const;

export const BRACKET_RIGHT_OCTAVOS_IDS = [
  "octavos-3",
  "octavos-4",
  "octavos-7",
  "octavos-8",
] as const;

export const BRACKET_LEFT_CUARTOS_IDS = ["cuartos-1", "cuartos-2"] as const;
export const BRACKET_RIGHT_CUARTOS_IDS = ["cuartos-3", "cuartos-4"] as const;
