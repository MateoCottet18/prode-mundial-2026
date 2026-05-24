"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MatchCard } from "@/components/MatchCard";
import { PageHeader } from "@/components/PageHeader";
import { KnockoutBracket } from "@/components/bracket/KnockoutBracket";
import { type Matchday } from "@/data/matches";
import { useAuth } from "@/hooks/useAuth";
import { useMatches } from "@/hooks/useMatches";
import { useProdeStore } from "@/hooks/useProdeStore";
import { useQualificationOverrides } from "@/hooks/useQualificationOverrides";
import { buildBracket } from "@/lib/bracket/buildBracket";
import type { ScoreInput } from "@/lib/prode";

/**
 * Filtros aceptados:
 *  - "fecha"        → muestra cards tradicionales por fecha de grupos.
 *  - "eliminatoria" → muestra el bracket completo (16avos → final + 3°).
 *
 * No existen más filtros sueltos para 16avos/octavos/cuartos/etc; toda la
 * fase eliminatoria vive en una única visualización.
 */
type Filter =
  | { type: "fecha"; value: Matchday }
  | { type: "eliminatoria" };

const filters: Filter[] = [
  { type: "fecha", value: 1 },
  { type: "fecha", value: 2 },
  { type: "fecha", value: 3 },
  { type: "eliminatoria" },
];

export default function PartidosPage() {
  const router = useRouter();
  const { user, isReady: isAuthReady } = useAuth();
  const { matches } = useMatches();
  const {
    predictions,
    savedPredictions,
    results,
    updatePrediction,
    savePrediction,
  } = useProdeStore();
  const { overridesMap } = useQualificationOverrides();
  const [activeFilter, setActiveFilter] = useState<Filter>({ type: "fecha", value: 1 });

  const bracket = useMemo(
    () => buildBracket(results, matches, overridesMap),
    [results, matches, overridesMap],
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

  const username = user?.userId ?? user?.username ?? "";
  const canPredict = user?.role === "participante";

  const handlePredictionChange = useCallback(
    (matchId: string, side: keyof ScoreInput, value: string) => {
      if (!username) return;
      updatePrediction(username, matchId, side, value);
    },
    [updatePrediction, username],
  );

  const handleSavePrediction = useCallback(
    async (matchId: string) => {
      if (!username) return false;
      return savePrediction(username, matchId);
    },
    [savePrediction, username],
  );

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
  const userPredictions = predictions[username] ?? {};
  const userSaved = savedPredictions[username] ?? {};

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
              className={`fc-broadcast-cut-sm fc-display-italic shrink-0 inline-flex items-center gap-2 px-4 py-2 text-[0.78rem] uppercase tracking-[0.14em] transition hover:-translate-y-0.5 ${
                isActive
                  ? "bg-[var(--fc-lime)] text-slate-950 shadow-[0_0_24px_rgba(212,255,63,0.45)]"
                  : "border border-white/[0.07] bg-white/[0.025] text-slate-300 hover:border-[var(--fc-lime)]/30 hover:bg-[var(--fc-lime)]/[0.08] hover:text-white"
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
          savedPredictions={userSaved}
          mode="view"
          canPredict={Boolean(canPredict)}
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
              result={results[match.id]}
              isSaved={userSaved[match.id]}
              canPredict={canPredict}
              onPredictionChange={(side, value) =>
                updatePrediction(username, match.id, side, value)
              }
              onSavePrediction={() => savePrediction(username, match.id)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
