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

/**
 * MatchCard FIFA Broadcast — fixture-card de transmisión:
 *
 * - Header con franja diagonal de color de grupo + status pill angular.
 * - Scoreboard central tipo overlay TV: equipos a izq/der + score MEGA stencil
 *   en el centro, con line de "FINAL" o "VS" debajo.
 * - Strip de PREDICCIÓN con borde cyan (data del usuario).
 * - Strip de RESULTADO oficial con borde lime (data oficial / admin).
 * - Footer compacto con sede + LED dot.
 */
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
  const parsedResult = parseScore(result);
  const hasResult = Boolean(parsedResult);

  return (
    <article className="fc-card fc-card-accent group relative flex h-full flex-col overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--fc-lime)]/30 hover:shadow-[0_22px_60px_-22px_rgba(212,255,63,0.25)]">
      {/* Diagonales sutiles de fondo */}
      <div aria-hidden className="pointer-events-none absolute inset-0 fc-diagonal opacity-30" />

      {/* Header: tag de grupo + fecha + status pill */}
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="fc-chip fc-chip-neutral">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--fc-lime)]" />
            {match.group}
          </span>
          <span className="fc-chip fc-chip-lime">
            {match.matchday ? `Fecha ${match.matchday}` : stageLabel(match.stage)}
          </span>
        </div>
        <StatusPill hasResult={hasResult} hasPrediction={hasValidPrediction} statusText={status} />
      </div>

      {/* Meta: horario + sede */}
      <div className="relative mt-3 flex items-center gap-2 text-[0.7rem] text-slate-400">
        <span aria-hidden className="h-1 w-1 rounded-full bg-[var(--fc-lime)]/60" />
        <span className="fc-display-italic uppercase tracking-[0.16em]">
          {match.date.toUpperCase()} · {match.time}
        </span>
        <span className="text-slate-500">·</span>
        <span className="truncate">{match.city}</span>
      </div>

      {/* Scoreboard central */}
      <div
        className="fc-broadcast-cut-sm relative mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 border border-white/[0.06] bg-[#02050b]/85 px-4 py-5"
        style={{
          boxShadow: "inset 0 0 0 1px rgba(212,255,63,0.04), 0 12px 30px -16px rgba(0,0,0,0.6)",
        }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 fc-halftone opacity-30" />
        <TeamSide
          name={match.homeTeam}
          manual={match.homeTeamSource === "manual"}
        />
        <ScoreCenter
          home={parsedResult ? String(parsedResult.home) : null}
          away={parsedResult ? String(parsedResult.away) : null}
        />
        <TeamSide
          name={match.awayTeam}
          manual={match.awayTeamSource === "manual"}
          alignRight
        />
      </div>

      {/* PREDICCIÓN */}
      <div className="fc-broadcast-cut-sm relative mt-4 border border-[var(--fc-cyan)]/20 bg-[var(--fc-cyan)]/[0.04] p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="fc-display-italic flex items-center gap-1.5 text-[0.66rem] uppercase tracking-[0.22em] text-[var(--fc-cyan)]">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--fc-cyan)]" />
            Tu predicción
          </p>
          {isSaved ? (
            <span className="fc-chip fc-chip-lime">Guardada</span>
          ) : hasValidPrediction ? (
            <span className="fc-chip fc-chip-yellow">Sin guardar</span>
          ) : (
            <span className="fc-chip fc-chip-neutral">Vacía</span>
          )}
        </div>
        <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <ScoreField
            label={`Predicción de ${match.homeTeam}`}
            value={prediction.home}
            disabled={!canPredict}
            onChange={(value) => onPredictionChange?.("home", value)}
          />
          <span className="fc-display-italic text-2xl text-slate-500">–</span>
          <ScoreField
            label={`Predicción de ${match.awayTeam}`}
            value={prediction.away}
            disabled={!canPredict}
            onChange={(value) => onPredictionChange?.("away", value)}
          />
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onSavePrediction}
            disabled={!canPredict || !hasValidPrediction}
            className="fc-cta-fifa"
            style={
              {
                background:
                  "linear-gradient(95deg, #38d4ff 0%, #d4ff3f 50%, #38d4ff 100%)",
                "--fc-cta-shadow": "rgba(56,212,255,0.55)",
              } as React.CSSProperties
            }
          >
            <span aria-hidden>▸</span> Guardar predicción
          </button>
          {hasResult && points !== null ? <PointsBadge points={points} /> : null}
        </div>
      </div>

      {/* RESULTADO OFICIAL */}
      {canEditResult || canManageResult || hasResult ? (
        <div className="fc-broadcast-cut-sm relative mt-3 border border-[var(--fc-lime)]/20 bg-[#02050b]/70 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="fc-display-italic flex items-center gap-1.5 text-[0.66rem] uppercase tracking-[0.22em] text-[var(--fc-lime)]">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--fc-lime)]" />
              Resultado oficial
            </p>
            <span className="fc-display-italic text-[0.7rem] uppercase tracking-[0.18em] text-slate-400">
              {hasResult ? "Cargado" : "Sin cargar"}
            </span>
          </div>
          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <ScoreField
              label={`Resultado real de ${match.homeTeam}`}
              value={result.home}
              disabled={!canEditResult}
              onChange={(value) => onResultChange?.("home", value)}
            />
            <span className="fc-display-italic text-2xl text-slate-500">–</span>
            <ScoreField
              label={`Resultado real de ${match.awayTeam}`}
              value={result.away}
              disabled={!canEditResult}
              onChange={(value) => onResultChange?.("away", value)}
            />
          </div>
          {canManageResult ? (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <AdminBtn
                tone="primary"
                disabled={!canEditResult || !hasResult}
                onClick={onSaveResult}
              >
                Guardar
              </AdminBtn>
              <AdminBtn tone="secondary" disabled={canEditResult} onClick={onEditResult}>
                Editar
              </AdminBtn>
              <AdminBtn
                tone="danger"
                disabled={!hasResult && !hasSavedResult}
                onClick={onDeleteResult}
              >
                Borrar
              </AdminBtn>
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="relative mt-auto pt-4 fc-display-italic text-[0.66rem] uppercase tracking-[0.22em] text-slate-500">
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
    <div className={`relative min-w-0 ${alignRight ? "text-right" : ""}`}>
      <p className="fc-display-italic text-[1rem] uppercase tracking-[0.04em] text-white">
        <CountryWithFlag name={name} size={26} alignRight={alignRight} truncate />
      </p>
      {manual ? (
        <span
          title="Definido por el admin (override manual)"
          className="fc-chip fc-chip-yellow mt-2"
        >
          Manual
        </span>
      ) : null}
    </div>
  );
}

function ScoreCenter({ home, away }: { home: string | null; away: string | null }) {
  if (home === null || away === null) {
    return (
      <div className="relative flex flex-col items-center">
        <span className="fc-stencil text-[2.4rem] leading-none text-slate-600">
          –
        </span>
        <span className="fc-display-italic mt-1 text-[0.6rem] uppercase tracking-[0.28em] text-slate-500">
          vs
        </span>
      </div>
    );
  }
  return (
    <div className="relative flex flex-col items-center">
      <p className="fc-stencil text-[2.6rem] leading-none text-white">
        {home}
        <span className="px-1.5 text-[var(--fc-lime)]">:</span>
        {away}
      </p>
      <span className="fc-display-italic mt-1 inline-flex items-center gap-1 text-[0.6rem] uppercase tracking-[0.28em] text-[var(--fc-lime)]">
        <span aria-hidden className="h-1 w-1 rounded-full bg-[var(--fc-lime)]" />
        Final
      </span>
    </div>
  );
}

function StatusPill({
  hasResult,
  hasPrediction,
  statusText,
}: {
  hasResult: boolean;
  hasPrediction: boolean;
  statusText: string;
}) {
  if (hasResult) {
    return (
      <span className="fc-chip fc-chip-lime">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--fc-lime)]" />
        {statusText}
      </span>
    );
  }
  if (hasPrediction) {
    return (
      <span className="fc-chip fc-chip-cyan">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--fc-cyan)]" />
        {statusText}
      </span>
    );
  }
  return (
    <span className="fc-chip fc-chip-neutral">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-slate-500" />
      {statusText}
    </span>
  );
}

