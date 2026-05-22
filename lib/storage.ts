/**
 * Caché ligero en localStorage para UI no crítica.
 *
 * IMPORTANTE: los datos reales (usuarios, predicciones, resultados, pagos)
 * viven en Supabase. Acá sólo guardamos:
 *
 *   - `prode-session` : snapshot del SessionUser actual para hidratar la UI
 *                       sin esperar la query a Supabase. La fuente de verdad
 *                       sigue siendo `supabase.auth.getUser()` + profiles.
 *
 * El resto de keys (predicciones, resultados, users registrados) eran de la
 * versión local-first y se limpian al arrancar la app vía `clearLegacyKeys()`.
 */

export const storageKeys = {
  session: "prode-session",
} as const;

// Keys viejas (predicciones, results, users) que ya no usamos. Las borramos
// al arrancar para que el navegador no se quede con datos huérfanos que
// podrían reactivar comportamientos local-first.
const legacyKeys = [
  "prode-users",
  "prode-predictions",
  "prode-results",
  "prode-mundial-2026-session",
  "prode-mundial-2026-registered-users",
  "prode-mundial-2026-predictions",
  "prode-mundial-2026-saved-predictions",
  "prode-mundial-2026-results",
];

export function readStorage<T>(key: string, fallback: T) {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return fallback;
    return JSON.parse(stored) as T;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return { ok: false as const };
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return { ok: true as const };
  } catch (error) {
    console.warn("No se pudo guardar en localStorage.", error);
    return { ok: false as const, error };
  }
}

export function removeStorage(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

/** Limpia el snapshot de sesión local (Supabase Auth se desloguea aparte). */
export function clearSessionCache() {
  removeStorage(storageKeys.session);
  window.dispatchEvent(new Event("prode-session-change"));
}

/**
 * Elimina cualquier rastro de la app local-first anterior. Idempotente.
 * Se llama una sola vez al arrancar (`hooks/useAuth.ts` lo dispara).
 */
export function clearLegacyKeys() {
  if (typeof window === "undefined") return;
  legacyKeys.forEach((key) => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  });
}
