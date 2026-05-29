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
 * Estética "broadcast" alineada con el resto: scoreboard central + pills.
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

  const pointsTone =
    points === 3
      ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
      : points === 1
        ? "border-amber-300/40 bg-amber-300/10 text-amber-100"
        : points === 0
          ? "border-red-300/30 bg-red-300/10 text-red-100"
          : "border-white/10 bg-white/[0.05] text-slate-200";

  return (
    <article className="fc-card fc-card-accent flex h-full flex-col p-5 transition-colors hover:border-emerald-300/25">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <span className="fc-display rounded-md bg-white/[0.08] px-2.5 py-1 text-[0.7rem] uppercase tracking-[0.16em] text-slate-100">
            {match.group}
          </span>
          <span className="fc-display rounded-md border border-emerald-300/30 bg-emerald-300/10 px-2.5 py-1 text-[0.7rem] uppercase tracking-[0.16em] text-emerald-100">
            {match.matchday ? `Fecha ${match.matchday}` : stageLabel(match.stage)}
          </span>
        </div>
        <span
          className={`fc-display inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.16em] tabular-nums ${pointsTone}`}
        >
          {points === null ? status : `${points} pts`}
        </span>
      </header>

      <div className="mt-3 flex items-center gap-2 text-[0.7rem] text-slate-400">
        <span aria-hidden className="h-1 w-1 rounded-full bg-emerald-300/60" />
        <span className="fc-display tracking-[0.1em]">
          {match.date.toUpperCase()} · {match.time}
        </span>
        <span className="text-slate-500">·</span>
        <span className="truncate">{match.city}</span>
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-white/[0.06] bg-slate-950/55 px-4 py-4">
        <CountryWithFlag
          name={match.homeTeam}
          size={48}
          variant="stack"
          nameClassName="text-[0.68rem]"
        />
        <span className="fc-display-italic text-[0.7rem] uppercase tracking-[0.22em] text-slate-500">
          vs
        </span>
        <CountryWithFlag
          name={match.awayTeam}
          size={48}
          variant="stack"
          nameClassName="text-[0.68rem]"
        />
      </div>

      <div className="mt-5 grid gap-2.5 text-sm">
        <Row
          label="Tu predicción"
          tone="cyan"
          value={
            parsedPrediction
              ? `${parsedPrediction.home}–${parsedPrediction.away}`
              : "Sin cargar"
          }
          muted={!parsedPrediction}
        />
        <Row
          label="Resultado oficial"
          tone="emerald"
          value={
            parsedResult ? `${parsedResult.home}–${parsedResult.away}` : "Aún no disponible"
          }
          muted={!parsedResult}
        />
      </div>
    </article>
  );
}

function Row({
  label,
  value,
  tone,
  muted = false,
}: {
  label: string;
  value: string;
  tone: "cyan" | "emerald";
  muted?: boolean;
}) {
  const toneCls =
    tone === "cyan"
      ? "border-cyan-300/20 bg-cyan-300/[0.04]"
      : "border-emerald-300/20 bg-emerald-300/[0.04]";
  const labelCls =
    tone === "cyan" ? "text-cyan-100" : "text-emerald-100";
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 ${toneCls}`}
    >
      <span
        className={`fc-overline text-[0.65rem] ${muted ? "opacity-60" : ""} ${labelCls}`}
      >
        {label}
      </span>
      <span
        className={`fc-display text-base tabular-nums ${
          muted ? "text-slate-400" : "text-white"
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
