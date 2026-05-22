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

  const loadSession = useCallback(async () => {
    if (isLoggingInRef.current) {
      return;
    }

    const cached = readStorage<SessionUser | null>(storageKeys.session, null);
    setUser((current) => current ?? cached);

    try {
      const supabaseUser = await getSessionUserFromSupabase();
      if (supabaseUser) {
        writeStorage(storageKeys.session, supabaseUser);
        setUser(supabaseUser);
      } else if (!cached) {
        clearSessionCache();
        setUser(null);
      }
    } catch (error) {
      console.error("[useAuth] no se pudo cargar la sesión desde Supabase", error);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    clearLegacyKeys();
    const timeoutId = window.setTimeout(() => void loadSession(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadSession]);

  const login = useCallback(
    async (identifier: string, password: string): Promise<LoginResult> => {
      isLoggingInRef.current = true;
      console.log("[useAuth] login iniciado");

      try {
        const supabaseUser = await loginWithSupabase(identifier, password);

        if (!supabaseUser) {
          return {
            ok: false,
            reason: "unknown",
            failedStep: "config",
            message: "Supabase no está configurado en este entorno.",
          };
        }

        writeStorage(storageKeys.session, supabaseUser);
        setUser(supabaseUser);

        const redirectTo = supabaseUser.role === "admin" ? "/admin" : "/partidos";
        console.log("[useAuth] login OK, redirigiendo a", redirectTo);

        return { ok: true, redirectTo };
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
          return {
            ok: false,
            reason: error.code,
            failedStep: error.failedStep,
            message: error.message,
          };
        }
        console.error("[useAuth] login error inesperado", error);
        return {
          ok: false,
          reason: "unknown",
          failedStep: "unknown",
          message: "No pudimos iniciar sesión. Revisá tu conexión o intentá de nuevo.",
        };
      } finally {
        isLoggingInRef.current = false;
      }
    },
    [],
  );

  const logout = async () => {
    await logoutFromSupabase();
    clearSessionCache();
    setUser(null);
    window.dispatchEvent(new Event("prode-session-change"));
  };

  useEffect(() => {
    const refresh = () => {
      if (!isLoggingInRef.current) {
        void loadSession();
      }
    };
    window.addEventListener("prode-session-change", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("prode-session-change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [loadSession]);

  return { user, isReady, login, logout };
}
