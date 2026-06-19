"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MatchCard } from "@/components/MatchCard";
import { PageHeader } from "@/components/PageHeader";
import { PartidosPredictionAlert } from "@/components/PartidosPredictionAlert";
import { KnockoutBracket } from "@/components/bracket/KnockoutBracket";
import { type Match } from "@/data/matches";
import { useAuth } from "@/hooks/useAuth";
import { useMatches } from "@/hooks/useMatches";
import { useProdeStore } from "@/hooks/useProdeStore";
import { useQualificationOverrides } from "@/hooks/useQualificationOverrides";
import { buildBracket } from "@/lib/bracket/buildBracket";
import type { ScoreInput } from "@/lib/prode";
import { getPredictionLockFromResults } from "@/lib/matchTime";
import {
  getDefaultPartidosFilter,
  getMatchesForPartidosFilter,
  summarizePartidosTab,
  type PartidosFilter,
} from "@/lib/partidosUx";
import { getKnockoutMatches } from "@/lib/standings";

/**
 * Filtros aceptados:
 *  - "fecha"        → muestra cards tradicionales por fecha de grupos.
 *  - "eliminatoria" → muestra el bracket completo (16avos → final + 3°).
 *
 * No existen más filtros sueltos para 16avos/octavos/cuartos/etc; toda la
 * fase eliminatoria vive en una única visualización.
 */
type Filter = PartidosFilter;

const filters: Filter[] = [
  { type: "fecha", value: 1 },
  { type: "fecha", value: 2 },
  { type: "fecha", value: 3 },
  { type: "eliminatoria" },
];

