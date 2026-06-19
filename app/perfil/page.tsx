"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMatches } from "@/hooks/useMatches";
import { useProdeStore } from "@/hooks/useProdeStore";
import { useQualificationOverrides } from "@/hooks/useQualificationOverrides";
import { useRankingAggregates } from "@/hooks/useRankingAggregates";
import { useUsers } from "@/hooks/useUsers";
import { ProfilePredictionCard } from "@/components/ProfilePredictionCard";
import { AdminOverdueAlert } from "@/components/AdminOverdueAlert";
import { AdminLoadedResultCard } from "@/components/AdminLoadedResultCard";
import { PageHeader } from "@/components/PageHeader";
import { calculatePoints, getParticipantUsers } from "@/lib/prode";
import {
  buildRanking,
  buildRankingFromAggregates,
  type RankingEntry,
} from "@/lib/ranking";
import { getAllGeneratedMatches } from "@/lib/standings";
import { getMatchesWithResults, getOverdueMatches } from "@/lib/matchTime";

export default function PerfilPage() {
  const { user, isReady: isAuthReady } = useAuth();
  const { matches, knockoutSchedule } = useMatches();
  // Sólo necesitamos las predicciones del usuario logueado para mostrar la
  // grilla "tus predicciones". El ranking sale de los agregados pre-calculados
  // en SQL, así no bajamos las predicciones de los otros 499 participantes.
  const {
    predictions,
    dbPredictions,
    savedPredictions,
    results,
    resolvedUserId,
    isReady: isStoreReady,
  } = useProdeStore(user?.userId ?? undefined, { skipUntilUserId: true });
  const { registeredUsers, isReady: isUsersReady } = useUsers();
  const { overridesMap } = useQualificationOverrides();
  const { aggregates: rankingAggregates } = useRankingAggregates();

  const isAdmin = user?.role === "admin";
  const allMatches = useMemo(
    () => getAllGeneratedMatches(results, matches, overridesMap, knockoutSchedule),
    [results, matches, overridesMap, knockoutSchedule],
  );

  if (!isAuthReady) {
    return (
      <main className="mx-auto w-full max-w-5xl px-5 py-16 sm:px-6 lg:px-8">
        <p className="text-slate-300">Cargando tu perfil…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="fc-card p-8 text-center">
          <h1 className="fc-display-italic text-3xl uppercase tracking-[0.02em] text-white">
            Iniciá sesión para ver tu perfil
          </h1>
          <p className="mt-3 text-sm text-slate-300">
            Necesitás estar logueado para ver tu actividad en el prode.
          </p>
          <Link href="/login" className="fc-cta-fifa mt-6">
            <span aria-hidden>▸</span> Ir al login
          </Link>
        </div>
      </main>
    );
  }

  if (isAdmin) {
    return (
      <AdminProfileView
        userName={user.name}
        userUsername={user.username}
        allMatches={allMatches}
        results={results}
        isStoreReady={isStoreReady}
      />
    );
  }

  return (
    <ParticipantProfileView
      userName={user.name}
      userUsername={user.username}
      userRole={user.role}
      userKey={resolvedUserId ?? user.userId}
      registeredUsers={registeredUsers}
      predictions={predictions}
      dbPredictions={dbPredictions}
      savedPredictions={savedPredictions}
      results={results}
      allMatches={allMatches}
      matchesList={matches}
      overridesMap={overridesMap}
      rankingAggregates={rankingAggregates}
      isStoreReady={isStoreReady}
      isUsersReady={isUsersReady}
    />
  );
}

// -----------------------------------------------------------------------------
// Vista del participante (mantiene comportamiento previo).
// -----------------------------------------------------------------------------

type ParticipantProfileViewProps = {
  userName: string;
  userUsername: string;
  userRole: string;
  userKey: string;
  registeredUsers: ReturnType<typeof useUsers>["registeredUsers"];
  predictions: ReturnType<typeof useProdeStore>["predictions"];
  dbPredictions: ReturnType<typeof useProdeStore>["dbPredictions"];
  savedPredictions: ReturnType<typeof useProdeStore>["savedPredictions"];
  results: ReturnType<typeof useProdeStore>["results"];
  allMatches: ReturnType<typeof getAllGeneratedMatches>;
  matchesList: ReturnType<typeof useMatches>["matches"];
  overridesMap: ReturnType<typeof useQualificationOverrides>["overridesMap"];
  rankingAggregates: ReturnType<typeof useRankingAggregates>["aggregates"];
  isStoreReady: boolean;
  isUsersReady: boolean;
};

