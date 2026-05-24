import Link from "next/link";
import type { Match } from "@/data/matches";
import { CountryWithFlag } from "@/components/CountryWithFlag";

type AdminOverdueAlertProps = {
  overdueMatches: Match[];
  resultsHref?: string;
};

/**
 * Alerta para el admin cuando hay partidos cuyo kickoff ya pasó y todavía
 * no tienen resultado cargado. Estética roja-LED tipo alerta de transmisión.
 */
export function AdminOverdueAlert({
  overdueMatches,
  resultsHref = "/admin",
}: AdminOverdueAlertProps) {
  if (overdueMatches.length === 0) {
    return null;
  }

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-red-300/40 bg-gradient-to-br from-red-300/15 via-red-300/5 to-red-300/10 p-5 shadow-[inset_0_0_0_1px_rgba(248,113,113,0.15),0_24px_60px_-30px_rgba(239,68,68,0.55)] sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span aria-hidden className="mt-1.5 h-3 w-3 rounded-full bg-red-300 fc-pulse-dot" />
          <div>
            <p className="fc-overline text-[0.7rem] text-red-200">Atención admin</p>
            <h3 className="mt-1 fc-display text-xl uppercase tracking-[0.04em] text-white sm:text-2xl">
              Partidos jugados sin resultado cargado
            </h3>
            <p className="mt-1 text-sm text-red-100/80 tabular-nums">
              {overdueMatches.length === 1
                ? "1 partido espera carga de resultado."
                : `${overdueMatches.length} partidos esperan carga de resultado.`}
            </p>
          </div>
        </div>
        <Link
          href={resultsHref}
          className="fc-display rounded-lg bg-red-300 px-4 py-2 text-[0.7rem] uppercase tracking-[0.16em] text-slate-950 shadow-[0_12px_28px_-12px_rgba(239,68,68,0.55)] transition hover:-translate-y-0.5"
        >
          Cargar ahora
        </Link>
      </header>

      <ul className="mt-5 space-y-2">
        {overdueMatches.map((match) => (
          <li
            key={match.id}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-white/[0.07] bg-slate-950/60 px-4 py-3 text-sm"
          >
            <span className="fc-display text-[0.7rem] uppercase tracking-[0.16em] text-red-100/90 tabular-nums">
              {match.date} · {match.time}
            </span>
            <span className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-white">
              <CountryWithFlag name={match.homeTeam} size={20} truncate />
              <span className="fc-display text-[0.6rem] uppercase tracking-[0.22em] text-slate-400">
                vs
              </span>
              <CountryWithFlag name={match.awayTeam} size={20} alignRight truncate />
            </span>
            <Link
              href={`${resultsHref}#${match.id}`}
              className="fc-display rounded-lg border border-red-300/40 bg-red-300/10 px-3 py-1 text-[0.65rem] uppercase tracking-[0.16em] text-red-100 transition hover:bg-red-300/20"
            >
              Cargar
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
