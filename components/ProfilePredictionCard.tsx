import type { Match } from "@/data/matches";
import { CountryWithFlag } from "@/components/CountryWithFlag";
import {
  calculatePoints,
  getPredictionStatus,
  parseScore,
  type ScoreInput,
} from "@/lib/prode";

type ProfilePredictionCardProps = {
  match: Match;
  prediction?: ScoreInput;
  result?: ScoreInput;
  isSaved: boolean;
};

/**
 * Card de solo lectura para "Mi perfil": predicción + resultado real + puntos.
 * No tiene inputs ni botones — el usuario ya editó en /partidos.
 */
export function ProfilePredictionCard({
  match,
  prediction,
  result,
  isSaved,
}: ProfilePredictionCardProps) {
  const parsedPrediction = parseScore(prediction);
  const parsedResult = parseScore(result);
  const points = calculatePoints(prediction, result, isSaved);
  const status = getPredictionStatus(prediction, result, isSaved);

  const pointsBadge =
    points === 3
      ? "bg-emerald-300/20 text-emerald-100 border-emerald-300/40"
      : points === 1
        ? "bg-yellow-300/20 text-yellow-100 border-yellow-300/40"
        : points === 0
          ? "bg-red-300/15 text-red-100 border-red-300/30"
          : "bg-white/[0.06] text-slate-200 border-white/10";

  return (
    <article className="flex h-full flex-col rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.07] to-white/[0.03] p-5 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:border-emerald-300/30">
      <header className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-slate-200">
            {match.group}
          </span>
          <span className="rounded-full bg-emerald-300/10 px-3 py-1 font-semibold text-emerald-100">
            {match.matchday ? `Fecha ${match.matchday}` : stageLabel(match.stage)}
          </span>
        </div>
        <span
          className={`rounded-full border px-3 py-1 font-bold ${pointsBadge}`}
          aria-label={
            points === null ? "Puntos pendientes" : `${points} puntos ganados`
          }
        >
          {points === null ? status : `${points} pts`}
        </span>
      </header>

      <div className="mt-4 text-xs text-slate-400">
        {match.date} · {match.time} · {match.city}
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-white">
        <CountryWithFlag name={match.homeTeam} size={22} truncate />
        <span className="text-xs font-black text-slate-400">VS</span>
        <CountryWithFlag name={match.awayTeam} size={22} alignRight truncate />
      </div>

      <div className="mt-5 space-y-3 text-sm">
        <Row
          label="Tu predicción"
          value={
            parsedPrediction
              ? `${parsedPrediction.home} - ${parsedPrediction.away}`
              : "Sin cargar"
          }
          tone={parsedPrediction ? "primary" : "muted"}
        />
        <Row
          label="Resultado real"
          value={
            parsedResult ? `${parsedResult.home} - ${parsedResult.away}` : "Aún no disponible"
          }
          tone={parsedResult ? "primary" : "muted"}
        />
      </div>
    </article>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "muted";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3">
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200/80">
        {label}
      </span>
      <span
        className={`font-mono text-base font-black ${
          tone === "primary" ? "text-white" : "text-slate-400"
        }`}
      >
        {value}
      </span>
    </div>
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
