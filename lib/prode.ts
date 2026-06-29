import { matches } from "@/data/matches";

export type UserRole = "participante" | "admin";
export type PaymentStatus = "pending" | "pending_review" | "approved" | "rejected";

/**
 * Información mínima del último intento de pago de un usuario.
 *
 * El flujo nuevo NO sube archivo: el usuario solo declara `payerName` (quien
 * hizo la transferencia) y el admin aprueba/rechaza. Los campos `file*` y
 * `storagePath` quedan opcionales y sólo aparecen en filas legacy de
 * `public.payments` que ya tenían comprobantes.
 */
export type PaymentProof = {
  payerName?: string | null;
  uploadedAt: string;
  status: PaymentStatus;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
};

export type AppUser = {
  id?: string;
  username: string;
  password: string;
  role: UserRole;
  displayName: string;
  email?: string;
  paymentStatus: PaymentStatus;
  paymentProof?: PaymentProof;
  paidAt?: string;
  rejectedAt?: string;
  /**
   * ISO timestamp de creación del profile en Supabase. Lo usamos como
   * último criterio de desempate del ranking: si dos participantes tienen
   * todos los criterios numéricos iguales, gana el que se inscribió antes.
   */
  createdAt?: string;
};

export type SessionUser = {
  userId: string;
  username: string;
  name: string;
  role: UserRole;
  paymentStatus: PaymentStatus;
};

export type ScoreInput = {
  home: string;
  away: string;
};

export type ResultDecidedBy = "regular" | "penalties";

/** Resultado real persistido (goles + metadatos opcionales de eliminatoria). */
export type MatchResult = ScoreInput & {
  winnerTeam?: string | null;
  decidedBy?: ResultDecidedBy | null;
};

export type PredictionsByUser = Record<string, Record<string, ScoreInput>>;
export type SavedPredictionsByUser = Record<string, Record<string, boolean>>;
export type ResultsByMatch = Record<string, MatchResult>;

export const emptyScore: ScoreInput = { home: "", away: "" };

// Seed users / `authenticate()` / `getAllUsers()` se eliminaron a propósito:
// la única fuente de verdad para usuarios es ahora `public.profiles`
// (cargada vía `lib/services/profileService.ts > fetchProfiles`).

export function parseScore(score?: ScoreInput) {
  if (!score) {
    return null;
  }

  const home = score.home === "" ? Number.NaN : Number(score.home);
  const away = score.away === "" ? Number.NaN : Number(score.away);

  if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0) {
    return null;
  }

  return { home, away };
}

export function getResult(home: number, away: number) {
  if (home > away) {
    return "local";
  }

  if (away > home) {
    return "visitante";
  }

  return "empate";
}

export function calculatePoints(prediction?: ScoreInput, result?: ScoreInput, isSaved = false) {
  if (!isSaved) {
    return null;
  }

  const parsedPrediction = parseScore(prediction);
  const parsedResult = parseScore(result);

  if (!parsedPrediction || !parsedResult) {
    return null;
  }

  if (parsedPrediction.home === parsedResult.home && parsedPrediction.away === parsedResult.away) {
    return 3;
  }

  return getResult(parsedPrediction.home, parsedPrediction.away) ===
    getResult(parsedResult.home, parsedResult.away)
    ? 1
    : 0;
}

export function getPredictionStatus(
  prediction?: ScoreInput,
  result?: ScoreInput,
  isSaved = false,
) {
  if (parseScore(result)) {
    return "Resultado cargado";
  }

  if (isSaved && parseScore(prediction)) {
    return "Predicción guardada";
  }

  return "Pendiente";
}

export function getUserPoints(
  username: string,
  predictions: PredictionsByUser,
  savedPredictions: SavedPredictionsByUser,
  results: ResultsByMatch,
  matchIds = matches.map((match) => match.id),
) {
  return matchIds.reduce((total, matchId) => {
    const points = calculatePoints(
      predictions[username]?.[matchId],
      results[matchId],
      savedPredictions[username]?.[matchId],
    );

    return total + (points ?? 0);
  }, 0);
}

export function getParticipantUsers(registeredUsers: AppUser[] = []) {
  return registeredUsers.filter((user) => user.role === "participante");
}

export function normalizePaymentStatus(status: PaymentStatus | "pendiente" | "confirmado") {
  if (status === "confirmado") {
    return "approved";
  }

  if (status === "pendiente") {
    return "pending";
  }

  return status ?? "pending";
}
