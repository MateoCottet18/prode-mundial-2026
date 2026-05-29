"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchRankingAggregatesFromSupabase,
  type PredictionAggregate,
} from "@/lib/services/predictionService";

/**
 * Carga los totales pre-agregados que usa el ranking.
 *
 * Toma `public.prediction_aggregates` (view definida en `supabase/perf_indexes.sql`):
 * 1 fila por usuario con `points`, `exact_count`, `correct_outcomes_count`,
 * `saved_count`. A 500 usuarios la respuesta pesa ~50 KB en vez de ~4 MB que
 * traería bajar las 52k filas crudas de `public.predictions`.
 *
 * Refresca automáticamente al recibir `prode-store-change` (lo dispara el
 * admin tras cargar/borrar resultados, que es cuando los puntos cambian).
 *
 * Si la view todavía no existe en la DB (deploy parcial), `aggregates` queda
 * en `null` y los consumidores deben caer al ranking computado en cliente
 * para no romper.
 */
export function useRankingAggregates() {
  const [aggregates, setAggregates] = useState<PredictionAggregate[] | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    console.log("[perf] fetch ranking aggregates");
    setError(null);
    try {
      const list = await fetchRankingAggregatesFromSupabase();
      setAggregates(list);
    } catch (err) {
      console.error("[useRankingAggregates] error refrescando", err);
      setError(
        err instanceof Error ? err.message : "No se pudieron cargar los agregados.",
      );
      setAggregates(null);
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
    window.addEventListener("prode-store-change", handler);
    return () => window.removeEventListener("prode-store-change", handler);
  }, [refresh]);

  return { aggregates, isReady, error, refresh };
}
