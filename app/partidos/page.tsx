"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MatchCard } from "@/components/MatchCard";
import { matches, type Matchday, type Stage } from "@/data/matches";
import { useAuth } from "@/hooks/useAuth";
import { useProdeStore } from "@/hooks/useProdeStore";
import { getKnockoutMatches } from "@/lib/standings";

type Filter =
  | { type: "fecha"; value: Matchday }
  | { type: "fase"; value: Exclude<Stage, "grupos"> };

const filters: Filter[] = [
  { type: "fecha", value: 1 },
  { type: "fecha", value: 2 },
  { type: "fecha", value: 3 },
  { type: "fase", value: "16avos" },
  { type: "fase", value: "octavos" },
  { type: "fase", value: "cuartos" },
  { type: "fase", value: "semifinal" },
  { type: "fase", value: "final" },
];

export default function PartidosPage() {
  const router = useRouter();
  const { user, isReady: isAuthReady } = useAuth();
  const {
    predictions,
    savedPredictions,
    results,
    updatePrediction,
    savePrediction,
  } = useProdeStore();
  const [activeFilter, setActiveFilter] = useState<Filter>({ type: "fecha", value: 1 });
  const knockoutMatches = useMemo(() => getKnockoutMatches(results), [results]);

  useEffect(() => {
    if (isAuthReady && user?.role === "participante" && user.paymentStatus !== "approved") {
      router.replace("/pago");
    }
  }, [isAuthReady, router, user]);

  const filteredMatches = useMemo(
    () => {
      if (activeFilter.type === "fecha") {
        return matches.filter((match) => match.matchday === activeFilter.value);
      }

      return knockoutMatches[activeFilter.value];
    },
    [activeFilter, knockoutMatches],
  );

  if (isAuthReady && !user) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl shadow-black/20">
          <h1 className="text-3xl font-black text-white">Iniciá sesión para cargar predicciones</h1>
          <p className="mt-3 text-slate-400">
            Usá el participante de prueba: usuario mateo, contraseña mateo123.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-full bg-emerald-300 px-6 py-3 font-black text-slate-950 shadow-lg shadow-emerald-950/20 transition hover:-translate-y-0.5"
          >
            Ir al login
          </Link>
        </div>
      </main>
    );
  }

  const canPredict = user?.role === "participante";
  const username = user?.username ?? "";

  if (user?.role === "participante" && user.paymentStatus !== "approved") {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-amber-300/30 bg-amber-300/10 p-8 text-center shadow-2xl shadow-black/20">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-amber-200">
            Inscripción pendiente
          </p>
          <h1 className="mt-3 text-3xl font-black text-white">
            Tu inscripción todavía no está aprobada.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-200">
            Tu inscripción todavía no está aprobada. Si ya pagaste, esperá la revisión del admin.
          </p>
          <Link
            href="/pago"
            className="mt-6 inline-flex rounded-full border border-white/15 bg-white/[0.08] px-6 py-3 font-bold text-white transition hover:bg-white/15"
          >
            Ir a pago
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-12">
      <section className="mb-8 flex flex-col justify-between gap-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-emerald-200">
            Partidos
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Predicciones del Mundial 2026
          </h1>
          <p className="mt-4 max-w-2xl text-slate-400">
            Filtrá por fecha o fase eliminatoria. Los cruces se actualizan según los
            resultados reales cargados por el admin.
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">
          {canPredict
            ? "Rol participante: podés guardar predicciones."
            : "Rol admin: vista de partidos sin carga de predicción."}
        </div>
      </section>

      <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
        {filters.map((filter) => {
          const label = filter.type === "fecha" ? `Fecha ${filter.value}` : stageLabel(filter.value);
          const isActive =
            activeFilter.type === filter.type && activeFilter.value === filter.value;

          return (
            <button
              key={`${filter.type}-${filter.value}`}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                isActive
                  ? "bg-emerald-300 text-slate-950 shadow-lg shadow-emerald-950/20"
                  : "border border-white/10 bg-white/[0.06] text-slate-300 hover:-translate-y-0.5 hover:bg-white/10 hover:text-white"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="grid items-stretch gap-5 lg:grid-cols-2">
        {filteredMatches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            prediction={predictions[username]?.[match.id]}
            result={results[match.id]}
            isSaved={savedPredictions[username]?.[match.id]}
            canPredict={canPredict}
            onPredictionChange={(side, value) =>
              updatePrediction(username, match.id, side, value)
            }
            onSavePrediction={() => savePrediction(username, match.id)}
          />
        ))}
      </div>
    </main>
  );
}

function stageLabel(stage: Matchday | Exclude<Stage, "grupos">) {
  const labels = {
    "16avos": "16avos",
    octavos: "Octavos",
    cuartos: "Cuartos",
    semifinal: "Semifinal",
    final: "Final",
  };

  return typeof stage === "number" ? `Fecha ${stage}` : labels[stage];
}
