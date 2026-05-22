import type { Match } from "@/data/matches";
import { CountryWithFlag } from "@/components/CountryWithFlag";
import { parseScore, type ScoreInput } from "@/lib/prode";
import {
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
 * Muestra fecha, equipos con banderas, marcador final y estado del partido.
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
    <article className="flex h-full flex-col rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.03] p-5 shadow-lg shadow-black/10">
      <header className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-slate-200">
            {match.group}
          </span>
          <span className="rounded-full bg-emerald-300/10 px-3 py-1 font-semibold text-emerald-100">
            {match.matchday ? `Fecha ${match.matchday}` : stageLabel(match.stage)}
          </span>
        </div>
        <StatusBadge status={status} />
      </header>

      <div className="mt-4 text-xs text-slate-400">
        {match.date} · {match.time} · {match.city}
        {kickoff ? (
          <span className="ml-1 text-slate-500">
            ({kickoff.toLocaleString("es-AR", {
              dateStyle: "short",
              timeStyle: "short",
            })} hora local)
          </span>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-white">
        <CountryWithFlag name={match.homeTeam} size={22} truncate />
        <span className="text-xs font-black text-slate-400">VS</span>
        <CountryWithFlag name={match.awayTeam} size={22} alignRight truncate />
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-200/80">
          Marcador final
        </p>
        <p className="mt-1 font-mono text-3xl font-black text-white">
          {parsed ? `${parsed.home} – ${parsed.away}` : "—"}
        </p>
      </div>
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

  return (
    <span
      className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${tone}`}
    >
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
