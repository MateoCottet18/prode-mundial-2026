export const storageKeys = {
  session: "prode-session",
  registeredUsers: "prode-users",
  predictions: "prode-predictions",
  results: "prode-results",
};

const legacyStorageKeys = {
  session: "prode-mundial-2026-session",
  registeredUsers: "prode-mundial-2026-registered-users",
  predictions: "prode-mundial-2026-predictions",
  savedPredictions: "prode-mundial-2026-saved-predictions",
  results: "prode-mundial-2026-results",
};

export function readStorage<T>(key: string, fallback: T) {
  try {
    const storedValue = window.localStorage.getItem(key);

    if (!storedValue) {
      return fallback;
    }

    return JSON.parse(storedValue) as T;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return { ok: true as const };
  } catch (error) {
    console.warn("No se pudo guardar en localStorage.", error);
    window.dispatchEvent(
      new CustomEvent("prode-storage-error", {
        detail: "No se pudo guardar localmente. Probá limpiar datos locales desde el panel admin.",
      }),
    );
    return { ok: false as const, error };
  }
}

export function removeStorage(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage cleanup errors.
  }
}

export function migrateLegacyStorage() {
  if (typeof window === "undefined") {
    return;
  }

  cleanOversizedCurrentSession();
  migrateLegacySession();
  migrateLegacyUsers();
  migrateLegacyPredictions();
  migrateLegacyResults();
}

function cleanOversizedCurrentSession() {
  const session = window.localStorage.getItem(storageKeys.session);

  if (session && (session.length > 2000 || session.includes("data:image") || session.includes("base64"))) {
    removeStorage(storageKeys.session);
  }
}

export function clearLocalProdeData() {
  Object.values(storageKeys).forEach(removeStorage);
  Object.values(legacyStorageKeys).forEach(removeStorage);
  window.dispatchEvent(new Event("prode-session-change"));
  window.dispatchEvent(new Event("prode-users-change"));
  window.dispatchEvent(new Event("prode-store-change"));
}

function migrateLegacySession() {
  const legacySession = window.localStorage.getItem(legacyStorageKeys.session);

  if (!legacySession) {
    return;
  }

  if (legacySession.length > 2000 || legacySession.includes("data:image") || legacySession.includes("base64")) {
    removeStorage(legacyStorageKeys.session);
    return;
  }

  if (!window.localStorage.getItem(storageKeys.session)) {
    try {
      const parsedSession = JSON.parse(legacySession) as {
        username?: string;
        displayName?: string;
        name?: string;
        role?: string;
        paymentStatus?: string;
      };

      if (parsedSession.username && parsedSession.role) {
        writeStorage(storageKeys.session, {
          userId: parsedSession.username,
          username: parsedSession.username,
          name: parsedSession.name ?? parsedSession.displayName ?? parsedSession.username,
          role: parsedSession.role,
          paymentStatus: parsedSession.paymentStatus ?? "pending",
        });
      }
    } catch {
      // Ignore invalid legacy session.
    }
  }

  removeStorage(legacyStorageKeys.session);
}

function migrateLegacyUsers() {
  const legacyUsers = window.localStorage.getItem(legacyStorageKeys.registeredUsers);

  if (!legacyUsers || window.localStorage.getItem(storageKeys.registeredUsers)) {
    return;
  }

  try {
    const users = JSON.parse(legacyUsers) as Array<Record<string, unknown>>;
    writeStorage(storageKeys.registeredUsers, users.map(sanitizeUser));
  } catch {
    // Ignore invalid legacy users.
  } finally {
    removeStorage(legacyStorageKeys.registeredUsers);
  }
}

function migrateLegacyPredictions() {
  if (window.localStorage.getItem(storageKeys.predictions)) {
    return;
  }

  const legacyPredictions = readRawJson(legacyStorageKeys.predictions, {});
  const legacySavedPredictions = readRawJson(legacyStorageKeys.savedPredictions, {});

  if (Object.keys(legacyPredictions).length || Object.keys(legacySavedPredictions).length) {
    writeStorage(storageKeys.predictions, {
      predictions: legacyPredictions,
      savedPredictions: legacySavedPredictions,
    });
  }

  removeStorage(legacyStorageKeys.predictions);
  removeStorage(legacyStorageKeys.savedPredictions);
}

function migrateLegacyResults() {
  if (window.localStorage.getItem(storageKeys.results)) {
    return;
  }

  const legacyResults = readRawJson(legacyStorageKeys.results, {});

  if (Object.keys(legacyResults).length) {
    writeStorage(storageKeys.results, legacyResults);
  }

  removeStorage(legacyStorageKeys.results);
}

function readRawJson(key: string, fallback: Record<string, unknown>) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as Record<string, unknown>) : fallback;
  } catch {
    return fallback;
  }
}

function sanitizeUser(user: Record<string, unknown>) {
  const paymentProof = user.paymentProof as Record<string, unknown> | undefined;

  return {
    ...user,
    paymentProof: paymentProof
      ? {
          fileName: String(paymentProof.fileName ?? "comprobante"),
          fileType: String(paymentProof.fileType ?? "image/*"),
          fileSize: Number(paymentProof.fileSize ?? 0),
          uploadedAt: String(paymentProof.uploadedAt ?? paymentProof.submittedAt ?? new Date().toISOString()),
          status: String(paymentProof.status ?? user.paymentStatus ?? "pending_review"),
        }
      : undefined,
  };
}
