import type { Match } from "@/data/matches";
import {
  calculatePoints,
  getParticipantUsers,
  type AppUser,
  type PredictionsByUser,
  type ResultsByMatch,
  type SavedPredictionsByUser,
} from "@/lib/prode";
import {
  getAllGeneratedMatches,
  type QualificationOverrides,
} from "@/lib/standings";

export type RankingEntry = {
  rank: number;
  userKey: string;
  username: string;
  displayName: string;
  points: number;
  savedCount: number;
  /** Predicciones acertadas exactas (3 puntos). */
  exactCount: number;
  /**
   * Predicciones que acertaron resultado exacto (3 pts) o ganador/empate (1 pt).
   * Es decir: cualquier acierto, incluyendo los exactos.
   */
  correctOutcomesCount: number;
};

/**
 * Construye el ranking de participantes con criterio oficial de desempate.
 *
 * Orden:
 *   1. points         desc (mayor puntaje gana)
 *   2. exactCount     desc (más resultados exactos)
 *   3. correctOutcomesCount desc (más aciertos totales)
 *   4. username       asc  (orden alfabético estable)
 *
 * El cálculo de `points` no cambia: sigue usando `getUserPoints` /
 * `calculatePoints` (3 / 1 / 0). Lo único nuevo es que recolectamos las
 * estadísticas extras `exactCount` y `correctOutcomesCount` recorriendo los
 * mismos matches una sola vez, así no duplicamos trabajo.
 */
export function buildRanking(
  registeredUsers: AppUser[],
  predictions: PredictionsByUser,
  savedPredictions: SavedPredictionsByUser,
  results: ResultsByMatch,
  matchesList?: Match[],
  overrides: QualificationOverrides = {},
): RankingEntry[] {
  const allMatches = getAllGeneratedMatches(results, matchesList, overrides);
  const matchIds = allMatches.map((match) => match.id);

  return getParticipantUsers(registeredUsers)
    // Defensa adicional: el ranking nunca incluye admins.
    // `getParticipantUsers` ya filtra por role === "participante", pero
    // dejamos este `.filter` explícito para que no haya forma de que un
    // refactor accidental haga aparecer al admin en la tabla pública.
    .filter((participant) => participant.role !== "admin")
    .map((participant) => {
      const userKey = participant.id ?? participant.username;
      const userPredictions = predictions[userKey] ?? {};
      const userSaved = savedPredictions[userKey] ?? {};

      let points = 0;
      let savedCount = 0;
      let exactCount = 0;
      let correctOutcomesCount = 0;

      for (const matchId of matchIds) {
        const isSaved = Boolean(userSaved[matchId]);
        if (!isSaved) {
          continue;
        }
        savedCount += 1;
        const matchPoints = calculatePoints(
          userPredictions[matchId],
          results[matchId],
          true,
        );
        if (matchPoints === null) {
          continue;
        }
        points += matchPoints;
        if (matchPoints === 3) {
          exactCount += 1;
          correctOutcomesCount += 1;
        } else if (matchPoints === 1) {
          correctOutcomesCount += 1;
        }
      }

      return {
        userKey,
        username: participant.username,
        displayName: participant.displayName,
        points,
        savedCount,
        exactCount,
        correctOutcomesCount,
      };
    })
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.exactCount - a.exactCount ||
        b.correctOutcomesCount - a.correctOutcomesCount ||
        a.username.localeCompare(b.username),
    )
    .reduce<RankingEntry[]>((acc, entry, index) => {
      // Compartimos posición si la entrada anterior empata en puntos +
      // exactos + aciertos (regla: "se compartirá la posición hasta que
      // exista otro criterio"). Si difieren en cualquier criterio, ocupan
      // posiciones distintas.
      const prev = acc[index - 1];
      const tied =
        prev !== undefined &&
        prev.points === entry.points &&
        prev.exactCount === entry.exactCount &&
        prev.correctOutcomesCount === entry.correctOutcomesCount;
      const rank = tied ? prev.rank : index + 1;
      acc.push({ ...entry, rank });
      return acc;
    }, []);
}
