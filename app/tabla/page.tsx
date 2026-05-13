"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useProdeStore } from "@/hooks/useProdeStore";
import { useUsers } from "@/hooks/useUsers";
import { getParticipantUsers, getUserPoints } from "@/lib/prode";
import { getAllGeneratedMatches } from "@/lib/standings";

export default function TablaPage() {
  const { user, isReady: isAuthReady } = useAuth();
  const { predictions, savedPredictions, results } = useProdeStore();
  const { registeredUsers } = useUsers();
  const allMatches = getAllGeneratedMatches(results);
  const allMatchIds = allMatches.map((match) => match.id);

  if (isAuthReady && !user) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-8 text-center shadow-2xl shadow-black/20">
          <h1 className="text-3xl font-black text-white">Iniciá sesión para ver la tabla</h1>
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

  const standings = getParticipantUsers(registeredUsers)
    .map((participant) => {
      const points = getUserPoints(
        participant.username,
        predictions,
        savedPredictions,
        results,
        allMatchIds,
      );
      const savedCount = allMatches.filter(
        (match) => savedPredictions[participant.username]?.[match.id],
      ).length;

      return {
        username: participant.username,
        displayName: participant.displayName,
        points,
        savedCount,
      };
    })
    .sort((userA, userB) => userB.points - userA.points)
    .map((participant, index) => ({ ...participant, rank: index + 1 }));

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-6 lg:px-8 lg:py-12">
      <section className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-emerald-200">
          Tabla de participantes
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Participantes ordenados por puntos
        </h1>
        <p className="mt-4 max-w-2xl text-slate-400">
          La tabla se recalcula con resultados reales de grupos y eliminación directa.
        </p>
      </section>

      <div className="space-y-4">
        {standings.map((participant) => (
          <div
            key={participant.username}
            className={`flex flex-col gap-4 rounded-3xl border p-5 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between ${
              participant.username === user?.username
                ? "border-emerald-300/50 bg-emerald-300/10"
                : "border-white/10 bg-white/[0.06]"
            }`}
          >
            <div className="flex items-center gap-4">
              <span
                className={`grid h-12 w-12 place-items-center rounded-2xl text-lg font-black ${
                  participant.rank === 1
                    ? "bg-gradient-to-br from-yellow-200 to-lime-300 text-slate-950"
                    : "bg-white/10 text-white"
                }`}
              >
                {participant.rank}
              </span>
              <div>
                <p className="text-lg font-black">{participant.displayName}</p>
                <p className="text-sm text-slate-400">
                  {participant.savedCount} predicciones guardadas
                </p>
              </div>
            </div>
            <p className="text-3xl font-black text-lime-200">{participant.points} puntos</p>
          </div>
        ))}
      </div>
    </main>
  );
}
