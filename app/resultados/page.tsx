"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { groupNames, matches, type GroupName, type Stage } from "@/data/matches";
import { useAuth } from "@/hooks/useAuth";
import { useProdeStore } from "@/hooks/useProdeStore";
import { parseScore } from "@/lib/prode";
import { getGroupStandings, getKnockoutMatches, getThirdPlacedTeams } from "@/lib/standings";

type ResultFilter =
  | { type: "grupo"; value: GroupName }
  | { type: "fase"; value: Exclude<Stage, "grupos"> };

const filters: ResultFilter[] = [
  ...groupNames.map((group) => ({ type: "grupo" as const, value: group })),
  { type: "fase", value: "16avos" },
  { type: "fase", value: "octavos" },
  { type: "fase", value: "cuartos" },
  { type: "fase", value: "semifinal" },
  { type: "fase", value: "final" },
];

export default function ResultadosPage() {
  const { user, isReady: isAuthReady } = useAuth();
  const { results } = useProdeStore();
  const [activeFilter, setActiveFilter] = useState<ResultFilter>({
    type: "grupo",
    value: "Grupo A",
  });
  const standings = useMemo(() => getGroupStandings(results), [results]);
  const bestThirds = useMemo(() => getThirdPlacedTeams(standings), [standings]);
  const knockoutMatches = useMemo(() => getKnockoutMatches(results), [results]);
  const visibleMatches = useMemo(() => {
    const source =
      activeFilter.type === "grupo"
        ? matches.filter((match) => match.group === activeFilter.value)
        : knockoutMatches[activeFilter.value];

    return source.filter((match) => parseScore(results[match.id]));
  }, [activeFilter, knockoutMatches, results]);

  if (isAuthReady && !user) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl shadow-black/20">
          <h1 className="text-3xl font-black text-white">Iniciá sesión para ver resultados</h1>
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

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-6 lg:px-8 lg:py-12">
      <section className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-emerald-200">
          Resultados
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Resultados reales y tablas de grupos
        </h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          Acá se ven solo los partidos con resultado cargado y las posiciones reales del
          Mundial calculadas automáticamente.
        </p>
      </section>

      <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
        {filters.map((filter) => {
          const label = filter.type === "grupo" ? filter.value : stageLabel(filter.value);
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
                  : "border border-white/10 bg-white/[0.08] text-slate-200 hover:-translate-y-0.5 hover:bg-white/15 hover:text-white"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <section>
          <h2 className="mb-4 text-2xl font-black text-white">Partidos jugados</h2>
          <div className="space-y-4">
            {visibleMatches.length ? (
              visibleMatches.map((match) => {
                const score = parseScore(results[match.id]);

                return (
                  <article
                    key={match.id}
                    className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.075] to-white/[0.035] p-5 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:border-emerald-300/25"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-bold text-emerald-200">
                        {match.group} {match.matchday ? `· Fecha ${match.matchday}` : ""}
                      </p>
                      <p className="text-sm text-slate-300">{match.date}</p>
                    </div>
                    <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                      <p className="text-lg font-black">{match.homeTeam}</p>
                      <p className="rounded-2xl bg-slate-950/70 px-4 py-2 text-2xl font-black text-lime-200">
                        {score?.home} - {score?.away}
                      </p>
                      <p className="text-right text-lg font-black">{match.awayTeam}</p>
                    </div>
                    <p className="mt-3 text-sm text-slate-400">
                      {match.venue} · {match.city}
                    </p>
                  </article>
                );
              })
            ) : (
              <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-slate-300">
                Todavía no hay resultados cargados para este filtro.
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="mb-6 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.075] to-white/[0.035] p-5 shadow-lg shadow-black/10">
            <h2 className="text-2xl font-black text-white">Clasificados</h2>
            <p className="mt-2 text-sm text-slate-300">
              Se muestran cuando cada grupo tiene sus 3 fechas cargadas.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {groupNames.map((group) => (
                <div key={group} className="rounded-2xl bg-slate-950/60 p-4">
                  <p className="font-bold text-emerald-200">{group}</p>
                  <p className="mt-2 text-sm text-slate-200">
                    1° {standings[group][0]?.played === 3 ? standings[group][0].team : "Se define al completar el grupo"}
                  </p>
                  <p className="text-sm text-slate-200">
                    2° {standings[group][1]?.played === 3 ? standings[group][1].team : "Se define al completar el grupo"}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-slate-950/60 p-4">
              <p className="font-bold text-emerald-200">Mejores terceros</p>
              <p className="mt-2 text-sm text-slate-200">
                {bestThirds.length
                  ? bestThirds.map((team) => `${team.team} (${team.group})`).join(" · ")
                  : "Pendiente de resultados completos"}
              </p>
            </div>
          </div>

          <h2 className="mb-4 text-2xl font-black text-white">Tabla real por grupo</h2>
          <div className="space-y-6">
            {groupNames.map((group) => (
              <div key={group} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] shadow-lg shadow-black/10">
                <h3 className="bg-slate-950/70 px-4 py-3 font-black text-emerald-200">{group}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-sm">
                    <thead className="text-slate-300">
                      <tr className="border-b border-white/10">
                        {["Equipo", "PJ", "G", "E", "P", "GF", "GC", "DG", "Pts"].map((header) => (
                          <th key={header} className="px-4 py-3 font-bold">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {standings[group].map((team) => (
                        <tr key={team.team} className="border-b border-white/5 last:border-0">
                          <td className="px-4 py-3 font-bold text-white">{team.team}</td>
                          <td className="px-4 py-3 text-slate-200">{team.played}</td>
                          <td className="px-4 py-3 text-slate-200">{team.won}</td>
                          <td className="px-4 py-3 text-slate-200">{team.drawn}</td>
                          <td className="px-4 py-3 text-slate-200">{team.lost}</td>
                          <td className="px-4 py-3 text-slate-200">{team.goalsFor}</td>
                          <td className="px-4 py-3 text-slate-200">{team.goalsAgainst}</td>
                          <td className="px-4 py-3 text-slate-200">{team.goalDifference}</td>
                          <td className="px-4 py-3 font-black text-lime-200">{team.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function stageLabel(stage: Exclude<Stage, "grupos">) {
  const labels = {
    "16avos": "16avos",
    octavos: "Octavos",
    cuartos: "Cuartos",
    semifinal: "Semifinal",
    final: "Final",
  };

  return labels[stage];
}
