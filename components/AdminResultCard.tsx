import { ScoreField } from "@/components/ScoreField";
import { CountryWithFlag } from "@/components/CountryWithFlag";
import type { Match } from "@/data/matches";
import { parseScore, type ScoreInput } from "@/lib/prode";

type AdminResultCardProps = {
  match: Match;
  result?: ScoreInput;
  canEditResult: boolean;
  hasSavedResult: boolean;
  onResultChange: (side: keyof ScoreInput, value: string) => void;
  onSaveResult: () => void;
  onEditResult: () => void;
  onDeleteResult: () => void;
};

/**
 * Card de carga manual de resultados (panel admin). Mismo lenguaje que la
 * MatchCard pública: top-bar de grupo/fase, equipos con bandera grande, score
 * boldface al medio, status pill y barra LED de acento.
 */
export function AdminResultCard({
  match,
  result = { home: "", away: "" },
  canEditResult,
  hasSavedResult,
  onResultChange,
  onSaveResult,
  onEditResult,
  onDeleteResult,
}: AdminResultCardProps) {
  const parsed = parseScore(result);
  const hasValidResult = Boolean(parsed);

  return (
    <article className="fc-card fc-card-accent group flex h-full flex-col p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300/35 hover:shadow-[0_22px_60px_-22px_rgba(74,222,128,0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="fc-display rounded-md bg-white/[0.08] px-2.5 py-1 text-[0.7rem] uppercase tracking-[0.16em] text-slate-100">
            {match.group}
          </span>
          <span className="fc-display rounded-md border border-emerald-300/30 bg-emerald-300/10 px-2.5 py-1 text-[0.7rem] uppercase tracking-[0.16em] text-emerald-100">
            {match.matchday ? `Fecha ${match.matchday}` : stageLabel(match.stage)}
          </span>
        </div>
        <span
          className={`fc-display inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.16em] ${
            hasSavedResult
              ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
              : "border-amber-300/40 bg-amber-300/10 text-amber-100"
          }`}
        >
          <span
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full ${
              hasSavedResult ? "bg-emerald-300" : "bg-amber-300"
            }`}
          />
          {hasSavedResult ? "Cargado" : "Pendiente"}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[0.7rem] text-slate-400">
        <span aria-hidden className="h-1 w-1 rounded-full bg-emerald-300/60" />
        <span className="fc-display tracking-[0.1em]">
          {match.date.toUpperCase()} · {match.time}
        </span>
        <span className="text-slate-500">·</span>
        <span className="truncate">{match.city}</span>
      </div>

      <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-white/[0.06] bg-slate-950/55 px-4 py-4">
        <TeamSide name={match.homeTeam} manual={match.homeTeamSource === "manual"} />
        <div className="flex flex-col items-center">
          <p className="fc-display text-[2rem] leading-none text-white tabular-nums">
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
          <span className="fc-display mt-1 text-[0.6rem] uppercase tracking-[0.22em] text-slate-400">
            {parsed ? "Final" : "vs"}
          </span>
        </div>
        <TeamSide
          name={match.awayTeam}
          manual={match.awayTeamSource === "manual"}
          alignRight
        />
      </div>

      <div className="mt-4 rounded-2xl border border-white/[0.07] bg-slate-950/65 p-4">
        <p className="fc-overline text-[0.65rem] text-emerald-200">Resultado oficial</p>
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <ScoreField
            label={`Resultado real de ${match.homeTeam}`}
            value={result.home}
            disabled={!canEditResult}
            onChange={(value) => onResultChange("home", value)}
          />
          <span className="fc-display text-2xl text-slate-400">–</span>
          <ScoreField
            label={`Resultado real de ${match.awayTeam}`}
            value={result.away}
            disabled={!canEditResult}
            onChange={(value) => onResultChange("away", value)}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSaveResult}
          disabled={!canEditResult || !hasValidResult}
          className="fc-display rounded-lg border border-emerald-300/40 bg-emerald-300/10 px-4 py-2 text-[0.72rem] uppercase tracking-[0.16em] text-emerald-100 transition hover:-translate-y-0.5 hover:bg-emerald-300/20 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={onEditResult}
          disabled={canEditResult}
          className="fc-display rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2 text-[0.72rem] uppercase tracking-[0.16em] text-white transition hover:-translate-y-0.5 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={onDeleteResult}
          disabled={!hasValidResult && !hasSavedResult}
          className="fc-display rounded-lg border border-red-300/30 bg-red-300/10 px-4 py-2 text-[0.72rem] uppercase tracking-[0.16em] text-red-100 transition hover:-translate-y-0.5 hover:bg-red-300/15 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          Borrar
        </button>
      </div>

      <p className="mt-auto pt-4 text-[0.7rem] uppercase tracking-[0.16em] text-slate-500">
        {match.venue}
      </p>
    </article>
  );
}

function TeamSide({
  name,
  manual = false,
  alignRight = false,
}: {
  name: string;
  manual?: boolean;
  alignRight?: boolean;
}) {
  return (
    <div className={`min-w-0 ${alignRight ? "text-right" : ""}`}>
      <p className="fc-display text-[1.05rem] uppercase tracking-[0.04em] text-white">
        <CountryWithFlag name={name} size={28} alignRight={alignRight} truncate />
      </p>
      {manual ? (
        <span
          title="Definido por el admin (override manual)"
          className="fc-display mt-1 inline-block rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.18em] text-amber-100"
        >
          Manual
        </span>
      ) : null}
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
