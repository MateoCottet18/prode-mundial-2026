"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { matches as localMatches, type Match } from "@/data/matches";
import type { KnockoutScheduleMap } from "@/data/knockoutKickoff";
import { fetchMatchesFromSupabase } from "@/lib/services/matchService";

/**
 * Hook de partidos de fase de grupos + horarios de eliminatoria.
 *
 * `matches` = solo grupos (standings / fechas).
 * `knockoutSchedule` = kickoff_utc y sede por id KO (16avos-1, octavos-1, …).
 */
export type MatchesSource = "supabase" | "local-fallback" | "loading";

export function useMatches() {
  const [matches, setMatches] = useState<Match[]>(localMatches);
  const [knockoutSchedule, setKnockoutSchedule] = useState<KnockoutScheduleMap>({});
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
      if (remote && remote.groupMatches.length > 0) {
        setMatches(remote.groupMatches);
        setKnockoutSchedule(remote.knockoutSchedule);
        setSource("supabase");
      } else {
        console.warn(
          "[useMatches] cayendo al fallback local (data/matches.ts) — la tabla public.matches está vacía o no es accesible",
        );
        setMatches(localMatches);
        setKnockoutSchedule({});
        setSource("local-fallback");
      }
    } catch (err) {
      console.error("[useMatches] error leyendo matches, uso fallback local", err);
      setError(err instanceof Error ? err.message : "No se pudieron cargar los partidos.");
      setMatches(localMatches);
      setKnockoutSchedule({});
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

  return { matches, knockoutSchedule, source, isReady, error, refresh };
}
