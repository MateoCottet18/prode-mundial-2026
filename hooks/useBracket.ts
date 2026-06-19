"use client";

import { useMemo } from "react";
import { buildBracket } from "@/lib/bracket/buildBracket";
import { useMatches } from "@/hooks/useMatches";
import { useProdeStore } from "@/hooks/useProdeStore";
import { useQualificationOverrides } from "@/hooks/useQualificationOverrides";

/**
 * Hook agregador para la pantalla de bracket.
 *
 * Combina partidos (Supabase + fallback estático), resultados, predicciones y
 * overrides de clasificación, y devuelve la estructura espejada del bracket
 * más los handlers para guardar resultados/predicciones (los reusa de los
 * hooks subyacentes; nada se duplica acá).
 */
export function useBracket() {
  const { matches, knockoutSchedule, isReady: areMatchesReady } = useMatches();
  const {
    predictions,
    savedPredictions,
    results,
    saveResult,
    deleteResult,
    updatePrediction,
    savePrediction,
    isReady: isStoreReady,
  } = useProdeStore();
  const {
    overrides,
    overridesMap,
    isReady: areOverridesReady,
  } = useQualificationOverrides();

  const bracket = useMemo(
    () => buildBracket(results, matches, overridesMap, knockoutSchedule),
    [results, matches, overridesMap, knockoutSchedule],
  );

  return {
    bracket,
    matches,
    predictions,
    savedPredictions,
    results,
    overrides,
    overridesMap,
    saveResult,
    deleteResult,
    updatePrediction,
    savePrediction,
    isReady: areMatchesReady && isStoreReady && areOverridesReady,
  };
}
