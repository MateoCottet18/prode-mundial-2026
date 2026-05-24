"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { matches as localMatches, type Match } from "@/data/matches";
import { fetchMatchesFromSupabase } from "@/lib/services/matchService";

/**
 * Hook de partidos.
 *
 * Estrategia:
 *   1. Al montar, intenta leer `public.matches` desde Supabase.
 *   2. Si la query falla (sin red, sin Supabase config, RLS, tabla vacía, etc.)
 *      cae a `data/matches.ts` para que la app SIEMPRE pueda renderizar.
 *   3. `source` deja claro de dónde salió la lista actual; útil para debug.
 *
 * Re-entrance guard idéntico al de `useAuth`/`useUsers`/`useProdeStore`:
 * varios listeners no apilan fetches simultáneos.
 */
export type MatchesSource = "supabase" | "local-fallback" | "loading";

export function useMatches() {
  const [matches, setMatches] = useState<Match[]>(localMatches);
  const [source, setSource] = useState<MatchesSource>("loading");
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (isLoadingRef.current) {
      return;
    }
    isLoadingRef.current = true;
    console.log("[perf] fetch matches");
    setError(null);

    try {
      const remote = await fetchMatchesFromSupabase();
      if (remote && remote.length > 0) {
        setMatches(remote);
        setSource("supabase");
      } else {
        // Tabla vacía o Supabase no configurado: usamos el calendario local.
        // El usuario debería correr `supabase/matches.sql` para poblar la DB.
        console.warn(
          "[useMatches] cayendo al fallback local (data/matches.ts) — la tabla public.matches está vacía o no es accesible",
        );
        setMatches(localMatches);
        setSource("local-fallback");
      }
    } catch (err) {
      console.error("[useMatches] error leyendo matches, uso fallback local", err);
      setError(err instanceof Error ? err.message : "No se pudieron cargar los partidos.");
      setMatches(localMatches);
      setSource("local-fallback");
    } finally {
      setIsReady(true);
      isLoadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [refresh]);

  useEffect(() => {
    const handler = () => void refresh();
    window.addEventListener("prode-matches-change", handler);
    return () => window.removeEventListener("prode-matches-change", handler);
  }, [refresh]);

  return { matches, source, isReady, error, refresh };
}
