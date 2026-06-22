"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { KnockoutBracket } from "@/components/bracket/KnockoutBracket";
import { CountryWithFlag } from "@/components/CountryWithFlag";
import { PageHeader } from "@/components/PageHeader";
import { groupNames, type GroupName, type Match } from "@/data/matches";
import { useAuth } from "@/hooks/useAuth";
import { useMatches } from "@/hooks/useMatches";
import { useProdeStore } from "@/hooks/useProdeStore";
import { useQualificationOverrides } from "@/hooks/useQualificationOverrides";
import { buildBracket } from "@/lib/bracket/buildBracket";
import { parseScore } from "@/lib/prode";
import {
  getGroupStandings,
  getThirdPlacedTeams,
  type TeamStanding,
} from "@/lib/standings";

/**
 * Filtros aceptados:
 *  - "grupo"        → muestra cards tradicionales por grupo (sólo partidos
 *                     con resultado cargado).
 *  - "eliminatoria" → muestra el bracket completo en modo read-only.
 */
type ResultFilter = { type: "grupo"; value: GroupName } | { type: "eliminatoria" };

const filters: ResultFilter[] = [
  ...groupNames.map((group) => ({ type: "grupo" as const, value: group })),
  { type: "eliminatoria" },
];

export default function ResultadosPage() {
  const { user, isReady: isAuthReady } = useAuth();
  const { matches, knockoutSchedule } = useMatches();
  const { results } = useProdeStore(user?.userId ?? undefined);
  const { overridesMap } = useQualificationOverrides();
  const [activeFilter, setActiveFilter] = useState<ResultFilter>({
    type: "grupo",
    value: "Grupo A",
  });
  const standings = useMemo(
    () => getGroupStandings(results, matches),
    [results, matches],
  );
  const bestThirds = useMemo(() => getThirdPlacedTeams(standings), [standings]);
  const bracket = useMemo(
    () => buildBracket(results, matches, overridesMap, knockoutSchedule),
    [results, matches, overridesMap, knockoutSchedule],
  );
  const visibleGroupMatches = useMemo(() => {
    if (activeFilter.type !== "grupo") return [];
    return matches
      .filter((match) => match.group === activeFilter.value)
      .filter((match) => parseScore(results[match.id]));
  }, [activeFilter, results, matches]);

  if (isAuthReady && !user) {
    return (
      <main className="mx-auto w-full max-w-4xl overflow-x-hidden px-4 py-16 sm:px-6 lg:px-8">
        <div className="fc-card p-8 text-center">
          <h1 className="fc-display-italic text-3xl uppercase tracking-[0.02em] text-white">
            Iniciá sesión para ver resultados
          </h1>
          <Link href="/login" className="fc-cta-fifa mt-6">
            <span aria-hidden>▸</span> Ir al login
          </Link>
        </div>
      </main>
    );
  }

  const isEliminatoria = activeFilter.type === "eliminatoria";

  return (
    <main className="mx-auto w-full max-w-7xl min-w-0 overflow-x-hidden px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <PageHeader
        overline="Resultados oficiales"
        title="Marcadores y tablas reales"
        description="Por grupo se ven los partidos con marcador cargado y la tabla real. La Fase eliminatoria muestra la llave dinámica desde 16avos hasta la final + 3°."
        tone="cyan"
      />

      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-2 sm:mx-0 sm:px-0">
        {filters.map((filter) => {
          const label = filter.type === "grupo" ? filter.value : "Fase eliminatoria";
          const isActive =
            activeFilter.type === filter.type &&
            (filter.type === "eliminatoria" ||
              (activeFilter.type === "grupo" && activeFilter.value === filter.value));
          const key = filter.type === "grupo" ? `grupo-${filter.value}` : "eliminatoria";

          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`fc-broadcast-cut-sm fc-display-italic shrink-0 inline-flex items-center gap-2 px-3 py-1.5 text-[0.68rem] uppercase tracking-[0.12em] transition-colors sm:px-4 sm:py-2 sm:text-[0.78rem] sm:tracking-[0.14em] ${
                isActive
                  ? "bg-[var(--fc-cyan)] text-slate-950"
                  : "border border-white/[0.08] bg-white/[0.02] text-slate-300 hover:border-[var(--fc-cyan)]/30 hover:bg-[var(--fc-cyan)]/[0.06] hover:text-white"
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
        <section className="min-w-0">
          <p className="mb-3 text-[0.7rem] text-slate-400 md:hidden">
            Deslizá horizontalmente para ver la llave completa.
          </p>
          <div className="max-w-full overflow-x-auto overscroll-x-contain">
            <KnockoutBracket
              bracket={bracket}
              results={results}
              predictions={{}}
              savedPredictions={{}}
              mode="view"
              canPredict={false}
            />
          </div>
        </section>
      ) : (
        <div className="grid min-w-0 gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="min-w-0">
            <h2 className="mb-4 fc-display-italic text-xl uppercase tracking-[0.02em] text-white sm:text-2xl">
              <span className="text-[var(--fc-cyan)]">▸</span> Partidos jugados
            </h2>
            <div className="space-y-4">
              {visibleGroupMatches.length ? (
                visibleGroupMatches.map((match) => (
                  <ResultadoMatchCard
                    key={match.id}
                    match={match}
                    score={parseScore(results[match.id])}
                  />
                ))
              ) : (
                <div className="fc-card p-6 text-slate-300">
                  Todavía no hay resultados cargados para este grupo.
                </div>
              )}
            </div>
          </section>

          <section className="min-w-0">
            <article className="fc-card fc-card-accent relative mb-6 p-4 sm:p-5">
              <h2 className="fc-display-italic text-xl uppercase tracking-[0.02em] text-white sm:text-2xl">
                <span className="text-[var(--fc-lime)]">▸</span> Clasificados
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Se muestran cuando cada grupo tiene sus 3 fechas cargadas.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {groupNames.map((group) => (
                  <div
                    key={group}
                    className="fc-broadcast-cut-sm min-w-0 border border-white/[0.07] bg-[#070b13] p-3 sm:p-4"
                  >
                    <p className="fc-display-italic text-sm uppercase tracking-[0.18em] text-[var(--fc-lime)]">
                      {group}
                    </p>
                    <p className="mt-2 truncate text-sm text-slate-200">
                      <span className="fc-stencil text-[var(--fc-lime)]">1°</span>{" "}
                      {standings[group][0]?.played === 3
                        ? standings[group][0].team
                        : "Se define al completar el grupo"}
                    </p>
                    <p className="truncate text-sm text-slate-200">
                      <span className="fc-stencil text-slate-300">2°</span>{" "}
                      {standings[group][1]?.played === 3
                        ? standings[group][1].team
                        : "Se define al completar el grupo"}
                    </p>
                  </div>
                ))}
              </div>
              <div className="fc-broadcast-cut-sm relative mt-4 border border-[var(--fc-yellow)]/25 bg-[var(--fc-yellow)]/[0.06] p-3 sm:p-4">
                <p className="fc-display-italic text-[0.66rem] uppercase tracking-[0.22em] text-[var(--fc-yellow)]">
                  Mejores terceros
                </p>
                <p className="mt-1 break-words text-sm text-slate-200">
                  {bestThirds.length
                    ? bestThirds.map((team) => `${team.team} (${team.group})`).join(" · ")
                    : "Pendiente de resultados completos"}
                </p>
              </div>
            </article>

            <h2 className="mb-4 fc-display-italic text-xl uppercase tracking-[0.02em] text-white sm:text-2xl">
              <span className="text-[var(--fc-cyan)]">▸</span> Tabla real por grupo
            </h2>
            <div className="space-y-6">
              {groupNames.map((group) => (
                <GroupStandingsBlock
                  key={group}
                  group={group}
                  teams={standings[group]}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function ResultadoMatchCard({
  match,
  score,
}: {
  match: Match;
  score: { home: number; away: number } | null;
}) {
  return (
    <article className="fc-card fc-card-accent relative min-w-0 p-4 transition-colors hover:border-[var(--fc-lime)]/20 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="fc-chip fc-chip-neutral max-w-full truncate">
          <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--fc-lime)]" />
          {match.group} {match.matchday ? `· F${match.matchday}` : ""}
        </span>
        <span className="fc-display-italic shrink-0 text-[0.65rem] uppercase tracking-[0.16em] text-slate-400 sm:text-[0.7rem] sm:tracking-[0.18em]">
          {match.date}
          {match.time && match.time !== "A definir" ? ` · ${match.time}` : ""}
        </span>
      </div>

      {/* Mobile: equipos apilados */}
      <div className="fc-broadcast-cut-sm relative mt-4 space-y-3 border border-white/[0.06] bg-[#070b13] p-3 sm:hidden">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <CountryWithFlag
            name={match.homeTeam}
            size={40}
            variant="stack"
            className="min-w-0 max-w-[58%]"
            nameClassName="text-[0.65rem]"
          />
          <span className="fc-stencil shrink-0 text-2xl text-white">{score?.home ?? "–"}</span>
        </div>
        <div className="fc-display-italic text-center text-[0.6rem] uppercase tracking-[0.28em] text-slate-500">
          vs
        </div>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <CountryWithFlag
            name={match.awayTeam}
            size={40}
            variant="stack"
            className="min-w-0 max-w-[58%]"
            nameClassName="text-[0.65rem]"
          />
          <span className="fc-stencil shrink-0 text-2xl text-white">{score?.away ?? "–"}</span>
        </div>
      </div>

      {/* Desktop: scoreboard horizontal */}
      <div className="fc-broadcast-cut-sm relative mt-5 hidden min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 border border-white/[0.06] bg-[#070b13] px-4 py-4 sm:grid">
        <CountryWithFlag
          name={match.homeTeam}
          size={48}
          variant="stack"
          className="min-w-0"
          nameClassName="text-[0.7rem]"
        />
        <p className="fc-stencil shrink-0 text-3xl text-white">
          {score?.home}
          <span className="px-1 text-[var(--fc-lime)]">:</span>
          {score?.away}
        </p>
        <CountryWithFlag
          name={match.awayTeam}
          size={48}
          variant="stack"
          className="min-w-0"
          nameClassName="text-[0.7rem]"
        />
      </div>

      <p className="mt-3 truncate fc-display-italic text-[0.62rem] uppercase tracking-[0.18em] text-slate-500 sm:text-[0.66rem] sm:tracking-[0.22em]">
        {match.venue} · {match.city}
      </p>
    </article>
  );
}

function GroupStandingsBlock({
  group,
  teams,
}: {
  group: GroupName;
  teams: TeamStanding[];
}) {
  return (
    <div className="fc-card min-w-0 overflow-hidden">
      <h3 className="fc-display-italic flex items-center gap-2 border-b border-white/[0.07] bg-[#02050b]/65 px-3 py-3 text-sm uppercase tracking-[0.18em] text-[var(--fc-lime)] sm:px-4">
        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--fc-lime)]" />
        {group}
      </h3>

      {/* Mobile: cards */}
      <ul className="divide-y divide-white/[0.06] md:hidden">
        {teams.map((team, idx) => (
          <li
            key={team.team}
            className={`px-3 py-3 ${idx < 2 ? "bg-[var(--fc-lime)]/[0.04]" : ""}`}
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="fc-display-italic truncate text-sm uppercase tracking-[0.04em] text-white">
                  {idx < 2 ? (
                    <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[var(--fc-lime)]" />
                  ) : (
                    <span className="mr-3 inline-block w-1.5" />
                  )}
                  {team.team}
                </p>
                <p className="mt-1 text-[0.65rem] tabular-nums text-slate-400">
                  PJ {team.played} · G {team.won} · E {team.drawn} · P {team.lost}
                </p>
                <p className="text-[0.65rem] tabular-nums text-slate-400">
                  GF {team.goalsFor} · GC {team.goalsAgainst} · DG {team.goalDifference}
                </p>
              </div>
              <span className="fc-stencil shrink-0 text-xl text-[var(--fc-lime)]">
                {team.points}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop: tabla con scroll interno */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-left text-sm tabular-nums">
          <thead>
            <tr className="border-b border-white/[0.07] text-slate-300">
              {["Equipo", "PJ", "G", "E", "P", "GF", "GC", "DG", "Pts"].map((header) => (
                <th
                  key={header}
                  className="fc-display-italic px-4 py-3 text-[0.7rem] uppercase tracking-[0.18em]"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((team, idx) => (
              <tr
                key={team.team}
                className={`border-b border-white/5 last:border-0 transition hover:bg-white/[0.025] ${
                  idx < 2 ? "bg-[var(--fc-lime)]/[0.04]" : ""
                }`}
              >
                <td className="fc-display-italic max-w-[12rem] truncate px-4 py-3 uppercase tracking-[0.04em] text-white">
                  {idx < 2 ? (
                    <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[var(--fc-lime)]" />
                  ) : null}
                  {team.team}
                </td>
                <td className="px-4 py-3 text-slate-200">{team.played}</td>
                <td className="px-4 py-3 text-slate-200">{team.won}</td>
                <td className="px-4 py-3 text-slate-200">{team.drawn}</td>
                <td className="px-4 py-3 text-slate-200">{team.lost}</td>
                <td className="px-4 py-3 text-slate-200">{team.goalsFor}</td>
                <td className="px-4 py-3 text-slate-200">{team.goalsAgainst}</td>
                <td className="px-4 py-3 text-slate-200">{team.goalDifference}</td>
                <td className="fc-stencil px-4 py-3 text-[var(--fc-lime)]">{team.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
