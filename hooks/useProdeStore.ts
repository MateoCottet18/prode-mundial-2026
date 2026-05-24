"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  emptyScore,
  parseScore,
  type PredictionsByUser,
  type ResultsByMatch,
  type SavedPredictionsByUser,
  type ScoreInput,
} from "@/lib/prode";
import {
  deletePredictionFromSupabase,
  fetchPredictionsFromSupabase,
  recalculatePredictionPoints,
  savePredictionToSupabase,
} from "@/lib/services/predictionService";
import {
  deleteResultFromSupabase,
  fetchResultsFromSupabase,
  saveResultToSupabase,
} from "@/lib/api/resultsApi";

/**
 * Estado global de predicciones + resultados.
 *
 * Fuente de verdad única: Supabase. Cada `save*` hace:
 *   1. Optimistic update del estado React.
 *   2. Persistencia en Supabase (upsert/delete).
 *   3. Refresh desde Supabase para asegurar consistencia entre dispositivos.
 *
 * Si la llamada a Supabase falla, devolvemos el error en `error` y
 * dejamos los datos en memoria como estaban, NO sincronizados con la base.
 */
export function useProdeStore() {
  const [predictions, setPredictions] = useState<PredictionsByUser>({});
  const [savedPredictions, setSavedPredictions] = useState<SavedPredictionsByUser>({});
  const [results, setResults] = useState<ResultsByMatch>({});
  const [isReady, setIsReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Evita N refreshes en paralelo si llegan varios `prode-store-change` seguidos
  // (admin guardando muchos resultados, o varios `useProdeStore` montados).
  const isRefreshingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) {
      return;
    }
    isRefreshingRef.current = true;
    console.log("[perf] fetch predictions");
    console.log("[perf] fetch results");
    setIsSyncing(true);
    setError(null);
    try {
      const [remotePredictions, remoteResults] = await Promise.all([
        fetchPredictionsFromSupabase(),
        fetchResultsFromSupabase(),
      ]);

      setPredictions(remotePredictions?.predictions ?? {});
      setSavedPredictions(remotePredictions?.savedPredictions ?? {});
      setResults(remoteResults ?? {});
    } catch (err) {
      console.error("[useProdeStore] error refrescando datos", err);
      setError(err instanceof Error ? err.message : "No se pudieron cargar los datos.");
    } finally {
      setIsReady(true);
      setIsSyncing(false);
      isRefreshingRef.current = false;
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

  // ---------------------------------------------------------------------------
  // Predicciones (participante).
  // ---------------------------------------------------------------------------

  const updatePrediction = (
    userId: string,
    matchId: string,
    side: keyof ScoreInput,
    value: string,
  ) => {
    setPredictions((current) => ({
      ...current,
      [userId]: {
        ...(current[userId] ?? {}),
        [matchId]: {
          ...(current[userId]?.[matchId] ?? emptyScore),
          [side]: value,
        },
      },
    }));
    setSavedPredictions((current) => ({
      ...current,
      [userId]: {
        ...(current[userId] ?? {}),
        [matchId]: false,
      },
    }));
  };

  const savePrediction = async (userId: string, matchId: string) => {
    const score = predictions[userId]?.[matchId];
    if (!parseScore(score)) return false;

    setSavedPredictions((current) => ({
      ...current,
      [userId]: { ...(current[userId] ?? {}), [matchId]: true },
    }));

    try {
      await savePredictionToSupabase({ userId, matchId, score, results });
      window.dispatchEvent(new Event("prode-store-change"));
      return true;
    } catch (err) {
      console.error("[useProdeStore] no se pudo guardar la predicción", err);
      setError(err instanceof Error ? err.message : "No se pudo guardar la predicción.");
      // Rollback del flag local "guardado".
      setSavedPredictions((current) => ({
        ...current,
        [userId]: { ...(current[userId] ?? {}), [matchId]: false },
      }));
      return false;
    }
  };

  const deletePrediction = async (userId: string, matchId: string) => {
    try {
      await deletePredictionFromSupabase(userId, matchId);
      await refresh();
    } catch (err) {
      console.error("[useProdeStore] no se pudo eliminar la predicción", err);
      setError(err instanceof Error ? err.message : "No se pudo eliminar la predicción.");
    }
  };

  // ---------------------------------------------------------------------------
  // Resultados (admin).
  // ---------------------------------------------------------------------------

  const updateResult = (matchId: string, side: keyof ScoreInput, value: string) => {
    setResults((current) => ({
      ...current,
      [matchId]: {
        ...(current[matchId] ?? emptyScore),
        [side]: value,
      },
    }));
  };

  const saveResult = async (matchId: string, score: ScoreInput) => {
    if (!parseScore(score)) return false;

    setResults((current) => ({ ...current, [matchId]: score }));

    try {
      await saveResultToSupabase(matchId, score);
      const nextResults = { ...results, [matchId]: score };
      await recalculatePredictionPoints(nextResults);
      window.dispatchEvent(new Event("prode-store-change"));
      return true;
    } catch (err) {
      console.error("[useProdeStore] no se pudo guardar el resultado", err);
      setError(err instanceof Error ? err.message : "No se pudo guardar el resultado.");
      return false;
    }
  };

  const deleteResult = async (matchId: string) => {
    setResults((current) => {
      const next = { ...current };
      delete next[matchId];
      return next;
    });

    try {
      await deleteResultFromSupabase(matchId);
      const nextResults = { ...results };
      delete nextResults[matchId];
      await recalculatePredictionPoints(nextResults);
      window.dispatchEvent(new Event("prode-store-change"));
    } catch (err) {
      console.error("[useProdeStore] no se pudo borrar el resultado", err);
      setError(err instanceof Error ? err.message : "No se pudo borrar el resultado.");
    }
  };

  const recalculatePoints = async () => {
    try {
      await recalculatePredictionPoints(results);
      await refresh();
    } catch (err) {
      console.error("[useProdeStore] error recalculando puntos", err);
      setError(err instanceof Error ? err.message : "No se pudo recalcular puntos.");
    }
  };

  return {
    isReady,
    isSyncing,
    error,
    predictions,
    savedPredictions,
    results,
    refresh,
    updatePrediction,
    savePrediction,
    deletePrediction,
    updateResult,
    saveResult,
    deleteResult,
    recalculatePoints,
  };
}
