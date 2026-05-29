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
 * Tres mapas conviviendo:
 *   - `predictions`     → estado del INPUT (lo que está tipeando el usuario).
 *                         Cambia con cada tecla, NO refleja Supabase.
 *   - `dbPredictions`   → último valor confirmado en Supabase. Se actualiza
 *                         sólo después de un save/refresh exitoso. Lo usan
 *                         el ranking y la vista bloqueada (resultado cargado
 *                         o kickoff pasado) para mostrar lo que realmente
 *                         está persistido, sin importar si el usuario tiene
 *                         cambios sin guardar.
 *   - `savedPredictions`→ derivado: "tengo fila en DB para este match". NO
 *                         se voltea a `false` por keystrokes; sólo cambia con
 *                         save (true) y delete (remueve la entry).
 *
 * Si la llamada a Supabase falla, devolvemos el error en `error` y
 * dejamos los datos en memoria como estaban, NO sincronizados con la base.
 *
 * Performance:
 * - Si se pasa `userId`, el fetch de predicciones queda escopado a ese
 *   usuario. Es lo que querés en /partidos y /perfil: el cliente sólo
 *   necesita ver las propias para editar/visualizar. A 500 usuarios el
 *   fetch sin scope pesa ~4 MB; con scope ~10 KB.
 * - El ranking debe consumirse vía `useRankingAggregates`, NO desde acá.
 */
export function useProdeStore(userId?: string) {
  const [predictions, setPredictions] = useState<PredictionsByUser>({});
  const [dbPredictions, setDbPredictions] = useState<PredictionsByUser>({});
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
      // Sincronizamos los tres mapas. `predictions` arranca espejando lo de
      // DB; cualquier edición posterior queda sólo en el mapa local.
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

  // ---------------------------------------------------------------------------
  // Predicciones (participante).
  // ---------------------------------------------------------------------------

  const updatePrediction = (
    userId: string,
    matchId: string,
    side: keyof ScoreInput,
    value: string,
  ) => {
    // Sólo movemos el mapa local. No tocamos savedPredictions ni dbPredictions
    // porque la fila en DB sigue siendo la misma hasta que el usuario guarde.
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

  const savePrediction = async (userId: string, matchId: string) => {
    const score = predictions[userId]?.[matchId];
    if (!parseScore(score)) return false;

    // Snapshot para rollback si Supabase rechaza.
    const previousDbScore = dbPredictions[userId]?.[matchId];
    const previousSavedFlag = Boolean(savedPredictions[userId]?.[matchId]);

    // Optimistic: marcamos como guardado y movemos el mirror de DB.
    setSavedPredictions((current) => ({
      ...current,
      [userId]: { ...(current[userId] ?? {}), [matchId]: true },
    }));
    setDbPredictions((current) => ({
      ...current,
      [userId]: { ...(current[userId] ?? {}), [matchId]: score },
    }));

    try {
      await savePredictionToSupabase({ userId, matchId, score, results });
      // OJO: NO disparamos `prode-store-change` acá. La actualización
      // optimista de `dbPredictions` + `savedPredictions` ya dejó la UI
      // local consistente. Refrescar dispararía un fetch completo de
      // predicciones que no aporta nada nuevo (es la misma data que
      // acabamos de escribir). A 500 usuarios eso son cientos de KB de
      // egress por save evitados.
      return true;
    } catch (err) {
      console.error("[useProdeStore] no se pudo guardar la predicción", err);
      setError(err instanceof Error ? err.message : "No se pudo guardar la predicción.");
      // Rollback: revertimos savedPredictions y dbPredictions a lo previo.
      setSavedPredictions((current) => ({
        ...current,
        [userId]: { ...(current[userId] ?? {}), [matchId]: previousSavedFlag },
      }));
      setDbPredictions((current) => {
        const next = { ...current };
        const userMap = { ...(next[userId] ?? {}) };
        if (previousDbScore) {
          userMap[matchId] = previousDbScore;
        } else {
          delete userMap[matchId];
        }
        next[userId] = userMap;
        return next;
      });
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
    /** Lo que está realmente en Supabase. Úsalo en ranking y vistas bloqueadas. */
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
