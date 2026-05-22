"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProdeStore } from "@/hooks/useProdeStore";
import { useUsers } from "@/hooks/useUsers";
import { RankingTable } from "@/components/RankingTable";
import { buildRanking } from "@/lib/ranking";

const TOP_LIMIT = 20;

export default function TablaPage() {
  const { user, isReady: isAuthReady } = useAuth();
  const { predictions, savedPredictions, results } = useProdeStore();
  const { registeredUsers } = useUsers();

  const ranking = useMemo(
    () => buildRanking(registeredUsers, predictions, savedPredictions, results),
    [registeredUsers, predictions, savedPredictions, results],
  );

  const me = ranking.find((entry) => entry.username === user?.username);
  const isInTop = me ? me.rank <= TOP_LIMIT : false;

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

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-6 lg:px-8 lg:py-12">
      <section className="mb-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-emerald-200">
          Ranking general
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
          Top {TOP_LIMIT} participantes
        </h1>
        <p className="mt-4 max-w-2xl text-slate-400">
          La tabla se recalcula con resultados reales de grupos y eliminación directa. Solo
          se muestran los primeros {TOP_LIMIT} ordenados por puntos totales.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link
            href="/perfil"
            className="rounded-full bg-emerald-300 px-5 py-2 font-black text-slate-950 transition hover:-translate-y-0.5"
          >
            Ver mi perfil
          </Link>
          {me && !isInTop ? (
            <span className="rounded-full border border-white/15 bg-white/[0.06] px-5 py-2 font-bold text-slate-200">
              Tu posición: {me.rank}° · {me.points} pts
            </span>
          ) : null}
        </div>
      </section>

      <RankingTable
        entries={ranking}
        limit={TOP_LIMIT}
        highlightUsername={user?.username}
      />
    </main>
  );
}
