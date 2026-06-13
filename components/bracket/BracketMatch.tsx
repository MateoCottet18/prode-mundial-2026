"use client";

import { useState } from "react";
import { CountryWithFlag } from "@/components/CountryWithFlag";
import { MatchPredictionsReveal } from "@/components/MatchPredictionsReveal";
import type { Match } from "@/data/matches";
import { calculatePoints, parseScore, type ScoreInput } from "@/lib/prode";
import { getMatchWinner } from "@/lib/standings";
import type { BracketMode } from "@/types/bracket";
import { getPredictionCloseLabel, type PredictionLock } from "@/lib/matchTime";

type Props = {
  match: Match;
  result?: ScoreInput;
  /** Estado del input local del usuario (lo que está tipeando). */
  prediction?: ScoreInput;
  /** Último valor confirmado en Supabase. Usado en read-only / locked. */
  dbPrediction?: ScoreInput;
  isPredictionSaved?: boolean;
  mode: BracketMode;
  /**
   * Sólo aplica con `mode === "view"`. Si true, el participante puede editar
   * y guardar su predicción directo desde el bracket.
   * En modo "admin" este flag se ignora: el admin nunca carga predicciones.
   */
  canPredict?: boolean;
  /**
   * Bloqueo de la predicción (kickoff ya pasó o resultado cargado). Si está
   * locked, el `PredictionEditor` se reemplaza por un footer read-only con
   * el motivo. Sólo aplica al modo participante.
   */
  predictionLock?: PredictionLock;
  /** Resultados completos de toda la app (sirven para detectar al ganador). */
  allResults: Record<string, ScoreInput>;
  /** Si true, el match es la final/tercer puesto (renderizado más prominente). */
  highlight?: boolean;
  onSaveResult?: (matchId: string, score: ScoreInput) => Promise<boolean> | void;
  onDeleteResult?: (matchId: string) => Promise<void> | void;
  onPredictionChange?: (matchId: string, side: keyof ScoreInput, value: string) => void;
  onSavePrediction?: (matchId: string) => Promise<boolean> | boolean | void;
};

function scoresEqual(a?: ScoreInput, b?: ScoreInput) {
  return (a?.home ?? "") === (b?.home ?? "") && (a?.away ?? "") === (b?.away ?? "");
}

/**
 * Tarjeta compacta de un partido eliminatorio para el bracket.
 *
 * - mode "admin": carga/edita SOLO el resultado real (con inputs en cada team
 *   row + botones guardar/borrar). El admin NUNCA ve inputs de predicción.
 * - mode "view" + canPredict (participante): muestra resultado real read-only
 *   en los team rows y agrega un strip compacto abajo para cargar/guardar la
 *   predicción.
 * - mode "view" + !canPredict (visitante o pantalla pública): todo read-only
 *   con la predicción/puntos como resumen.
 */
