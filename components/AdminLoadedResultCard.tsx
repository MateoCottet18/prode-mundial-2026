import type { Match } from "@/data/matches";
import { CountryWithFlag } from "@/components/CountryWithFlag";
import { parseScore, type ScoreInput } from "@/lib/prode";
import {
  formatDateTimeArgentina,
  getMatchStatus,
  matchStatusLabel,
  parseMatchKickoff,
} from "@/lib/matchTime";
import type { ResultsByMatch } from "@/lib/prode";

type AdminLoadedResultCardProps = {
  match: Match;
  result?: ScoreInput;
  results: ResultsByMatch;
};

/**
 * Card de solo lectura para el perfil del admin: partido con resultado cargado.
 * Estética "broadcast" alineada con MatchCard / AdminResultCard.
 */
export function AdminLoadedResultCard({
  match,
  result,
  results,
}: AdminLoadedResultCardProps) {
  const parsed = parseScore(result);
  const status = getMatchStatus(match, results);
  const kickoff = parseMatchKickoff(match);

  return (
    <article className="fc-card fc-card-accent flex h-full flex-col p-5 transition-colors hover:border-[var(--fc-lime)]/20">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <span className="fc-display rounded-md bg-white/[0.08] px-2.5 py-1 text-[0.7rem] uppercase tracking-[0.16em] text-slate-100">
            {match.group}
          </span>
          <span className="fc-display rounded-md border border-emerald-300/30 bg-emerald-300/10 px-2.5 py-1 text-[0.7rem] uppercase tracking-[0.16em] text-emerald-100">
            {match.matchday ? `Fecha ${match.matchday}` : stageLabel(match.stage)}
          </span>
        </div>
        <StatusBadge status={status} />
      </header>

      <div className="mt-3 flex items-center gap-2 text-[0.7rem] text-slate-400">
        <span aria-hidden className="h-1 w-1 rounded-full bg-emerald-300/60" />
        <span className="fc-display tracking-[0.1em]">
          {match.date.toUpperCase()} · {match.time}
        </span>
        <span className="text-slate-500">·</span>
        <span className="truncate">{match.city}</span>
      </div>
      {kickoff ? (
        <p className="mt-1 text-[0.65rem] uppercase tracking-[0.16em] text-slate-500">
          {formatDateTimeArgentina(kickoff)} (hora Argentina)
        </p>
      ) : null}

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-white/[0.06] bg-slate-950/55 px-4 py-4">
        <CountryWithFlag
          name={match.homeTeam}
          size={48}
          variant="stack"
          nameClassName="text-[0.68rem]"
        />
        <div className="flex flex-col items-center">
          <p className="fc-display text-[2.4rem] leading-none text-white tabular-nums">
            {parsed ? (
              <>
                {parsed.home}
                <span className="px-1 text-slate-500">:</span>
                {parsed.away}
              </>
            ) : (
              <span className="text-slate-600">–</span>
            )}
          </p>
          <span className="fc-display mt-1 text-[0.6rem] uppercase tracking-[0.22em] text-emerald-200">
            {parsed ? "Final" : "vs"}
          </span>
        </div>
        <CountryWithFlag
          name={match.awayTeam}
          size={48}
          variant="stack"
          nameClassName="text-[0.68rem]"
        />
      </div>

      <p className="mt-auto pt-4 text-[0.7rem] uppercase tracking-[0.16em] text-slate-500">
        {match.venue}
      </p>
    </article>
  );
}

function StatusBadge({
  status,
}: {
  status: ReturnType<typeof getMatchStatus>;
}) {
  const tone =
    status === "finalizado"
      ? "border-emerald-300/40 bg-emerald-300/15 text-emerald-100"
      : status === "en_curso"
        ? "border-yellow-300/40 bg-yellow-300/15 text-yellow-100"
        : status === "vencido_sin_resultado"
          ? "border-red-300/40 bg-red-300/15 text-red-100"
          : "border-white/15 bg-white/[0.06] text-slate-200";

  const dot =
    status === "finalizado"
      ? "bg-emerald-300"
      : status === "en_curso"
        ? "bg-yellow-300 fc-pulse-dot"
        : status === "vencido_sin_resultado"
          ? "bg-red-300 fc-pulse-dot"
          : "bg-slate-500";

  return (
    <span
      className={`fc-display inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.16em] ${tone}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {matchStatusLabel(status)}
    </span>
  );
}

function stageLabel(stage: Match["stage"]) {
  const labels = {
    grupos: "Fase de grupos",
    "16avos": "16avos",
    octavos: "Octavos",
    cuartos: "Cuartos",
    semifinal: "Semifinal",
    final: "Final",
  } satisfies Record<Match["stage"], string>;
  return labels[stage];
}
