"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteQualificationOverride,
  fetchQualificationOverrides,
  saveQualificationOverride,
  type QualificationOverride,
  type SaveOverrideInput,
} from "@/lib/services/qualificationOverrideService";
import type { QualificationOverrides } from "@/lib/standings";

/**
 * Hook que expone los overrides de clasificación al cliente.
 *
 * - `overrides`: lista cruda con metadata (para la UI admin).
 * - `overridesMap`: mapa slot→teamName que se pasa a `getKnockoutMatches` y
 *   `getAllGeneratedMatches` para reemplazar el cálculo automático.
 *
 * El hook se autorefresca al recibir el evento `prode-overrides-change`.
 */
export function useQualificationOverrides() {
  const [overrides, setOverrides] = useState<QualificationOverride[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setError(null);
    try {
      const list = await fetchQualificationOverrides();
      setOverrides(list);
    } catch (err) {
      console.error("[useQualificationOverrides] error refrescando", err);
      setError(err instanceof Error ? err.message : "No se pudieron cargar los overrides.");
      setOverrides([]);
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
    window.addEventListener("prode-overrides-change", handler);
    return () => window.removeEventListener("prode-overrides-change", handler);
  }, [refresh]);

  const overridesMap: QualificationOverrides = useMemo(() => {
    const map: QualificationOverrides = {};
    for (const override of overrides) {
      map[override.slot] = override.teamName;
    }
    return map;
  }, [overrides]);

  const saveOverride = useCallback(
    async (input: SaveOverrideInput) => {
      setError(null);
      try {
        await saveQualificationOverride(input);
        window.dispatchEvent(new Event("prode-overrides-change"));
        return { ok: true as const };
      } catch (err) {
        const message = err instanceof Error ? err.message : "No se pudo guardar el override.";
        setError(message);
        return { ok: false as const, message };
      }
    },
    [],
  );

  const removeOverride = useCallback(async (slot: string) => {
    setError(null);
    try {
      await deleteQualificationOverride(slot);
      window.dispatchEvent(new Event("prode-overrides-change"));
      return { ok: true as const };
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo borrar el override.";
      setError(message);
      return { ok: false as const, message };
    }
  }, []);

  return {
    overrides,
    overridesMap,
    isReady,
    error,
    refresh,
    saveOverride,
    removeOverride,
  };
}
