import {
  getParticipantUsers,
  getUserPoints,
  type AppUser,
  type PredictionsByUser,
  type ResultsByMatch,
  type SavedPredictionsByUser,
} from "@/lib/prode";
import { getAllGeneratedMatches } from "@/lib/standings";

export type RankingEntry = {
  rank: number;
  userKey: string;
  username: string;
  displayName: string;
  points: number;
  savedCount: number;
};

/**
 * Construye el ranking de participantes ordenado por puntos descendente.
 * Mismo cálculo que la tabla pública: usa los matches generados (grupos + KO)
 * y `getUserPoints` para asegurar consistencia.
 */
export function buildRanking(
  registeredUsers: AppUser[],
  predictions: PredictionsByUser,
  savedPredictions: SavedPredictionsByUser,
  results: ResultsByMatch,
): RankingEntry[] {
  const allMatches = getAllGeneratedMatches(results);
  const matchIds = allMatches.map((match) => match.id);

  return getParticipantUsers(registeredUsers)
    // Defensa adicional: el ranking nunca incluye admins.
    // `getParticipantUsers` ya filtra por role === "participante", pero
    // dejamos este `.filter` explícito para que no haya forma de que un
    // refactor accidental haga aparecer al admin en la tabla pública.
    .filter((participant) => participant.role !== "admin")
    .map((participant) => {
      const userKey = participant.id ?? participant.username;
      return {
        userKey,
        username: participant.username,
        displayName: participant.displayName,
        points: getUserPoints(userKey, predictions, savedPredictions, results, matchIds),
        savedCount: matchIds.filter((id) => savedPredictions[userKey]?.[id]).length,
      };
    })
    .sort((a, b) => b.points - a.points || a.displayName.localeCompare(b.displayName))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}