export function BracketMatch({
  match,
  result,
  prediction,
  dbPrediction,
  isPredictionSaved = false,
  mode,
  canPredict = false,
  predictionLock,
  allResults,
  highlight = false,
  onSaveResult,
  onDeleteResult,
  onPredictionChange,
  onSavePrediction,
}: Props) {
  const isAdmin = mode === "admin";
  const isLocked = predictionLock?.locked === true;
  // El editor sólo aparece para participantes que tienen permiso Y cuyo lock
  // está abierto. Si el partido ya empezó o tiene resultado, mostramos la
  // predicción en modo solo lectura.
  const showPredictionEditor = !isAdmin && canPredict && !isLocked;

  const winner = getMatchWinner(match, allResults);
  // Para puntos / view-mode usamos siempre el valor de DB; el input local es
  // sólo para edición.
  const persistedPrediction = dbPrediction ?? (isPredictionSaved ? prediction : undefined);
  const points = calculatePoints(persistedPrediction, result, isPredictionSaved);
  const hasResult = Boolean(parseScore(result));
  const isDirty =
    isPredictionSaved && !isLocked && !scoresEqual(prediction, dbPrediction);
  const isManual =
    match.homeTeamSource === "manual" || match.awayTeamSource === "manual";

  const baseScore = result ?? { home: "", away: "" };
  const [adminDraft, setAdminDraft] = useState<ScoreInput>(baseScore);
  const [saving, setSaving] = useState(false);
  const [savingPrediction, setSavingPrediction] = useState(false);
  const [predictionSaveError, setPredictionSaveError] = useState<string | null>(null);

  const [syncedBase, setSyncedBase] = useState(baseScore);
  if (
    isAdmin &&
    (syncedBase.home !== baseScore.home || syncedBase.away !== baseScore.away)
  ) {
    setSyncedBase(baseScore);
    setAdminDraft(baseScore);
  }

  const draft = isAdmin ? adminDraft : baseScore;

  const draftValid = parseScore(draft);
  const draftDiffers = draft.home !== baseScore.home || draft.away !== baseScore.away;

  const handleSave = async () => {
    if (!onSaveResult || !draftValid) return;
    setSaving(true);
    try {
      await onSaveResult(match.id, draft);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDeleteResult) return;
    setSaving(true);
    try {
      await onDeleteResult(match.id);
      setAdminDraft({ home: "", away: "" });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrediction = async () => {
    if (!onSavePrediction || !parseScore(prediction)) return;
    setSavingPrediction(true);
    setPredictionSaveError(null);
    try {
      const ok = await onSavePrediction(match.id);
      if (ok === false) {
        setPredictionSaveError(
          "No se pudo guardar. Revisá tu sesión o intentá de nuevo.",
        );
      }
    } finally {
      setSavingPrediction(false);
    }
  };

  const homeIsWinner = winner === match.homeTeam;
  const awayIsWinner = winner === match.awayTeam;

  return (
    <article
      className={`group relative w-[240px] rounded-xl border bg-[#0a1018] px-3 py-2.5 transition-colors duration-200 hover:border-emerald-300/30 ${
        highlight
          ? "border-emerald-300/35 bg-[#0c1410]"
          : "border-white/[0.07]"
      }`}
    >
      {highlight ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-3 top-0 h-px bg-emerald-300/40"
        />
      ) : null}
      <div className="fc-display flex items-center justify-between gap-2 text-[0.6rem] uppercase tracking-[0.18em] text-slate-400">
        <span>{stageLabel(match.id, match.stage)}</span>
        <div className="flex items-center gap-1">
          {isManual ? (
            <span
              title="Override manual"
              className="rounded-full border border-amber-300/40 bg-amber-300/10 px-1.5 py-0.5 text-amber-100"
            >
              Manual
            </span>
          ) : null}
          {hasResult ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-300/10 px-1.5 py-0.5 text-emerald-100">
              <span aria-hidden className="h-1 w-1 rounded-full bg-emerald-300" />
              Final
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-500/40 bg-slate-500/10 px-1.5 py-0.5 text-slate-300">
              <span aria-hidden className="h-1 w-1 rounded-full bg-slate-500" />
              Pendiente
            </span>
          )}
        </div>
      </div>

      <TeamRow
        name={match.homeTeam}
        score={isAdmin ? draft.home : result?.home}
        isWinner={homeIsWinner}
        manual={match.homeTeamSource === "manual"}
        adminEditable={isAdmin}
        onScoreChange={(value) => setAdminDraft((d) => ({ ...d, home: value }))}
      />
      <TeamRow
        name={match.awayTeam}
        score={isAdmin ? draft.away : result?.away}
        isWinner={awayIsWinner}
        manual={match.awayTeamSource === "manual"}
        adminEditable={isAdmin}
        onScoreChange={(value) => setAdminDraft((d) => ({ ...d, away: value }))}
      />

      {isAdmin ? (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 text-[0.65rem]">
          <button
            type="button"
            onClick={handleSave}
            disabled={!draftValid || saving || !draftDiffers}
            className="fc-display rounded-md bg-emerald-300 px-3 py-1 text-[0.65rem] uppercase tracking-[0.16em] text-slate-950 transition-colors hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Guardando…" : hasResult ? "Actualizar" : "Guardar"}
          </button>
          {hasResult ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="fc-display rounded-md border border-red-300/30 bg-red-300/10 px-3 py-1 text-[0.65rem] uppercase tracking-[0.16em] text-red-100 transition-colors hover:bg-red-300/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Borrar
            </button>
          ) : null}
        </div>
      ) : showPredictionEditor ? (
        <PredictionEditor
          match={match}
          prediction={prediction}
          isPredictionSaved={isPredictionSaved}
          isDirty={isDirty}
          hasResult={hasResult}
          points={points}
          saving={savingPrediction}
          saveError={predictionSaveError}
          onPredictionChange={onPredictionChange}
          onSave={handleSavePrediction}
        />
      ) : (
        <ViewModeFooter
          hasResult={hasResult}
          prediction={persistedPrediction}
          isPredictionSaved={isPredictionSaved}
          points={points}
          lockMessage={
            !isAdmin && canPredict && isLocked && predictionLock?.locked
              ? predictionLock.message
              : null
          }
        />
      )}

      {/* Revelación de predicciones (sólo participantes, tras el kickoff) */}
      {!isAdmin && canPredict ? (
        <MatchPredictionsReveal
          matchId={match.id}
          revealed={isLocked}
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          compact
        />
      ) : null}
    </article>
  );
}