export default function PartidosPage() {
  const router = useRouter();
  const { user, isReady: isAuthReady } = useAuth();
  const { matches, knockoutSchedule } = useMatches();
  // /partidos sólo necesita las predicciones del usuario logueado para los
  // inputs. Pasamos `userId` para que el store no baje las predicciones de
  // los otros 499 participantes (~4 MB que no se usan).
  const {
    predictions,
    dbPredictions,
    savedPredictions,
    results,
    resolvedUserId,
    updatePrediction,
    savePrediction,
    predictionSaveError,
    isSavingPrediction,
    isReady: isStoreReady,
  } = useProdeStore(user?.userId ?? undefined, { skipUntilUserId: true });
  const { overridesMap } = useQualificationOverrides();
  const [activeFilter, setActiveFilter] = useState<Filter>({ type: "fecha", value: 1 });
  const initialFilterSetRef = useRef(false);

  // Refresca el "now" cada 60s para que el lock por kickoff cierre la
  // predicción aunque el usuario tenga la pestaña abierta sin interactuar.
  // No es polling de Supabase; es un timer en memoria que sólo dispara
  // re-renders locales.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const bracket = useMemo(
    () => buildBracket(results, matches, overridesMap, knockoutSchedule),
    [results, matches, overridesMap, knockoutSchedule],
  );

  const knockoutMatches = useMemo(() => {
    const ko = getKnockoutMatches(results, matches, overridesMap, knockoutSchedule);
    return [
      ...ko["16avos"],
      ...ko.octavos,
      ...ko.cuartos,
      ...ko.semifinal,
      ...ko.final,
      ko.tercerPuesto,
    ];
  }, [results, matches, overridesMap, knockoutSchedule]);

  // Pestaña inicial: primera fecha con partidos abiertos (solo al entrar).
  useEffect(() => {
    if (initialFilterSetRef.current || !isStoreReady || matches.length === 0) {
      return;
    }
    initialFilterSetRef.current = true;
    setActiveFilter(getDefaultPartidosFilter(matches, results, new Date()));
  }, [isStoreReady, matches, results]);

  const getLockForMatch = useCallback(
    (match: Match) => getPredictionLockFromResults(match, results, now),
    [results, now],
  );

  useEffect(() => {
    if (isAuthReady && user?.role === "participante" && user.paymentStatus !== "approved") {
      router.replace("/pago");
    }
  }, [isAuthReady, router, user]);

  const filteredGroupMatches = useMemo(() => {
    if (activeFilter.type === "fecha") {
      return matches.filter((match) => match.matchday === activeFilter.value);
    }
    return [];
  }, [activeFilter, matches]);

  // Clave de predicciones = auth.uid() = profiles.id. Preferimos resolvedUserId
  // del store (lee auth.uid() en Supabase) por si el session cache está desfasado.
  const participantId = resolvedUserId ?? user?.userId ?? "";
  const canPredict = user?.role === "participante";
  const userSaved = savedPredictions[participantId] ?? {};

  const activeTabMatches = useMemo(
    () => getMatchesForPartidosFilter(activeFilter, matches, knockoutMatches),
    [activeFilter, matches, knockoutMatches],
  );

  const tabSummary = useMemo(
    () =>
      summarizePartidosTab(activeFilter, activeTabMatches, results, userSaved, now),
    [activeFilter, activeTabMatches, results, userSaved, now],
  );

  const handlePredictionChange = useCallback(
    (matchId: string, side: keyof ScoreInput, value: string) => {
      if (!participantId) return;
      updatePrediction(participantId, matchId, side, value);
    },
    [updatePrediction, participantId],
  );

  const handleSavePrediction = useCallback(
    async (matchId: string) => {
      if (!participantId) {
        return false;
      }
      const match =
        matches.find((candidate) => candidate.id === matchId) ??
        knockoutMatches.find((candidate) => candidate.id === matchId);
      if (match) {
        const lock = getPredictionLockFromResults(match, results, now);
        if (lock.locked) {
          return false;
        }
      }
      return savePrediction(participantId, matchId);
    },
    [matches, knockoutMatches, participantId, results, savePrediction, now],
  );

  if (isAuthReady && user && !isStoreReady) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-6 lg:px-8">
        <p className="text-slate-300">Cargando tus predicciones…</p>
      </main>
    );
  }

  if (isAuthReady && !user) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="fc-card p-8 text-center">
          <h1 className="fc-display-italic text-3xl uppercase tracking-[0.02em] text-white">
            Iniciá sesión para cargar predicciones
          </h1>
          <p className="mt-3 text-slate-400">
            Accedé con tu cuenta para cargar tus pronósticos del Mundial.
          </p>
          <Link href="/login" className="fc-cta-fifa mt-6">
            <span aria-hidden>▸</span> Ir al login
          </Link>
        </div>
      </main>
    );
  }

  if (user?.role === "participante" && user.paymentStatus !== "approved") {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="fc-card border-[var(--fc-yellow)]/30 bg-gradient-to-br from-[var(--fc-yellow)]/10 via-transparent to-[var(--fc-yellow)]/[0.03] p-8 text-center">
          <span className="fc-chip fc-chip-yellow">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--fc-yellow)] fc-pulse-dot" />
            Inscripción pendiente
          </span>
          <h1 className="mt-4 fc-display-italic text-3xl uppercase tracking-[0.02em] text-white">
            Tu inscripción todavía no está aprobada.
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-200">
            Si ya pagaste, esperá la revisión del admin.
          </p>
          <Link href="/pago" className="fc-cta-ghost mt-6">
            Ir a pago
          </Link>
        </div>
      </main>
    );
  }

  const isEliminatoria = activeFilter.type === "eliminatoria";
  const userPredictions = predictions[participantId] ?? {};
  const userDbPredictions = dbPredictions[participantId] ?? {};

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-12">
      <PageHeader
        overline="Fixture · Mundial 2026"
        title="Predicciones del torneo"
        description="Cargá tu pronóstico fecha por fecha. La pestaña Fase eliminatoria arma la llave automáticamente con los resultados reales."
        tone="lime"
        actions={
          <span className="fc-chip fc-chip-neutral">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--fc-lime)]" />
            {canPredict ? "Rol · Participante" : "Rol · Admin (solo lectura)"}
          </span>
        }
      />

      {predictionSaveError ? (
        <div
          role="alert"
          className="mb-6 border border-[var(--fc-magenta)]/40 bg-[var(--fc-magenta)]/10 px-4 py-3 text-sm text-[var(--fc-magenta)]"
        >
          <p className="font-medium">No se pudo guardar la predicción</p>
          <p className="mt-1 text-slate-200">{predictionSaveError}</p>
          {predictionSaveError.toLowerCase().includes("sesión") ? (
            <Link href="/login" className="mt-2 inline-block text-[var(--fc-lime)] underline">
              Ir al login
            </Link>
          ) : null}
        </div>
      ) : null}

      {canPredict ? <PartidosPredictionAlert summary={tabSummary} /> : null}

      <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
        {filters.map((filter) => {
          const label =
            filter.type === "fecha" ? `Fecha ${filter.value}` : "Fase eliminatoria";
          const isActive =
            activeFilter.type === filter.type &&
            (filter.type === "eliminatoria" ||
              (activeFilter.type === "fecha" && activeFilter.value === filter.value));
          const key = filter.type === "fecha" ? `fecha-${filter.value}` : "eliminatoria";

          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`fc-broadcast-cut-sm fc-display-italic shrink-0 inline-flex items-center gap-2 px-4 py-2 text-[0.78rem] uppercase tracking-[0.14em] transition-colors ${
                isActive
                  ? "bg-[var(--fc-lime)] text-slate-950"
                  : "border border-white/[0.08] bg-white/[0.02] text-slate-300 hover:border-[var(--fc-lime)]/30 hover:bg-[var(--fc-lime)]/[0.06] hover:text-white"
              }`}
            >
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${
                  isActive ? "bg-slate-950" : "bg-white/25"
                }`}
              />
              {label}
            </button>
          );
        })}
      </div>

      {isEliminatoria ? (
        <KnockoutBracket
          bracket={bracket}
          results={results}
          predictions={userPredictions}
          dbPredictions={userDbPredictions}
          savedPredictions={userSaved}
          mode="view"
          canPredict={Boolean(canPredict)}
          getPredictionLock={getLockForMatch}
          onPredictionChange={canPredict ? handlePredictionChange : undefined}
          onSavePrediction={canPredict ? handleSavePrediction : undefined}
        />
      ) : (
        <div className="grid items-stretch gap-5 lg:grid-cols-2">
          {filteredGroupMatches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              prediction={userPredictions[match.id]}
              dbPrediction={userDbPredictions[match.id]}
              result={results[match.id]}
              isSaved={userSaved[match.id]}
              canPredict={canPredict}
              predictionLock={getLockForMatch(match)}
              onPredictionChange={(side, value) =>
                updatePrediction(participantId, match.id, side, value)
              }
              onSavePrediction={() => handleSavePrediction(match.id)}
              isSavingPrediction={isSavingPrediction}
            />
          ))}
        </div>
      )}
    </main>
  );
}
