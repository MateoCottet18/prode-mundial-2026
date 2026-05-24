import type { RankingEntry } from "@/lib/ranking";

type RankingTableProps = {
  entries: RankingEntry[];
  /** Cantidad máxima de filas a mostrar. */
  limit?: number;
  /** username del usuario activo, para resaltar su fila. */
  highlightUsername?: string;
};

/**
 * Ranking deportivo FIFA Broadcast.
 *
 * Estructura:
 *   - Top 3 con podio dramático (oro/plata/bronce, scores stencil mega).
 *   - Resto del ranking en tabla compacta con columnas oficiales:
 *       Pos · Participante · Pts · Exactos · Aciertos
 *
 * El orden ya viene resuelto por `buildRanking` aplicando el criterio de
 * desempate oficial (points → exactCount → correctOutcomesCount → username).
 *
 * Responsive: en mobile colapsamos a una "row card" — header con dorsal,
 * nombre y puntos grandes, y debajo dos micro-stats con chips lima/cyan.
 * Desde sm en adelante se muestra la tabla horizontal.
 */
export function RankingTable({ entries, limit = 20, highlightUsername }: RankingTableProps) {
  const visible = entries.slice(0, limit);

  if (visible.length === 0) {
    return (
      <p className="fc-card flex items-center justify-center p-6 text-center text-sm text-slate-300">
        Todavía no hay participantes con puntos para mostrar.
      </p>
    );
  }

  const podium = visible.slice(0, 3);
  const rest = visible.slice(3);

  return (
    <div className="space-y-10">
      {podium.length > 0 ? (
        <Podium podium={podium} highlightUsername={highlightUsername} />
      ) : null}

      {rest.length > 0 ? (
        <RankingList entries={rest} highlightUsername={highlightUsername} />
      ) : null}

      <TiebreakLegend />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Podio (Top 3) — diseño más dramático con stats integradas
// -----------------------------------------------------------------------------

function Podium({
  podium,
  highlightUsername,
}: {
  podium: RankingEntry[];
  highlightUsername?: string;
}) {
  const first = podium[0];
  const second = podium[1];
  const third = podium[2];

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <span aria-hidden className="h-3 w-3 rotate-45 bg-[var(--fc-yellow)] shadow-[0_0_18px_rgba(255,216,77,0.6)]" />
        <p className="fc-display-italic text-[0.7rem] uppercase tracking-[0.32em] text-[var(--fc-yellow)]">
          Podio del torneo
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3 md:items-end">
        <div className="md:order-1">
          {second ? (
            <PodiumCard entry={second} place="2" highlightUsername={highlightUsername} />
          ) : null}
        </div>
        <div className="md:order-2">
          {first ? (
            <PodiumCard entry={first} place="1" highlightUsername={highlightUsername} />
          ) : null}
        </div>
        <div className="md:order-3">
          {third ? (
            <PodiumCard entry={third} place="3" highlightUsername={highlightUsername} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PodiumCard({
  entry,
  place,
  highlightUsername,
}: {
  entry: RankingEntry;
  place: "1" | "2" | "3";
  highlightUsername?: string;
}) {
  const isMe = entry.username === highlightUsername;
  const tone = TONE_BY_PLACE[place];
  const heightClass =
    place === "1" ? "md:min-h-[320px]" : place === "2" ? "md:min-h-[270px]" : "md:min-h-[240px]";

  return (
    <article
      className={`fc-broadcast-cut relative flex flex-col items-center justify-end gap-3 overflow-hidden border bg-[#03060d]/90 p-6 text-center transition hover:-translate-y-1 ${heightClass}`}
      style={{ borderColor: tone.borderRgba, boxShadow: tone.boxShadow }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[60%] opacity-70"
        style={{ background: tone.haloGradient }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 fc-halftone opacity-30" />
      <div aria-hidden className="absolute inset-x-4 top-0 h-[2px] fc-flag-stripe opacity-70" />
      {/* Diagonales decorativas de podio para los puestos 1 y 2 */}
      {place !== "3" ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 fc-diagonal-bold opacity-30" />
      ) : null}

      {/* Dorsal mega con corte */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <span
          className={`fc-stencil grid h-20 w-20 place-items-center text-5xl ${tone.numberCls}`}
          style={{ clipPath: "polygon(20% 0, 100% 0, 80% 100%, 0 100%)" }}
        >
          {place}
        </span>
        <span className={`fc-display-italic text-[0.7rem] uppercase tracking-[0.28em] ${tone.labelCls}`}>
          {tone.label}
        </span>
      </div>

      <div className="relative z-10 mt-1 flex flex-col items-center gap-1 text-center">
        <p className="fc-display-italic text-xl uppercase tracking-[0.04em] text-white sm:text-2xl">
          {entry.displayName}
          {isMe ? (
            <span className="fc-chip fc-chip-lime ml-2 align-middle">Vos</span>
          ) : null}
        </p>
        <p className="text-xs text-slate-400">
          {entry.savedCount} predicciones guardadas
        </p>
      </div>

      <div className="relative z-10 mt-2 flex items-baseline gap-2">
        <span className={`fc-stencil text-6xl leading-none ${tone.scoreCls}`}>
          {entry.points}
        </span>
        <span className={`fc-display-italic text-[0.7rem] uppercase tracking-[0.22em] ${tone.labelCls}`}>
          pts
        </span>
      </div>

      {/* Mini-stats: exactos + aciertos */}
      <div className="relative z-10 mt-2 flex flex-wrap items-center justify-center gap-2">
        <span className="fc-chip fc-chip-lime">
          <span aria-hidden>★</span>
          {entry.exactCount} exactos
        </span>
        <span className="fc-chip fc-chip-cyan">
          <span aria-hidden>✓</span>
          {entry.correctOutcomesCount} aciertos
        </span>
      </div>
    </article>
  );
}

const TONE_BY_PLACE: Record<
  "1" | "2" | "3",
  {
    label: string;
    borderRgba: string;
    boxShadow: string;
    haloGradient: string;
    numberCls: string;
    labelCls: string;
    scoreCls: string;
  }
> = {
  "1": {
    label: "Oro · Campeón",
    borderRgba: "rgba(255,216,77,0.55)",
    boxShadow:
      "inset 0 0 0 1px rgba(255,216,77,0.55), 0 32px 90px -22px rgba(255,216,77,0.6)",
    haloGradient:
      "radial-gradient(70% 80% at 50% 0%, rgba(255,216,77,0.4) 0%, transparent 70%)",
    numberCls:
      "bg-gradient-to-br from-yellow-200 via-amber-300 to-orange-400 text-slate-950 shadow-[0_0_36px_rgba(255,216,77,0.65)]",
    labelCls: "text-[var(--fc-yellow)]",
    scoreCls: "text-[var(--fc-yellow)] drop-shadow-[0_0_18px_rgba(255,216,77,0.45)]",
  },
  "2": {
    label: "Plata",
    borderRgba: "rgba(203,213,225,0.45)",
    boxShadow:
      "inset 0 0 0 1px rgba(203,213,225,0.4), 0 26px 70px -22px rgba(148,163,184,0.5)",
    haloGradient:
      "radial-gradient(70% 80% at 50% 0%, rgba(203,213,225,0.22) 0%, transparent 70%)",
    numberCls:
      "bg-gradient-to-br from-slate-100 via-slate-300 to-slate-400 text-slate-950 shadow-[0_0_24px_rgba(203,213,225,0.35)]",
    labelCls: "text-slate-200",
    scoreCls: "text-slate-100",
  },
  "3": {
    label: "Bronce",
    borderRgba: "rgba(255,138,61,0.5)",
    boxShadow:
      "inset 0 0 0 1px rgba(255,138,61,0.45), 0 24px 65px -22px rgba(255,138,61,0.5)",
    haloGradient:
      "radial-gradient(70% 80% at 50% 0%, rgba(255,138,61,0.25) 0%, transparent 70%)",
    numberCls:
      "bg-gradient-to-br from-orange-300 via-amber-500 to-orange-700 text-slate-950 shadow-[0_0_24px_rgba(255,138,61,0.5)]",
    labelCls: "text-[var(--fc-orange)]",
    scoreCls: "text-[var(--fc-orange)]",
  },
};

// -----------------------------------------------------------------------------
// Lista 4° en adelante — tabla en desktop, row-cards en mobile
// -----------------------------------------------------------------------------

function RankingList({
  entries,
  highlightUsername,
}: {
  entries: RankingEntry[];
  highlightUsername?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span aria-hidden className="h-3 w-3 rotate-45 bg-[var(--fc-cyan)] shadow-[0_0_18px_rgba(56,212,255,0.55)]" />
          <p className="fc-display-italic text-[0.7rem] uppercase tracking-[0.32em] text-[var(--fc-cyan)]">
            Resto del ranking
          </p>
        </div>
        <span className="fc-display-italic text-[0.66rem] uppercase tracking-[0.18em] text-slate-500">
          Orden: pts · exactos · aciertos
        </span>
      </div>

      {/* Vista desktop: tabla */}
      <div className="hidden overflow-hidden rounded-[1rem] border border-white/[0.07] bg-[#02050b]/65 sm:block">
        <table className="w-full text-left text-sm tabular-nums">
          <thead>
            <tr className="border-b border-white/[0.07]">
              {[
                ["Pos", "w-16"],
                ["Participante", ""],
                ["Pts", "w-20 text-right"],
                ["Exactos", "w-24 text-right"],
                ["Aciertos", "w-24 text-right"],
              ].map(([label, cls]) => (
                <th
                  key={label}
                  scope="col"
                  className={`fc-display-italic px-4 py-3 text-[0.66rem] uppercase tracking-[0.22em] text-slate-400 ${cls}`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <RankingDesktopRow
                key={entry.userKey}
                entry={entry}
                isMe={entry.username === highlightUsername}
                animationDelay={idx * 25}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Vista mobile: row-cards */}
      <div className="space-y-2.5 sm:hidden">
        {entries.map((entry, idx) => (
          <RankingMobileRow
            key={entry.userKey}
            entry={entry}
            isMe={entry.username === highlightUsername}
            animationDelay={idx * 25}
          />
        ))}
      </div>
    </div>
  );
}

function RankingDesktopRow({
  entry,
  isMe,
  animationDelay,
}: {
  entry: RankingEntry;
  isMe: boolean;
  animationDelay: number;
}) {
  return (
    <tr
      className={`animate-fc-rise border-b border-white/5 last:border-0 transition hover:bg-white/[0.03] ${
        isMe ? "bg-[var(--fc-lime)]/[0.08]" : ""
      }`}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <td className="px-4 py-3">
        <span
          className={`fc-stencil grid h-10 w-12 place-items-center border bg-[#02050b]/85 text-xl fc-broadcast-cut-sm ${
            isMe ? "border-[var(--fc-lime)]/50 text-[var(--fc-lime)]" : "border-white/10 text-slate-100"
          }`}
          aria-label={`Posición ${entry.rank}`}
        >
          {entry.rank}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col">
          <span className="fc-display-italic uppercase tracking-[0.04em] text-white">
            {entry.displayName}
            {isMe ? (
              <span className="fc-chip fc-chip-lime ml-2 align-middle">Vos</span>
            ) : null}
          </span>
          <span className="text-xs text-slate-500">
            {entry.savedCount} predicciones guardadas
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <span className={`fc-stencil text-2xl ${isMe ? "text-[var(--fc-lime)]" : "text-[var(--fc-cyan)]"}`}>
          {entry.points}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span
          className={`fc-chip ${entry.exactCount > 0 ? "fc-chip-lime" : "fc-chip-neutral"} inline-flex justify-end`}
        >
          <span aria-hidden>★</span>
          {entry.exactCount}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span
          className={`fc-chip ${entry.correctOutcomesCount > 0 ? "fc-chip-cyan" : "fc-chip-neutral"} inline-flex justify-end`}
        >
          <span aria-hidden>✓</span>
          {entry.correctOutcomesCount}
        </span>
      </td>
    </tr>
  );
}

function RankingMobileRow({
  entry,
  isMe,
  animationDelay,
}: {
  entry: RankingEntry;
  isMe: boolean;
  animationDelay: number;
}) {
  return (
    <article
      className={`animate-fc-rise relative overflow-hidden border bg-gradient-to-r p-4 fc-broadcast-cut-sm ${
        isMe
          ? "border-[var(--fc-lime)]/50 from-[var(--fc-lime)]/10 via-[var(--fc-lime)]/[0.04] to-[var(--fc-lime)]/10 fc-glow-lime"
          : "border-white/[0.07] from-white/[0.05] via-white/[0.02] to-white/[0.04]"
      }`}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`fc-stencil grid h-12 w-14 flex-none place-items-center border bg-[#02050b]/85 text-2xl fc-broadcast-cut-sm ${
              isMe ? "border-[var(--fc-lime)]/50 text-[var(--fc-lime)]" : "border-white/10 text-slate-100"
            }`}
            aria-label={`Posición ${entry.rank}`}
          >
            {entry.rank}
          </span>
          <div className="min-w-0">
            <p className="fc-display-italic truncate text-base uppercase tracking-[0.04em] text-white">
              {entry.displayName}
              {isMe ? (
                <span className="fc-chip fc-chip-lime ml-2 align-middle">Vos</span>
              ) : null}
            </p>
            <p className="truncate text-xs text-slate-400">
              {entry.savedCount} guardadas
            </p>
          </div>
        </div>
        <p className="flex flex-none items-baseline gap-1">
          <span className={`fc-stencil text-3xl ${isMe ? "text-[var(--fc-lime)]" : "text-[var(--fc-cyan)]"}`}>
            {entry.points}
          </span>
          <span className="fc-display-italic text-[0.65rem] uppercase tracking-[0.22em] text-slate-400">
            pts
          </span>
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className={`fc-chip ${entry.exactCount > 0 ? "fc-chip-lime" : "fc-chip-neutral"}`}>
          <span aria-hidden>★</span>
          {entry.exactCount} exactos
        </span>
        <span className={`fc-chip ${entry.correctOutcomesCount > 0 ? "fc-chip-cyan" : "fc-chip-neutral"}`}>
          <span aria-hidden>✓</span>
          {entry.correctOutcomesCount} aciertos
        </span>
      </div>
    </article>
  );
}

// -----------------------------------------------------------------------------
// Leyenda de criterio de desempate — pie informativo
// -----------------------------------------------------------------------------

function TiebreakLegend() {
  return (
    <aside className="fc-broadcast-cut-sm relative overflow-hidden border border-white/[0.07] bg-[#02050b]/65 p-4 text-xs leading-6 text-slate-300">
      <div aria-hidden className="pointer-events-none absolute inset-0 fc-halftone opacity-25" />
      <p className="fc-display-italic relative text-[0.66rem] uppercase tracking-[0.22em] text-[var(--fc-lime)]">
        Criterio de desempate
      </p>
      <p className="relative mt-1">
        En empate de puntos: <span className="font-bold text-white">1)</span> más{" "}
        <span className="font-bold text-[var(--fc-lime)]">exactos</span> · {" "}
        <span className="font-bold text-white">2)</span> más{" "}
        <span className="font-bold text-[var(--fc-cyan)]">aciertos totales</span> · {" "}
        <span className="font-bold text-white">3)</span> se comparte la posición.
      </p>
    </aside>
  );
}
