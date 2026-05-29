import type { RankingEntry } from "@/lib/ranking";

type RankingTableProps = {
  entries: RankingEntry[];
  /** Cantidad máxima de filas a mostrar. */
  limit?: number;
  /** username del usuario activo, para resaltar su fila. */
  highlightUsername?: string;
};

/**
 * Tabla clásica de ranking. Sin podio, sin cards gigantes.
 *
 * Columnas: Pos · Participante · Pts · Exactos · (Aciertos en sm+)
 *
 * El orden ya viene resuelto por `buildRanking` (points → exactCount →
 * correctOutcomesCount → createdAt → username), así que acá sólo
 * recorremos la lista tal cual y resaltamos al usuario activo + las
 * primeras 3 posiciones con un acento de medalla discreto.
 */
export function RankingTable({ entries, limit = 20, highlightUsername }: RankingTableProps) {
  const visible = entries.slice(0, limit);

  if (visible.length === 0) {
    return (
      <p className="rounded-lg border border-white/10 bg-[#02050b]/70 p-6 text-center text-sm text-slate-300">
        Todavía no hay participantes con puntos para mostrar.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-white/10 bg-[#02050b]/70">
        <table className="w-full text-left text-sm tabular-nums">
          <thead className="border-b border-white/10 bg-white/[0.02]">
            <tr>
              <th
                scope="col"
                className="w-14 px-3 py-2.5 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400 sm:w-16 sm:px-4"
              >
                #
              </th>
              <th
                scope="col"
                className="px-3 py-2.5 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400 sm:px-4"
              >
                Participante
              </th>
              <th
                scope="col"
                className="w-16 px-3 py-2.5 text-right text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400 sm:w-20 sm:px-4"
              >
                Pts
              </th>
              <th
                scope="col"
                className="w-16 px-3 py-2.5 text-right text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400 sm:w-20 sm:px-4"
              >
                Exactos
              </th>
              <th
                scope="col"
                className="hidden w-20 px-4 py-2.5 text-right text-[0.7rem] font-semibold uppercase tracking-wider text-slate-400 sm:table-cell"
              >
                Aciertos
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((entry) => (
              <RankingRow
                key={entry.userKey}
                entry={entry}
                isMe={entry.username === highlightUsername}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p className="px-1 text-xs text-slate-500">
        Desempate:{" "}
        <span className="text-slate-300">puntos</span> ·{" "}
        <span className="text-[var(--fc-yellow)]">exactos</span> ·{" "}
        <span className="text-[var(--fc-cyan)]">aciertos</span> · alfabético.
      </p>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Fila
// -----------------------------------------------------------------------------

function RankingRow({ entry, isMe }: { entry: RankingEntry; isMe: boolean }) {
  const medal = MEDAL_BY_RANK[entry.rank];

  return (
    <tr
      className={`border-b border-white/[0.04] last:border-0 transition-colors hover:bg-white/[0.025] ${
        isMe ? "bg-[var(--fc-lime)]/[0.07]" : ""
      }`}
    >
      <td className="px-3 py-2.5 sm:px-4">
        <span
          className={`inline-flex h-7 w-9 items-center justify-center rounded text-sm font-bold tabular-nums ${
            medal
              ? medal.badgeCls
              : isMe
                ? "bg-[var(--fc-lime)]/15 text-[var(--fc-lime)]"
                : "bg-white/[0.04] text-slate-300"
          }`}
          aria-label={`Posición ${entry.rank}`}
        >
          {entry.rank}
        </span>
      </td>
      <td className="px-3 py-2.5 sm:px-4">
        <span className="font-medium text-white">
          {entry.displayName}
        </span>
        {isMe ? (
          <span className="ml-2 inline-block rounded bg-[var(--fc-lime)]/20 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--fc-lime)]">
            Vos
          </span>
        ) : null}
      </td>
      <td className="px-3 py-2.5 text-right sm:px-4">
        <span className="text-base font-bold text-white">{entry.points}</span>
      </td>
      <td className="px-3 py-2.5 text-right sm:px-4">
        <span
          className={`text-sm font-semibold ${
            entry.exactCount > 0 ? "text-[var(--fc-yellow)]" : "text-slate-500"
          }`}
        >
          {entry.exactCount}
        </span>
      </td>
      <td className="hidden px-4 py-2.5 text-right sm:table-cell">
        <span
          className={`text-sm ${
            entry.correctOutcomesCount > 0 ? "text-[var(--fc-cyan)]" : "text-slate-500"
          }`}
        >
          {entry.correctOutcomesCount}
        </span>
      </td>
    </tr>
  );
}

// -----------------------------------------------------------------------------
// Medallas (acento sutil en el badge de posición 1, 2 y 3)
// -----------------------------------------------------------------------------

const MEDAL_BY_RANK: Record<number, { badgeCls: string }> = {
  1: {
    badgeCls: "bg-yellow-300 text-slate-900",
  },
  2: {
    badgeCls: "bg-slate-300 text-slate-900",
  },
  3: {
    badgeCls: "bg-orange-300 text-slate-900",
  },
};
