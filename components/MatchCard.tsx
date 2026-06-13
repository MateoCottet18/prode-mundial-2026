import type { Match } from "@/data/matches";
import { CountryWithFlag } from "@/components/CountryWithFlag";
import { MatchPredictionsReveal } from "@/components/MatchPredictionsReveal";
import { ScoreField } from "@/components/ScoreField";
import {
  calculatePoints,
  emptyScore,
  getPredictionStatus,
  parseScore,
  type ScoreInput,
} from "@/lib/prode";
import { getKickoffDateLabelArgentina, getPredictionCloseLabel, type PredictionLock } from "@/lib/matchTime";

type MatchCardProps = {
  match: Match;
  /** Estado del INPUT (lo que está tipeando el usuario). Editable. */
  prediction?: ScoreInput;
  /**
   * Último valor confirmado en Supabase para este match. Si está presente,
   * la card sabe que existe una fila persistida y la muestra cuando la
   * predicción está bloqueada (kickoff o resultado), incluso si el usuario
   * tiene cambios locales sin guardar.
   */
  dbPrediction?: ScoreInput;
  result?: ScoreInput;
  /**
   * `true` cuando hay fila en `public.predictions` para este (user, match).
   * NO refleja el dirty state — sólo "existe en DB".
   */
  isSaved?: boolean;
  canPredict?: boolean;
  /**
   * Bloqueo de la predicción. Si está `locked`, los inputs van read-only y se
   * muestra un aviso con el motivo (kickoff ya pasó / resultado ya cargado).
   * Cuando no se pasa, se asume desbloqueada.
   */
  predictionLock?: PredictionLock;
  canEditResult?: boolean;
  canManageResult?: boolean;
  hasSavedResult?: boolean;
  onPredictionChange?: (side: keyof ScoreInput, value: string) => void;
  onSavePrediction?: () => void | Promise<boolean>;
  isSavingPrediction?: boolean;
  onResultChange?: (side: keyof ScoreInput, value: string) => void;
  onSaveResult?: () => void;
  onEditResult?: () => void;
  onDeleteResult?: () => void;
};