function ParticipantProfileView({
  userName,
  userUsername,
  userRole,
  userKey,
  registeredUsers,
  predictions,
  dbPredictions,
  savedPredictions,
  results,
  allMatches,
  matchesList,
  overridesMap,
  rankingAggregates,
  isStoreReady,
  isUsersReady,
}: ParticipantProfileViewProps) {
  // Ranking del lado SQL: 1 fila por usuario, sin recorrer 52k predicciones.
  // Si la view aún no respondió o no existe (deploy parcial), caemos al cálculo
  // crudo — pero como `dbPredictions` ahora sólo trae al user logueado, los
  // otros aparecen en 0 hasta que llega el agregado.
  const ranking: RankingEntry[] = useMemo(() => {
    if (rankingAggregates) {
      return buildRankingFromAggregates(registeredUsers, rankingAggregates);
    }
    return buildRanking(
      registeredUsers,
      dbPredictions,
      savedPredictions,
      results,
      matchesList,
      overridesMap,
    );
  }, [
    rankingAggregates,
    registeredUsers,
    dbPredictions,
    savedPredictions,
    results,
    matchesList,
    overridesMap,
  ]);

  const myEntry = useMemo(
    () => ranking.find((entry) => entry.username === userUsername),
    [ranking, userUsername],
  );

  const totalParticipants = useMemo(
    () => getParticipantUsers(registeredUsers).length,
    [registeredUsers],
  );

  const userPredictions = useMemo(() => {
    if (!userKey) {
      return [];
    }

    return allMatches
      .map((match) => {
        // El input local sirve para detectar predicciones que el usuario está
        // armando pero todavía no guardó. Para puntos usamos `dbPredictions`,
        // que es lo realmente persistido.
        const draft = predictions[userKey]?.[match.id];
        const persisted = dbPredictions[userKey]?.[match.id];
        const isSaved = Boolean(savedPredictions[userKey]?.[match.id]);
        const result = results[match.id];
        const points = calculatePoints(persisted, result, isSaved);

        return {
          match,
          prediction: persisted ?? draft,
          result,
          isSaved,
          points,
        };
      })
      .filter((row) => row.isSaved || row.prediction?.home || row.prediction?.away);
  }, [allMatches, predictions, dbPredictions, savedPredictions, results, userKey]);

  const savedCount = userPredictions.filter((row) => row.isSaved).length;
  const scoredCount = userPredictions.filter((row) => row.points !== null).length;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6 lg:px-8 lg:py-12">
      <PageHeader
        overline={`@${userUsername} · ${userRole}`}
        title={userName}
        description="Tu actividad en el torneo: puntos, posición, predicciones cargadas."
        tone="lime"
        actions={
          <>
            <Link href="/partidos" className="fc-cta-fifa">
              <span aria-hidden>▸</span> Predicciones
            </Link>
            <Link href="/tabla" className="fc-cta-ghost">
              Ver ranking
            </Link>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Puntos totales" value={`${myEntry?.points ?? 0}`} highlight />
        <Stat
          label="Posición"
          value={
            myEntry
              ? `${myEntry.rank}° / ${totalParticipants}`
              : `— / ${totalParticipants}`
          }
        />
        <Stat
          label="Predicciones guardadas"
          value={
            isStoreReady && isUsersReady
              ? `${savedCount}${scoredCount ? ` · ${scoredCount} con puntaje` : ""}`
              : "…"
          }
        />
      </section>

      <section className="mt-10">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="h-2 w-2 rotate-45 bg-[var(--fc-cyan)]" />
            <div>
              <p className="fc-display-italic text-[0.7rem] uppercase tracking-[0.32em] text-[var(--fc-cyan)]">
                Mis predicciones
              </p>
              <h2 className="mt-1 fc-display-italic text-2xl uppercase tracking-[0.02em] text-white">
                Partidos pronosticados
              </h2>
            </div>
          </div>
          <p className="fc-display-italic text-[0.7rem] uppercase tracking-[0.18em] text-slate-400 tabular-nums">
            {userPredictions.length === 0
              ? "Todavía no cargaste ninguna predicción."
              : `${userPredictions.length} partido${userPredictions.length === 1 ? "" : "s"}`}
          </p>
        </header>

        {userPredictions.length === 0 ? (
          <div className="fc-card p-8 text-center">
            <p className="text-slate-300">
              Cuando cargues tus pronósticos en{" "}
              <Link href="/partidos" className="font-bold text-emerald-200 underline">
                Partidos
              </Link>{" "}
              vas a verlos acá con los puntos que ganaste.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {userPredictions.map(({ match, prediction, result, isSaved }) => (
              <ProfilePredictionCard
                key={match.id}
                match={match}
                prediction={prediction}
                result={result}
                isSaved={isSaved}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

// -----------------------------------------------------------------------------
// Vista del admin: nada de predicciones propias. Resultados cargados + alerta.
// -----------------------------------------------------------------------------

type AdminProfileViewProps = {
  userName: string;
  userUsername: string;
  allMatches: ReturnType<typeof getAllGeneratedMatches>;
  results: ReturnType<typeof useProdeStore>["results"];
  isStoreReady: boolean;
};

function AdminProfileView({
  userName,
  userUsername,
  allMatches,
  results,
  isStoreReady,
}: AdminProfileViewProps) {
  const overdueMatches = useMemo(
    () => getOverdueMatches(allMatches, results),
    [allMatches, results],
  );
  const loadedMatches = useMemo(
    () => getMatchesWithResults(allMatches, results),
    [allMatches, results],
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6 lg:px-8 lg:py-12">
      <PageHeader
        overline={`@${userUsername} · admin`}
        title={`${userName} · Sala de control`}
        description="KPIs del torneo · resultados cargados · alertas de vencidos."
        tone="magenta"
        actions={
          <>
            <Link href="/admin" className="fc-cta-fifa">
              <span aria-hidden>▸</span> Cargar resultados
            </Link>
            <Link href="/tabla" className="fc-cta-ghost">
              Ver ranking
            </Link>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Resultados cargados"
          value={isStoreReady ? `${loadedMatches.length}` : "…"}
          highlight
        />
        <Stat
          label="Vencidos sin cargar"
          value={isStoreReady ? `${overdueMatches.length}` : "…"}
          tone={overdueMatches.length > 0 ? "danger" : "neutral"}
        />
        <Stat label="Partidos totales" value={`${allMatches.length}`} />
      </section>

      <AdminOverdueAlert overdueMatches={overdueMatches} resultsHref="/admin" />

      <section className="mt-10">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="h-2 w-2 rotate-45 bg-[var(--fc-lime)]" />
            <div>
              <p className="fc-display-italic text-[0.7rem] uppercase tracking-[0.32em] text-[var(--fc-lime)]">
                Resultados cargados
              </p>
              <h2 className="mt-1 fc-display-italic text-2xl uppercase tracking-[0.02em] text-white">
                Partidos con marcador final
              </h2>
            </div>
          </div>
          <p className="fc-display-italic text-[0.7rem] uppercase tracking-[0.18em] text-slate-400 tabular-nums">
            {loadedMatches.length === 0
              ? "Todavía no cargaste ningún resultado."
              : `${loadedMatches.length} partido${loadedMatches.length === 1 ? "" : "s"} con resultado`}
          </p>
        </header>

        {loadedMatches.length === 0 ? (
          <div className="fc-card p-8 text-center">
            <p className="text-slate-300">
              Cargá los primeros resultados desde{" "}
              <Link href="/admin" className="font-bold text-emerald-200 underline">
                Administrar resultados
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {loadedMatches.map((match) => (
              <AdminLoadedResultCard
                key={match.id}
                match={match}
                result={results[match.id]}
                results={results}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

// -----------------------------------------------------------------------------
// Stat helper compartido.
// -----------------------------------------------------------------------------

function Stat({
  label,
  value,
  highlight = false,
  tone = "neutral",
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "neutral" | "danger";
}) {
  const palette =
    tone === "danger"
      ? "border-[var(--fc-magenta)]/30 bg-[var(--fc-magenta)]/[0.05]"
      : highlight
        ? "border-[var(--fc-lime)]/30 bg-[var(--fc-lime)]/[0.05]"
        : "border-white/[0.07] bg-white/[0.03]";
  const dot =
    tone === "danger"
      ? "bg-[var(--fc-magenta)] fc-pulse-dot"
      : highlight
        ? "bg-[var(--fc-lime)]"
        : "bg-slate-400";
  const valueColor =
    tone === "danger"
      ? "text-[var(--fc-magenta)]"
      : highlight
        ? "text-[var(--fc-lime)]"
        : "text-white";

  return (
    <div className={`fc-broadcast-cut-sm relative flex flex-col gap-2 border p-5 ${palette}`}>
      <div className="flex items-center gap-2">
        <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        <p className="fc-display-italic text-[0.66rem] uppercase tracking-[0.22em] text-slate-400">
          {label}
        </p>
      </div>
      <p className={`fc-stencil text-4xl ${valueColor}`}>{value}</p>
    </div>
  );
}
