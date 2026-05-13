import { matches } from "@/data/matches";

export type UserRole = "participante" | "admin";
export type PaymentStatus = "pending" | "pending_review" | "approved" | "rejected";

export type PaymentProof = {
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  status: PaymentStatus;
};

export type AppUser = {
  username: string;
  password: string;
  role: UserRole;
  displayName: string;
  paymentStatus: PaymentStatus;
  paymentProof?: PaymentProof;
  paidAt?: string;
  rejectedAt?: string;
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

export type PredictionsByUser = Record<string, Record<string, ScoreInput>>;
export type SavedPredictionsByUser = Record<string, Record<string, boolean>>;
export type ResultsByMatch = Record<string, ScoreInput>;

export const emptyScore: ScoreInput = { home: "", away: "" };

export const fixedUsers: AppUser[] = [
  {
    username: "admin",
    password: "admin123",
    role: "admin",
    displayName: "Admin",
    paymentStatus: "approved",
  },
];

export const seedParticipantUsers: AppUser[] = [
  {
    username: "mateo",
    password: "mateo123",
    role: "participante",
    displayName: "Mateo",
    paymentStatus: "approved",
  },
];

export function authenticate(username: string, password: string, registeredUsers: AppUser[] = []) {
  const user = getAllUsers(registeredUsers).find(
    (candidate) => candidate.username === username && candidate.password === password,
  );

  if (!user) {
    return null;
  }

  return {
    userId: user.username,
    username: user.username,
    name: user.displayName,
    role: user.role,
    paymentStatus: normalizePaymentStatus(user.paymentStatus),
  } satisfies SessionUser;
}

export function getAllUsers(registeredUsers: AppUser[] = []) {
  return [...fixedUsers, ...seedParticipantUsers, ...registeredUsers];
}

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
  return [...seedParticipantUsers, ...registeredUsers].filter(
    (user) => user.role === "participante",
  );
}

function normalizePaymentStatus(status: PaymentStatus | "pendiente" | "confirmado") {
  if (status === "confirmado") {
    return "approved";
  }

  if (status === "pendiente") {
    return "pending";
  }

  return status ?? "pending";
}