function scoresEqual(a?: ScoreInput, b?: ScoreInput) {
  return (a?.home ?? "") === (b?.home ?? "") && (a?.away ?? "") === (b?.away ?? "");
}

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
  dbPrediction,
  result = emptyScore,
  isSaved = false,
  canPredict = false,
  predictionLock,
  canEditResult = false,
  canManageResult = false,
  hasSavedResult = false,
  onPredictionChange,
  onSavePrediction,
  isSavingPrediction = false,
  onResultChange,
  onSaveResult,
  onEditResult,
  onDeleteResult,
}: MatchCardProps) {
  const isLocked = predictionLock?.locked === true;
  // Mientras la predicción esté bloqueada, los inputs y el botón "Guardar"
  // quedan deshabilitados aunque el usuario tenga rol participante.
  const canEditPrediction = canPredict && !isLocked;

  // Cuando está bloqueada, lo que tiene que verse en pantalla es la fila
  // confirmada en Supabase, no el draft local del usuario. Si nunca llegó a
  // guardar, mostramos el último estado del input (que igual ya quedó
  // congelado por el lock).
  const displayedPrediction = isLocked ? (dbPrediction ?? prediction) : prediction;

  // Para puntos / "guardada": SIEMPRE usamos el valor de DB. Si el usuario
  // tiene cambios locales sin guardar, los puntos siguen reflejando lo que
  // está realmente persistido.
  const scoredPrediction = dbPrediction ?? (isSaved ? prediction : undefined);

  const status = getPredictionStatus(scoredPrediction, result, isSaved);
  const points = calculatePoints(scoredPrediction, result, isSaved);
  const hasValidPrediction = Boolean(parseScore(prediction));
  const parsedResult = parseScore(result);
  const hasResult = Boolean(parsedResult);

  // Hora (Argentina) en que se cierra la predicción de este partido.
  const closeLabel = getPredictionCloseLabel(match);
  const kickoffDateLabel = getKickoffDateLabelArgentina(match);

  // "isDirty" → la fila existe en DB y el input local difiere del valor
  // persistido. Sólo mientras la predicción está abierta tiene sentido.
  const isDirty = isSaved && !isLocked && !scoresEqual(prediction, dbPrediction);

  return (
    <article className="fc-card fc-card-accent group relative flex h-full flex-col p-5 transition-colors duration-200 hover:border-[var(--fc-lime)]/25">

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

      {/* Meta: horario (hora Argentina) + sede */}
      <div className="relative mt-3 flex items-center gap-2 text-[0.7rem] text-slate-400">
        <span aria-hidden className="h-1 w-1 rounded-full bg-[var(--fc-lime)]/60" />
        <span className="fc-display-italic uppercase tracking-[0.16em]">
          {(kickoffDateLabel ?? match.date).toUpperCase()}
          {closeLabel ? ` · ${closeLabel} ARG` : ""}
        </span>
        <span className="text-slate-500">·</span>
        <span className="truncate">{match.city}</span>
      </div>

      {/* Scoreboard central */}
      <div className="fc-broadcast-cut-sm relative mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 border border-white/[0.06] bg-[#070b13] px-4 py-5">
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
          {isDirty ? (
            <span className="fc-chip fc-chip-yellow">Cambios sin guardar</span>
          ) : isSaved ? (
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
            value={displayedPrediction.home}
            disabled={!canEditPrediction}
            onChange={(value) => onPredictionChange?.("home", value)}
          />
          <span className="fc-display-italic text-2xl text-slate-500">–</span>
          <ScoreField
            label={`Predicción de ${match.awayTeam}`}
            value={displayedPrediction.away}
            disabled={!canEditPrediction}
            onChange={(value) => onPredictionChange?.("away", value)}
          />
        </div>
        {isLocked ? (
          <div className="mt-3 flex items-center gap-2 border-l-2 border-[var(--fc-yellow)]/60 bg-[var(--fc-yellow)]/[0.06] px-3 py-2 text-xs text-[var(--fc-yellow)]">
            <span aria-hidden>🔒</span>
            <span>{predictionLock?.locked ? predictionLock.message : ""}</span>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {closeLabel ? (
              <span className="text-[0.62rem] uppercase tracking-[0.14em] text-slate-400">
                Cierra: {closeLabel} (hora Argentina)
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => void onSavePrediction?.()}
              disabled={
                isSavingPrediction ||
                !canEditPrediction ||
                !hasValidPrediction ||
                (isSaved && !isDirty)
              }
              className="fc-cta-fifa"
              style={
                {
                  background:
                    "linear-gradient(95deg, #38d4ff 0%, #d4ff3f 50%, #38d4ff 100%)",
                  "--fc-cta-shadow": "rgba(56,212,255,0.55)",
                } as React.CSSProperties
              }
            >
              <span aria-hidden>▸</span>{" "}
              {isSavingPrediction
                ? "Guardando…"
                : isSaved
                  ? "Guardar cambios"
                  : "Guardar predicción"}
            </button>
            {hasResult && points !== null ? <PointsBadge points={points} /> : null}
          </div>
        )}
        {isLocked && hasResult && points !== null ? (
          <div className="mt-2 flex justify-end">
            <PointsBadge points={points} />
          </div>
        ) : null}
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

      {/* REVELACIÓN DE PREDICCIONES (sólo participantes, tras el kickoff) */}
      {canPredict ? (
        <MatchPredictionsReveal
          matchId={match.id}
          revealed={isLocked}
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
        />
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
}: {
  name: string;
  manual?: boolean;
  /** No usado en variante stack, pero queda para no romper llamadas. */
  alignRight?: boolean;
}) {
  // Bandera como elemento PRINCIPAL: grande arriba, nombre chico abajo.
  // Pattern FIFA / OneFootball: el reconocimiento es por bandera primero.
  return (
    <div className="relative flex min-w-0 flex-col items-center gap-1">
      <CountryWithFlag
        name={name}
        size={56}
        variant="stack"
        nameClassName="text-[0.72rem]"
      />
      {manual ? (
        <span
          title="Definido por el admin (override manual)"
          className="fc-chip fc-chip-yellow"
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
      className={`fc-broadcast-cut-sm fc-display-italic border px-4 py-2 text-[0.7rem] uppercase tracking-[0.18em] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${cls}`}
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