type PredictionEditorProps = {
  match: Match;
  prediction?: ScoreInput;
  isPredictionSaved: boolean;
  isDirty: boolean;
  hasResult: boolean;
  points: number | null;
  saving: boolean;
  saveError?: string | null;
  onPredictionChange?: (matchId: string, side: keyof ScoreInput, value: string) => void;
  onSave: () => void;
};

function PredictionEditor({
  match,
  prediction,
  isPredictionSaved,
  isDirty,
  hasResult,
  points,
  saving,
  saveError,
  onPredictionChange,
  onSave,
}: PredictionEditorProps) {
  const homeValue = prediction?.home ?? "";
  const awayValue = prediction?.away ?? "";
  const draftValid = Boolean(parseScore({ home: homeValue, away: awayValue }));
  const canSave = draftValid && !saving && (isDirty || !isPredictionSaved);
  const closeLabel = getPredictionCloseLabel(match);

  return (
    <div className="mt-2 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.05] px-2 py-1.5">
      <div className="flex items-center justify-between gap-1.5">
        <span className="fc-display text-[0.6rem] uppercase tracking-[0.16em] text-cyan-200">
          Predicción
        </span>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            max={20}
            inputMode="numeric"
            value={homeValue}
            onChange={(event) =>
              onPredictionChange?.(match.id, "home", event.target.value)
            }
            className="fc-display h-7 w-9 rounded-md border border-white/[0.07] bg-slate-950/85 px-1 text-center text-sm tabular-nums text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/15"
            placeholder="—"
            aria-label={`Predicción de ${match.homeTeam}`}
          />
          <span className="fc-display text-xs text-slate-400">–</span>
          <input
            type="number"
            min={0}
            max={20}
            inputMode="numeric"
            value={awayValue}
            onChange={(event) =>
              onPredictionChange?.(match.id, "away", event.target.value)
            }
            className="fc-display h-7 w-9 rounded-md border border-white/[0.07] bg-slate-950/85 px-1 text-center text-sm tabular-nums text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/15"
            placeholder="—"
            aria-label={`Predicción de ${match.awayTeam}`}
          />
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            title={
              isDirty
                ? "Guardar cambios"
                : isPredictionSaved
                  ? "Predicción guardada"
                  : "Guardar predicción"
            }
            className="fc-display rounded-md bg-cyan-300 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.12em] text-slate-950 transition-colors hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "…" : isDirty ? "Guardar" : isPredictionSaved ? "OK" : "Guardar"}
          </button>
        </div>
      </div>
      {closeLabel ? (
        <p className="fc-display mt-1 text-[0.55rem] uppercase tracking-[0.12em] text-slate-400">
          Cierra: {closeLabel} (hora Argentina)
        </p>
      ) : null}
      {saveError ? (
        <p className="mt-1 text-[0.65rem] text-red-300" role="alert">
          {saveError}
        </p>
      ) : null}
      <div className="fc-display mt-1 flex items-center justify-between gap-1 text-[0.6rem] tabular-nums">
        <span
          className={`uppercase tracking-[0.12em] ${
            isDirty
              ? "text-amber-200"
              : isPredictionSaved
                ? "text-emerald-200"
                : "text-amber-200"
          }`}
        >
          {isDirty
            ? "Cambios sin guardar"
            : isPredictionSaved
              ? "Guardada"
              : draftValid
                ? "Sin guardar"
                : "Pendiente"}
        </span>
        {hasResult && points !== null ? (
          <span
            className={`rounded-full px-2 py-0.5 uppercase tracking-[0.12em] ${
              points === 3
                ? "border border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
                : points === 1
                  ? "border border-amber-300/40 bg-amber-300/10 text-amber-100"
                  : "border border-slate-500/40 bg-slate-500/10 text-slate-300"
            }`}
          >
            {points} pts
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ViewModeFooter({
  hasResult,
  prediction,
  isPredictionSaved,
  points,
  lockMessage,
}: {
  hasResult: boolean;
  prediction?: ScoreInput;
  isPredictionSaved: boolean;
  points: number | null;
  lockMessage?: string | null;
}) {
  const hasPrediction = parseScore(prediction);
  if (!hasResult && !hasPrediction && !lockMessage) {
    return null;
  }

  return (
    <div className="mt-2 space-y-1.5">
      {hasPrediction || (hasResult && points !== null) ? (
        <div className="fc-display flex flex-wrap items-center justify-between gap-1.5 text-[0.65rem] tabular-nums">
          {hasPrediction ? (
            <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-0.5 uppercase tracking-[0.12em] text-cyan-100">
              Tu: {prediction?.home ?? "?"}–{prediction?.away ?? "?"}
              {!isPredictionSaved ? " · sin guardar" : ""}
            </span>
          ) : null}
          {hasResult && points !== null ? (
            <span
              className={`rounded-full px-2 py-0.5 uppercase tracking-[0.12em] ${
                points === 3
                  ? "border border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
                  : points === 1
                    ? "border border-amber-300/40 bg-amber-300/10 text-amber-100"
                    : "border border-slate-500/40 bg-slate-500/10 text-slate-300"
              }`}
            >
              {points} pts
            </span>
          ) : null}
        </div>
      ) : null}
      {lockMessage ? (
        <p className="flex items-center gap-1.5 border-l-2 border-amber-300/60 bg-amber-300/[0.06] px-2 py-1 text-[0.6rem] uppercase tracking-[0.12em] text-amber-100">
          <span aria-hidden>🔒</span>
          <span className="normal-case tracking-normal">{lockMessage}</span>
        </p>
      ) : null}
    </div>
  );
}

type TeamRowProps = {
  name: string;
  score: string | undefined;
  isWinner: boolean;
  manual: boolean;
  adminEditable: boolean;
  onScoreChange: (value: string) => void;
};

function TeamRow({
  name,
  score,
  isWinner,
  manual,
  adminEditable,
  onScoreChange,
}: TeamRowProps) {
  return (
    <div
      className={`mt-2 flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-all duration-300 ${
        isWinner
          ? "bg-emerald-300/15 ring-1 ring-emerald-300/40"
          : "bg-white/[0.025]"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {isWinner ? (
            <span
              aria-hidden
              className="h-1 w-1 shrink-0 rounded-full bg-emerald-300"
            />
          ) : null}
          <CountryWithFlag name={name} size={26} truncate />
          {manual ? (
            <span
              aria-hidden
              title="Override manual"
              className="inline-block h-1.5 w-1.5 rounded-full bg-amber-300"
            />
          ) : null}
        </div>
      </div>
      {adminEditable ? (
        <input
          type="number"
          min={0}
          max={20}
          inputMode="numeric"
          value={score ?? ""}
          onChange={(event) => onScoreChange(event.target.value)}
          className="fc-display h-8 w-12 rounded-lg border border-white/[0.07] bg-slate-950/85 px-2 text-center text-sm tabular-nums text-white outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/15"
          placeholder="—"
          aria-label={`Resultado de ${name}`}
        />
      ) : (
        <span
          className={`fc-display min-w-[1.5rem] text-right text-lg tabular-nums ${
            isWinner ? "text-emerald-100" : "text-slate-200"
          }`}
        >
          {score && score !== "" ? score : "—"}
        </span>
      )}
    </div>
  );
}

function stageLabel(matchId: string, stage: Match["stage"]) {
  if (matchId === "tercer-puesto") return "3er puesto";
  switch (stage) {
    case "16avos":
      return "16avos";
    case "octavos":
      return "Octavos";
    case "cuartos":
      return "Cuartos";
    case "semifinal":
      return "Semi";
    case "final":
      return "Final";
    default:
      return stage;
  }
}
