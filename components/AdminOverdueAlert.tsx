import Link from "next/link";
import type { Match } from "@/data/matches";
import { CountryWithFlag } from "@/components/CountryWithFlag";

type AdminOverdueAlertProps = {
  overdueMatches: Match[];
  resultsHref?: string;
};

/**
 * Alerta para el admin cuando hay partidos cuyo kickoff ya pasó y todavía
 * no tienen resultado cargado. Si no hay vencidos, no renderiza nada.
 */
export function AdminOverdueAlert({
  overdueMatches,
  resultsHref = "/admin",
}: AdminOverdueAlertProps) {
  if (overdueMatches.length === 0) {
    return null;
  }

  return (
    <section className="mt-8 rounded-3xl border border-red-300/40 bg-gradient-to-br from-red-300/15 via-red-300/5 to-red-300/10 p-5 shadow-lg shadow-black/20 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-red-200">
            Atención admin
          </p>
          <h3 className="mt-2 text-lg font-black text-white sm:text-xl">
            Hay partidos ya jugados sin resultado cargado.
          </h3>
          <p className="mt-1 text-sm text-red-100/80">
            {overdueMatches.length === 1
              ? "1 partido espera carga de resultado."
              : `${overdueMatches.length} partidos esperan carga de resultado.`}
          </p>
        </div>
        <Link
          href={resultsHref}
          className="rounded-full bg-red-300 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-950 transition hover:-translate-y-0.5"
        >
          Cargar ahora
        </Link>
      </header>

      <ul className="mt-5 space-y-2">
        {overdueMatches.map((match) => (
          <li
            key={match.id}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm"
          >
            <span className="text-xs font-mono font-bold text-red-100/90 tabular-nums">
              {match.date} · {match.time}
            </span>
            <span className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-white">
              <CountryWithFlag name={match.homeTeam} size={18} truncate />
              <span className="text-[10px] font-black text-slate-400">VS</span>
              <CountryWithFlag name={match.awayTeam} size={18} alignRight truncate />
            </span>
            <Link
              href={`${resultsHref}#${match.id}`}
              className="rounded-full border border-red-300/40 bg-red-300/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-300/20"
            >
              Cargar
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
