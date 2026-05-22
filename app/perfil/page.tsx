"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProdeStore } from "@/hooks/useProdeStore";
import { useUsers } from "@/hooks/useUsers";
import { ProfilePredictionCard } from "@/components/ProfilePredictionCard";
import { AdminOverdueAlert } from "@/components/AdminOverdueAlert";
import { AdminLoadedResultCard } from "@/components/AdminLoadedResultCard";
import { calculatePoints, getParticipantUsers } from "@/lib/prode";
import { buildRanking } from "@/lib/ranking";
import { getAllGeneratedMatches } from "@/lib/standings";
import { getMatchesWithResults, getOverdueMatches } from "@/lib/matchTime";

export default function PerfilPage() {
  const { user, isReady: isAuthReady } = useAuth();
  const { predictions, savedPredictions, results, isReady: isStoreReady } = useProdeStore();
  const { registeredUsers, isReady: isUsersReady } = useUsers();

  const isAdmin = user?.role === "admin";
  const allMatches = useMemo(() => getAllGeneratedMatches(results), [results]);

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
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl shadow-black/20">
          <h1 className="text-3xl font-black text-white">Iniciá sesión para ver tu perfil</h1>
          <p className="mt-3 text-sm text-slate-300">
            Necesitás estar logueado para ver tu actividad en el prode.
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
      userKey={user.userId ?? user.username ?? ""}
      registeredUsers={registeredUsers}
      predictions={predictions}
      savedPredictions={savedPredictions}
      results={results}
      allMatches={allMatches}
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
  savedPredictions: ReturnType<typeof useProdeStore>["savedPredictions"];
  results: ReturnType<typeof useProdeStore>["results"];
  allMatches: ReturnType<typeof getAllGeneratedMatches>;
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
  savedPredictions,
  results,
  allMatches,
  isStoreReady,
  isUsersReady,
}: ParticipantProfileViewProps) {
  const ranking = useMemo(
    () => buildRanking(registeredUsers, predictions, savedPredictions, results),
    [registeredUsers, predictions, savedPredictions, results],
  );

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
        const prediction = predictions[userKey]?.[match.id];
        const isSaved = Boolean(savedPredictions[userKey]?.[match.id]);
        const result = results[match.id];
        const points = calculatePoints(prediction, result, isSaved);

        return { match, prediction, result, isSaved, points };
      })
      .filter((row) => row.isSaved || row.prediction?.home || row.prediction?.away);
  }, [allMatches, predictions, savedPredictions, results, userKey]);

  const savedCount = userPredictions.filter((row) => row.isSaved).length;
  const scoredCount = userPredictions.filter((row) => row.points !== null).length;

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6 lg:px-8 lg:py-12">
      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-emerald-300/10 via-white/[0.04] to-lime-300/10 p-6 shadow-2xl shadow-black/20 sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-emerald-200">Mi perfil</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
          {userName}
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          @{userUsername} · Rol: {userRole}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
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
        </div>

        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link
            href="/partidos"
            className="rounded-full bg-emerald-300 px-5 py-2 font-black text-slate-950 transition hover:-translate-y-0.5"
          >
            Cargar predicciones
          </Link>
          <Link
            href="/tabla"
            className="rounded-full border border-white/15 bg-white/[0.06] px-5 py-2 font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
          >
            Ver ranking
          </Link>
        </div>
      </section>

      <section className="mt-10">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-200">
              Mis predicciones
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">Partidos pronosticados</h2>
          </div>
          <p className="text-sm text-slate-400">
            {userPredictions.length === 0
              ? "Todavía no cargaste ninguna predicción."
              : `${userPredictions.length} partido${userPredictions.length === 1 ? "" : "s"}`}
          </p>
        </header>

        {userPredictions.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
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
      <section className="rounded-[2rem] border border-emerald-300/30 bg-gradient-to-br from-emerald-300/15 via-white/[0.04] to-cyan-300/10 p-6 shadow-2xl shadow-black/20 sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-emerald-200">
          Panel de administración
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
          {userName}
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          @{userUsername} · Rol: admin
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
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
          <Stat
            label="Partidos totales"
            value={`${allMatches.length}`}
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link
            href="/admin"
            className="rounded-full bg-emerald-300 px-5 py-2 font-black text-slate-950 transition hover:-translate-y-0.5"
          >
            Ir a cargar resultados
          </Link>
          <Link
            href="/tabla"
            className="rounded-full border border-white/15 bg-white/[0.06] px-5 py-2 font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/10"
          >
            Ver ranking
          </Link>
        </div>
      </section>

      <AdminOverdueAlert overdueMatches={overdueMatches} resultsHref="/admin" />

      <section className="mt-10">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-200">
              Resultados cargados
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              Partidos con marcador final
            </h2>
          </div>
          <p className="text-sm text-slate-400">
            {loadedMatches.length === 0
              ? "Todavía no cargaste ningún resultado."
              : `${loadedMatches.length} partido${loadedMatches.length === 1 ? "" : "s"} con resultado`}
          </p>
        </header>

        {loadedMatches.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
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
      ? "border-red-300/40 bg-red-300/10"
      : highlight
        ? "border-emerald-300/40 bg-emerald-300/10"
        : "border-white/10 bg-white/[0.05]";

  return (
    <div className={`rounded-3xl border p-5 ${palette}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-200/80">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}
