"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  emptyScore,
  parseScore,
  type PredictionsByUser,
  type ResultsByMatch,
  type SavedPredictionsByUser,
  type ScoreInput,
  type MatchResult,
} from "@/lib/prode";
import {
  deletePredictionFromSupabase,
  fetchPredictionsFromSupabase,
  PredictionSaveError,
  recalculatePredictionPointsViaApi,
  savePredictionToSupabase,
} from "@/lib/services/predictionService";
import {
  deleteResultFromSupabase,
  fetchResultsFromSupabase,
  saveResultToSupabase,
} from "@/lib/api/resultsApi";

type UseProdeStoreOptions = {
  /**
   * Si true, no hace fetch de predicciones hasta que `userId` esté definido.
   * Evita una carrera en /partidos donde el primer fetch corre con userId
   * undefined y la UI queda con mapas vacíos bajo la clave del usuario.
   */
  skipUntilUserId?: boolean;
};

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
 * `resolvedUserId` = auth.uid() cuando hay sesión; usarlo como clave de lookup
 * en la UI (no confiar sólo en session cache).
 */
export function useProdeStore(userId?: string, options?: UseProdeStoreOptions) {
  const skipUntilUserId = options?.skipUntilUserId ?? false;

  const [predictions, setPredictions] = useState<PredictionsByUser>({});
  const [dbPredictions, setDbPredictions] = useState<PredictionsByUser>({});
  const [savedPredictions, setSavedPredictions] = useState<SavedPredictionsByUser>({});
  const [results, setResults] = useState<ResultsByMatch>({});
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSavingPrediction, setIsSavingPrediction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [predictionSaveError, setPredictionSaveError] = useState<string | null>(null);
  const isRefreshingRef = useRef(false);
  const pendingRefreshRef = useRef(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const refresh = useCallback(async () => {
    if (skipUntilUserId && !userId) {
      console.log("[predictions-load] skip refresh: waiting for userId");
      return;
    }

    if (isRefreshingRef.current) {
      pendingRefreshRef.current = true;
      return;
    }
    isRefreshingRef.current = true;
    console.log("[perf] fetch predictions", userId ? `(scope=${userId})` : "(all)");
    console.log("[predictions-load] currentUser (session)", userId ?? "(none)");
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
      setResolvedUserId(remotePredictions?.resolvedUserId ?? userId ?? null);
      setResults(remoteResults ?? {});
    } catch (err) {
      console.error("[useProdeStore] error refrescando datos", err);
      setError(err instanceof Error ? err.message : "No se pudieron cargar los datos.");
    } finally {
      setIsReady(true);
      setIsSyncing(false);
      isRefreshingRef.current = false;
      if (pendingRefreshRef.current) {
        pendingRefreshRef.current = false;
        setRefreshNonce((n) => n + 1);
      }
    }
  }, [skipUntilUserId, userId]);

  useEffect(() => {
    if (refreshNonce === 0) return;
    const timeoutId = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [refreshNonce, refresh]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [refresh]);

  useEffect(() => {
    const handler = () => void refresh();
    window.addEventListener("prode-store-change", handler);
    window.addEventListener("prode-session-change", handler);
    return () => {
      window.removeEventListener("prode-store-change", handler);
      window.removeEventListener("prode-session-change", handler);
    };
  }, [refresh]);

  const updatePrediction = (
    lookupUserId: string,
    matchId: string,
    side: keyof ScoreInput,
    value: string,
  ) => {
    setPredictionSaveError(null);
    setPredictions((current) => ({
      ...current,
      [lookupUserId]: {
        ...(current[lookupUserId] ?? {}),
        [matchId]: {
          ...(current[lookupUserId]?.[matchId] ?? emptyScore),
          [side]: value,
        },
      },
    }));
  };

  const savePrediction = async (lookupUserId: string, matchId: string): Promise<boolean> => {
    const score =
      predictions[lookupUserId]?.[matchId] ??
      (resolvedUserId ? predictions[resolvedUserId]?.[matchId] : undefined);
    if (!parseScore(score)) {
      setPredictionSaveError("Marcá un resultado válido antes de guardar.");
      return false;
    }

    if (!lookupUserId && !resolvedUserId) {
      setPredictionSaveError("No hay usuario identificado. Volvé a iniciar sesión.");
      return false;
    }

    setIsSavingPrediction(true);
    setPredictionSaveError(null);
    setError(null);

    try {
      await savePredictionToSupabase({
        userId: resolvedUserId ?? lookupUserId,
        matchId,
        score,
      });
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

  const deletePrediction = async (lookupUserId: string, matchId: string) => {
    try {
      await deletePredictionFromSupabase(resolvedUserId ?? lookupUserId, matchId);
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

  const saveResult = async (
    matchId: string,
    score: ScoreInput,
    meta?: Pick<MatchResult, "winnerTeam" | "decidedBy">,
  ) => {
    if (!parseScore(score)) return false;

    const stored: MatchResult = {
      ...score,
      winnerTeam: meta?.winnerTeam ?? null,
      decidedBy: meta?.decidedBy ?? null,
    };

    console.log("[result-save] store merge", { matchId, stored });

    setResults((current) => ({ ...current, [matchId]: stored }));

    try {
      await saveResultToSupabase(matchId, stored);
      await recalculatePredictionPointsViaApi();
      window.dispatchEvent(new Event("prode-store-change"));
      await refresh();
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
      await recalculatePredictionPointsViaApi();
      window.dispatchEvent(new Event("prode-store-change"));
      await refresh();
    } catch (err) {
      console.error("[useProdeStore] no se pudo borrar el resultado", err);
      setError(err instanceof Error ? err.message : "No se pudo borrar el resultado.");
    }
  };

  const recalculatePoints = async () => {
    try {
      await recalculatePredictionPointsViaApi();
      await refresh();
      window.dispatchEvent(new Event("prode-store-change"));
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
    resolvedUserId,
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
