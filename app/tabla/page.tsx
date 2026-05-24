"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMatches } from "@/hooks/useMatches";
import { useProdeStore } from "@/hooks/useProdeStore";
import { useQualificationOverrides } from "@/hooks/useQualificationOverrides";
import { useUsers } from "@/hooks/useUsers";
import { PageHeader } from "@/components/PageHeader";
import { RankingTable } from "@/components/RankingTable";
import { buildRanking } from "@/lib/ranking";

const TOP_LIMIT = 20;

export default function TablaPage() {
  const { user, isReady: isAuthReady } = useAuth();
  const { matches } = useMatches();
  const { predictions, savedPredictions, results } = useProdeStore();
  const { registeredUsers } = useUsers();
  const { overridesMap } = useQualificationOverrides();

  const ranking = useMemo(
    () =>
      buildRanking(
        registeredUsers,
        predictions,
        savedPredictions,
        results,
        matches,
        overridesMap,
      ),
    [registeredUsers, predictions, savedPredictions, results, matches, overridesMap],
  );

  const me = ranking.find((entry) => entry.username === user?.username);
  const isInTop = me ? me.rank <= TOP_LIMIT : false;

  if (isAuthReady && !user) {
    return (
      <main className="mx-auto w-full max-w-4xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="fc-card p-8 text-center">
          <h1 className="fc-display-italic text-3xl uppercase tracking-[0.02em] text-white">
            Iniciá sesión para ver la tabla
          </h1>
          <Link href="/login" className="fc-cta-fifa mt-6">
            <span aria-hidden>▸</span> Ir al login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-6 lg:px-8 lg:py-12">
      <PageHeader
        overline="Ranking general · LIVE"
        title={`Top ${TOP_LIMIT} participantes`}
        description="Tabla en vivo · se recalcula con cada resultado real. El podio premia a los tres primeros con luces de oro, plata y bronce."
        tone="yellow"
        actions={
          <>
            <Link href="/perfil" className="fc-cta-fifa">
              <span aria-hidden>▸</span> Mi perfil
            </Link>
            {me && !isInTop ? (
              <span className="fc-chip fc-chip-cyan">
                Posición: {me.rank}° · {me.points} pts
              </span>
            ) : null}
          </>
        }
      />

      <RankingTable
        entries={ranking}
        limit={TOP_LIMIT}
        highlightUsername={user?.username}
      />
    </main>
  );
}
