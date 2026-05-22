import type { Match } from "@/data/matches";
import { CountryWithFlag } from "@/components/CountryWithFlag";
import { ScoreField } from "@/components/ScoreField";
import {
  calculatePoints,
  emptyScore,
  getPredictionStatus,
  parseScore,
  type ScoreInput,
} from "@/lib/prode";

type MatchCardProps = {
  match: Match;
  prediction?: ScoreInput;
  result?: ScoreInput;
  isSaved?: boolean;
  canPredict?: boolean;
  canEditResult?: boolean;
  canManageResult?: boolean;
  hasSavedResult?: boolean;
  onPredictionChange?: (side: keyof ScoreInput, value: string) => void;
  onSavePrediction?: () => void;
  onResultChange?: (side: keyof ScoreInput, value: string) => void;
  onSaveResult?: () => void;
  onEditResult?: () => void;
  onDeleteResult?: () => void;
};

export function MatchCard({
  match,
  prediction = emptyScore,
  result = emptyScore,
  isSaved = false,
  canPredict = false,
  canEditResult = false,
  canManageResult = false,
  hasSavedResult = false,
  onPredictionChange,
  onSavePrediction,
  onResultChange,
  onSaveResult,
  onEditResult,
  onDeleteResult,
}: MatchCardProps) {
  const status = getPredictionStatus(prediction, result, isSaved);
  const points = calculatePoints(prediction, result, isSaved);
  const hasValidPrediction = Boolean(parseScore(prediction));
  const hasResult = Boolean(parseScore(result));

  return (
    <article className="flex h-full flex-col rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.075] to-white/[0.035] p-5 shadow-xl shadow-black/10 backdrop-blur transition duration-200 hover:-translate-y-1 hover:border-emerald-300/35 hover:shadow-emerald-950/20">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-slate-200">
            {match.group}
          </span>
          <span className="rounded-full bg-emerald-300/10 px-3 py-1 font-semibold text-emerald-100">
            {match.matchday ? `Fecha ${match.matchday}` : stageLabel(match.stage)}
          </span>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 font-bold text-lime-200">
          {status}
        </span>
      </div>

      <div className="mt-4 text-sm text-slate-300">
        {match.date} · {match.time} · {match.city}
      </div>

      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamName name={match.homeTeam} />
        <span className="text-sm font-black text-slate-300">vs</span>
        <TeamName name={match.awayTeam} alignRight />
      </div>

      <div className="mt-6">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-emerald-200">
          Predicción
        </p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <ScoreField
            label={`Predicción de ${match.homeTeam}`}
            value={prediction.home}
            disabled={!canPredict}
            onChange={(value) => onPredictionChange?.("home", value)}
          />
          <span className="text-2xl font-black text-slate-300">-</span>
          <ScoreField
            label={`Predicción de ${match.awayTeam}`}
            value={prediction.away}
            disabled={!canPredict}
            onChange={(value) => onPredictionChange?.("away", value)}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onSavePrediction}
          disabled={!canPredict || !hasValidPrediction}
          className="rounded-full bg-gradient-to-r from-emerald-300 to-lime-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-emerald-950/20 transition hover:-translate-y-0.5 hover:shadow-emerald-900/30 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none"
        >
          Guardar predicción
        </button>
        <p className="text-sm text-slate-300">
          {isSaved
            ? `${match.homeTeam} ${prediction.home} - ${prediction.away} ${match.awayTeam}`
            : "Pendiente de guardar"}
        </p>
      </div>

      {canEditResult || canManageResult || hasResult ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/65 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-200">
              Resultado real
            </p>
            <span className="text-sm font-bold text-lime-200">
              {points === null ? "Sin puntos calculados" : `${points} puntos`}
            </span>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <ScoreField
              label={`Resultado real de ${match.homeTeam}`}
              value={result.home}
              disabled={!canEditResult}
              onChange={(value) => onResultChange?.("home", value)}
            />
            <span className="text-2xl font-black text-slate-300">-</span>
            <ScoreField
              label={`Resultado real de ${match.awayTeam}`}
              value={result.away}
              disabled={!canEditResult}
              onChange={(value) => onResultChange?.("away", value)}
            />
          </div>
          {canManageResult ? (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onSaveResult}
                disabled={!canEditResult || !hasResult}
                className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-5 py-2 text-sm font-black text-emerald-100 transition hover:-translate-y-0.5 hover:bg-emerald-300/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
              >
                Guardar resultado
              </button>
              <button
                type="button"
                onClick={onEditResult}
                disabled={canEditResult}
                className="rounded-full border border-white/15 bg-white/[0.08] px-5 py-2 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
              >
                Editar resultado
              </button>
              <button
                type="button"
                onClick={onDeleteResult}
                disabled={!hasResult && !hasSavedResult}
                className="rounded-full border border-red-300/30 bg-red-300/10 px-5 py-2 text-sm font-bold text-red-100 transition hover:-translate-y-0.5 hover:bg-red-300/15 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
              >
                Borrar resultado
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="mt-auto pt-4 text-xs text-slate-400">{match.venue}</p>
    </article>
  );
}

function TeamName({ name, alignRight = false }: { name: string; alignRight?: boolean }) {
  return (
    <div className={alignRight ? "text-right" : undefined}>
      <p className="text-lg font-black text-white">
        <CountryWithFlag name={name} size={22} alignRight={alignRight} />
      </p>
      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Equipo</p>
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
  };

  return labels[stage];
}
