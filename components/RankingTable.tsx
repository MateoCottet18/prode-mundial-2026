import type { RankingEntry } from "@/lib/ranking";

type RankingTableProps = {
  entries: RankingEntry[];
  /** Cantidad máxima de filas a mostrar. */
  limit?: number;
  /** username del usuario activo, para resaltar su fila. */
  highlightUsername?: string;
};

/**
 * Tabla de ranking responsive. Diseño dark/neon coherente con el resto.
 * Por defecto muestra el Top 20.
 */
export function RankingTable({ entries, limit = 20, highlightUsername }: RankingTableProps) {
  const visible = entries.slice(0, limit);

  if (visible.length === 0) {
    return (
      <p className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center text-sm text-slate-300">
        Todavía no hay participantes con puntos para mostrar.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {visible.map((entry) => {
        const isMe = entry.username === highlightUsername;
        const isPodium = entry.rank <= 3;

        return (
          <div
            key={entry.userKey}
            className={`flex items-center justify-between gap-4 rounded-3xl border p-4 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 sm:p-5 ${
              isMe
                ? "border-emerald-300/60 bg-emerald-300/10"
                : "border-white/10 bg-white/[0.06]"
            }`}
          >
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <span
                className={`grid h-10 w-10 flex-none place-items-center rounded-2xl text-base font-black sm:h-12 sm:w-12 sm:text-lg ${
                  isPodium
                    ? "bg-gradient-to-br from-yellow-200 to-lime-300 text-slate-950"
                    : "bg-white/10 text-white"
                }`}
                aria-label={`Posición ${entry.rank}`}
              >
                {entry.rank}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-black text-white sm:text-lg">
                  {entry.displayName}
                  {isMe ? (
                    <span className="ml-2 rounded-full bg-emerald-300/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-100">
                      Vos
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-slate-400 sm:text-sm">
                  {entry.savedCount} predicciones guardadas
                </p>
              </div>
            </div>
            <p className="flex-none whitespace-nowrap text-xl font-black text-lime-200 sm:text-3xl">
              {entry.points}
              <span className="ml-1 text-xs font-bold text-lime-200/70 sm:text-sm">pts</span>
            </p>
          </div>
        );
      })}
    </div>
  );
}
