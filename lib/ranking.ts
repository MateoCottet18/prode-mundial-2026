import type { Match } from "@/data/matches";
import {
  calculatePoints,
  getParticipantUsers,
  type AppUser,
  type PredictionsByUser,
  type ResultsByMatch,
  type SavedPredictionsByUser,
} from "@/lib/prode";
import type { PredictionAggregate } from "@/lib/services/predictionService";
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
  /**
   * Timestamp de inscripción del participante. Se usa SOLO para desempate
   * en `sortAndRank`. No se muestra en la UI.
   */
  createdAt?: string;
};

/**
 * Aplica el orden oficial de desempate al ranking ya con stats por usuario.
 *
 * Orden oficial de desempate:
 *   1. points                desc
 *   2. exactCount            desc
 *   3. correctOutcomesCount  desc
 *   4. username              asc
 */
function sortAndRank(
  entries: Omit<RankingEntry, "rank">[],
): RankingEntry[] {
  return entries
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.exactCount - a.exactCount ||
        b.correctOutcomesCount - a.correctOutcomesCount ||
        a.username.localeCompare(b.username, "es", { sensitivity: "base" }),
    )
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

/**
 * Construye el ranking a partir de los agregados pre-calculados que devuelve
 * `public.prediction_aggregates` (view).
 *
 * Esta es la fast-path para 500+ usuarios: el cliente no recorre 52k filas
 * de predicciones, sólo hace lookup por userId en un mapa de 500 entries.
 *
 * Si un participante no tiene fila en los agregados (todavía no guardó
 * ninguna predicción) se incluye con todo en 0 — así sigue apareciendo en
 * la tabla con su nombre.
 */
export function buildRankingFromAggregates(
  registeredUsers: AppUser[],
  aggregates: PredictionAggregate[],
): RankingEntry[] {
  const byUserId = new Map<string, PredictionAggregate>();
  for (const agg of aggregates) {
    byUserId.set(agg.userId, agg);
  }

  const entries = getParticipantUsers(registeredUsers)
    .filter((participant) => participant.role !== "admin")
    .map((participant) => {
      const userKey = participant.id ?? participant.username;
      const agg = participant.id ? byUserId.get(participant.id) : undefined;
      return {
        userKey,
        username: participant.username,
        displayName: participant.displayName,
        points: agg?.points ?? 0,
        savedCount: agg?.savedCount ?? 0,
        exactCount: agg?.exactCount ?? 0,
        correctOutcomesCount: agg?.correctOutcomesCount ?? 0,
        createdAt: participant.createdAt,
      } satisfies Omit<RankingEntry, "rank">;
    });

  return sortAndRank(entries);
}

/**
 * Construye el ranking de participantes con criterio oficial de desempate.
 *
 * Orden oficial de desempate:
 *   1. points                desc
 *   2. exactCount            desc
 *   3. correctOutcomesCount  desc
 *   4. username              asc
 *
 * El cálculo de `points` no cambia: sigue usando `calculatePoints` (3/1/0).
 * Las estadísticas extras se recolectan recorriendo los matches una sola
 * vez para no duplicar trabajo.
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

  // Defensa adicional: el ranking nunca incluye admins.
  // `getParticipantUsers` ya filtra por role === "participante", pero
  // dejamos este `.filter` explícito para que no haya forma de que un
  // refactor accidental haga aparecer al admin en la tabla pública.
  const entries: Omit<RankingEntry, "rank">[] = getParticipantUsers(registeredUsers)
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
        createdAt: participant.createdAt,
      };
    });

  return sortAndRank(entries);
}