function PointsBadge({ points }: { points: number }) {
  if (points === 3) {
    return (
      <span className="fc-chip fc-chip-lime">
        <span aria-hidden>★</span>
        {points} pts
      </span>
    );
  }
  if (points === 1) {
    return (
      <span className="fc-chip fc-chip-yellow">
        <span aria-hidden>★</span>
        {points} pts
      </span>
    );
  }
  return (
    <span className="fc-chip fc-chip-magenta">
      <span aria-hidden>★</span>
      {points} pts
    </span>
  );
}

function AdminBtn({
  tone,
  children,
  disabled,
  onClick,
}: {
  tone: "primary" | "secondary" | "danger";
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const cls =
    tone === "primary"
      ? "border-[var(--fc-lime)]/40 bg-[var(--fc-lime)]/12 text-[var(--fc-lime)] hover:bg-[var(--fc-lime)]/22"
      : tone === "danger"
        ? "border-[var(--fc-magenta)]/40 bg-[var(--fc-magenta)]/12 text-[var(--fc-magenta)] hover:bg-[var(--fc-magenta)]/20"
        : "border-white/15 bg-white/[0.06] text-white hover:bg-white/15";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`fc-broadcast-cut-sm fc-display-italic border px-4 py-2 text-[0.7rem] uppercase tracking-[0.18em] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 ${cls}`}
    >
      {children}
    </button>
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
