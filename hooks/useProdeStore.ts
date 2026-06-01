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
  PredictionSaveError,
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
 * Fuente de verdad única: Supabase. Cada `save*`:
 *   1. Persiste en Supabase (upsert/delete).
 *   2. Refresca desde Supabase para confirmar la fila y sincronizar otros tabs.
 *
 * Tres mapas conviviendo:
 *   - `predictions`     → estado del INPUT (lo que está tipeando el usuario).
 *   - `dbPredictions`   → último valor confirmado en Supabase.
 *   - `savedPredictions`→ "tengo fila en DB para este match".
 *
 * NO hacemos optimistic update antes de confirmar Supabase: si falla el
 * guardado, la UI no debe mostrar "Guardada".
 */
export function useProdeStore(userId?: string) {
  const [predictions, setPredictions] = useState<PredictionsByUser>({});
  const [dbPredictions, setDbPredictions] = useState<PredictionsByUser>({});
  const [savedPredictions, setSavedPredictions] = useState<SavedPredictionsByUser>({});
  const [results, setResults] = useState<ResultsByMatch>({});
  const [isReady, setIsReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingPrediction, setIsSavingPrediction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [predictionSaveError, setPredictionSaveError] = useState<string | null>(null);
  const isRefreshingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) {
      return;
    }
    isRefreshingRef.current = true;
    console.log("[perf] fetch predictions", userId ? `(scope=${userId})` : "(all)");
    console.log("[perf] fetch results");
    setIsSyncing(true);
    setError(null);
    try {
      const [remotePredictions, remoteResults] = await Promise.all([
        fetchPredictionsFromSupabase(userId),
        fetchResultsFromSupabase(),
      ]);

      const remotePred = remotePredictions?.predictions ?? {};
      setPredictions(remotePred);
      setDbPredictions(remotePred);
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
  }, [userId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [refresh]);

  useEffect(() => {
    const handler = () => void refresh();
    window.addEventListener("prode-store-change", handler);
    return () => window.removeEventListener("prode-store-change", handler);
  }, [refresh]);

  const updatePrediction = (
    userId: string,
    matchId: string,
    side: keyof ScoreInput,
    value: string,
  ) => {
    setPredictionSaveError(null);
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
  };

  const savePrediction = async (userId: string, matchId: string): Promise<boolean> => {
    const score = predictions[userId]?.[matchId];
    if (!parseScore(score)) {
      setPredictionSaveError("Marcá un resultado válido antes de guardar.");
      return false;
    }

    if (!userId) {
      setPredictionSaveError("No hay usuario identificado. Volvé a iniciar sesión.");
      return false;
    }

    setIsSavingPrediction(true);
    setPredictionSaveError(null);
    setError(null);

    try {
      await savePredictionToSupabase({ userId, matchId, score, results });
      // Confirmar en Supabase (otro dispositivo / recarga deben ver lo mismo).
      await refresh();
      return true;
    } catch (err) {
      const message =
        err instanceof PredictionSaveError
          ? err.message
          : err instanceof Error
            ? err.message
            : "No se pudo guardar la predicción.";
      console.error("[useProdeStore] no se pudo guardar la predicción", err);
      setPredictionSaveError(message);
      setError(message);
      return false;
    } finally {
      setIsSavingPrediction(false);
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
    isSavingPrediction,
    error,
    predictionSaveError,
    predictions,
    dbPredictions,
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
