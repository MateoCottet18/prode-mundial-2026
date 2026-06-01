"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionUser } from "@/lib/prode";
import {
  getSessionUserFromSupabase,
  LoginFailure,
  loginWithSupabase,
  logoutFromSupabase,
  type LoginFailedStep,
  type LoginFailureCode,
} from "@/lib/services/authService";
import {
  clearLegacyKeys,
  clearSessionCache,
  readStorage,
  storageKeys,
  writeStorage,
} from "@/lib/storage";

export type LoginResult =
  | { ok: true; redirectTo: string }
  | {
      ok: false;
      reason: LoginFailureCode;
      message: string;
      failedStep: LoginFailedStep;
    };

/**
 * Sesión del usuario actual.
 *
 * Fuente de verdad: `supabase.auth.getUser()` + `public.profiles`.
 * El cache local (`prode-session`) sólo hidrata la UI al refrescar la página.
 */
export function useAuth() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const isLoggingInRef = useRef(false);
  // Re-entrance guard: evita disparar muchos `loadSession()` en paralelo cuando
  // varios listeners (storage / prode-session-change) se solapan tras un logout
  // o un cambio de localStorage en otra pestaña.
  const isLoadingRef = useRef(false);

  const loadSession = useCallback(async () => {
    if (isLoggingInRef.current) {
      return;
    }
    if (isLoadingRef.current) {
      return;
    }
    isLoadingRef.current = true;
    console.log("[perf] session refresh");

    const cached = readStorage<SessionUser | null>(storageKeys.session, null);
    setUser((current) => current ?? cached);

    try {
      const supabaseUser = await getSessionUserFromSupabase();
      if (supabaseUser) {
        writeStorage(storageKeys.session, supabaseUser);
        setUser(supabaseUser);
      } else {
        // Sin sesión en Supabase Auth: el snapshot local no sirve para escribir
        // en RLS (predictions, payments). Limpiamos para no mostrar "logueado"
        // cuando auth.uid() es null y los saves fallan en silencio.
        if (cached) {
          console.warn(
            "[useAuth] cache local sin sesión Supabase — limpiando prode-session",
          );
          clearSessionCache();
        }
        setUser(null);
      }
    } catch (error) {
      console.error("[useAuth] no se pudo cargar la sesión desde Supabase", error);
    } finally {
      setIsReady(true);
      isLoadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    console.log("[perf] auth listener mounted");
    clearLegacyKeys();
    const timeoutId = window.setTimeout(() => void loadSession(), 0);
    return () => {
      console.log("[perf] auth listener cleanup");
      window.clearTimeout(timeoutId);
    };
  }, [loadSession]);

  useEffect(() => {
    // Visibilidad de propagación: dispara en cada instancia de useAuth cuando
    // el user cambia. Si el Navbar no loguea acá tras un login, sabemos que
    // su listener no se está enterando del cambio de sesión.
    console.log("[auth] session updated", user?.username ?? "(anon)", user?.role ?? "");
  }, [user]);

  const login = useCallback(
    async (identifier: string, password: string): Promise<LoginResult> => {
      isLoggingInRef.current = true;
      console.log("[useAuth] login iniciado");

      let outcome: LoginResult;
      try {
        const supabaseUser = await loginWithSupabase(identifier, password);

        if (!supabaseUser) {
          outcome = {
            ok: false,
            reason: "unknown",
            failedStep: "config",
            message: "Supabase no está configurado en este entorno.",
          };
        } else {
          writeStorage(storageKeys.session, supabaseUser);
          setUser(supabaseUser);
          const redirectTo = supabaseUser.role === "admin" ? "/admin" : "/partidos";
          console.log("[useAuth] login OK, redirigiendo a", redirectTo);
          outcome = { ok: true, redirectTo };
        }
      } catch (error) {
        if (error instanceof LoginFailure) {
          console.error(
            "[useAuth] login falló:",
            error.code,
            "paso:",
            error.failedStep,
            "msg:",
            error.message,
          );
          outcome = {
            ok: false,
            reason: error.code,
            failedStep: error.failedStep,
            message: error.message,
          };
        } else {
          console.error("[useAuth] login error inesperado", error);
          outcome = {
            ok: false,
            reason: "unknown",
            failedStep: "unknown",
            message: "No pudimos iniciar sesión. Revisá tu conexión o intentá de nuevo.",
          };
        }
      } finally {
        isLoggingInRef.current = false;
      }

      // IMPORTANTE: este dispatch va DESPUÉS del finally para que `isLoggingInRef`
      // ya esté en false cuando los listeners corran. Si no, el guard de `refresh`
      // descarta el evento y otras instancias de useAuth (Navbar, layout, etc.)
      // se quedan con el user viejo (sin actualizar tras login).
      if (outcome.ok) {
        console.log("[auth] login success");
        window.dispatchEvent(new Event("prode-session-change"));
      }
      return outcome;
    },
    [],
  );

  const logout = async () => {
    console.log("[perf] logout");
    await logoutFromSupabase();
    clearSessionCache();
    setUser(null);
    // Único punto desde donde dispatcheamos el evento. No lo hace `clearSessionCache`
    // a propósito (ver comentario en lib/storage.ts).
    window.dispatchEvent(new Event("prode-session-change"));
    console.log("[auth] logout success");
  };

  useEffect(() => {
    const refresh = () => {
      if (isLoggingInRef.current || isLoadingRef.current) {
        return;
      }
      void loadSession();
    };
    // Sólo escuchamos el evento custom de la propia app. NO escuchamos `storage`
    // global porque cada `localStorage.setItem` (incluso de otras keys) lo
    // dispara, y `loadSession()` ya hace su propio fetch de Supabase. Si en el
    // futuro queremos sincronizar entre pestañas, filtramos por `event.key`.
    window.addEventListener("prode-session-change", refresh);
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKeys.session) {
        refresh();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("prode-session-change", refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [loadSession]);

  return { user, isReady, login, logout };
}
