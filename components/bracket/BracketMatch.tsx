"use client";

import { useState } from "react";
import { CountryWithFlag } from "@/components/CountryWithFlag";
import type { Match } from "@/data/matches";
import { calculatePoints, parseScore, type ScoreInput } from "@/lib/prode";
import { getMatchWinner } from "@/lib/standings";
import type { BracketMode } from "@/types/bracket";

type Props = {
  match: Match;
  result?: ScoreInput;
  prediction?: ScoreInput;
  isPredictionSaved?: boolean;
  mode: BracketMode;
  /**
   * Sólo aplica con `mode === "view"`. Si true, el participante puede editar
   * y guardar su predicción directo desde el bracket.
   * En modo "admin" este flag se ignora: el admin nunca carga predicciones.
   */
  canPredict?: boolean;
  /** Resultados completos de toda la app (sirven para detectar al ganador). */
  allResults: Record<string, ScoreInput>;
  /** Si true, el match es la final/tercer puesto (renderizado más prominente). */
  highlight?: boolean;
  onSaveResult?: (matchId: string, score: ScoreInput) => Promise<boolean> | void;
  onDeleteResult?: (matchId: string) => Promise<void> | void;
  onPredictionChange?: (matchId: string, side: keyof ScoreInput, value: string) => void;
  onSavePrediction?: (matchId: string) => Promise<boolean> | boolean | void;
};

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
  isPredictionSaved = false,
  mode,
  canPredict = false,
  allResults,
  highlight = false,
  onSaveResult,
  onDeleteResult,
  onPredictionChange,
  onSavePrediction,
}: Props) {
  const isAdmin = mode === "admin";
  const showPredictionEditor = !isAdmin && canPredict;

  const winner = getMatchWinner(match, allResults);
  const points = calculatePoints(prediction, result, isPredictionSaved);
  const hasResult = Boolean(parseScore(result));
  const hasPrediction = Boolean(parseScore(prediction));
  const isManual =
    match.homeTeamSource === "manual" || match.awayTeamSource === "manual";

  const baseScore = result ?? { home: "", away: "" };
  const [adminDraft, setAdminDraft] = useState<ScoreInput>(baseScore);
  const [saving, setSaving] = useState(false);
  const [savingPrediction, setSavingPrediction] = useState(false);

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
    if (!onSavePrediction || !hasPrediction) return;
    setSavingPrediction(true);
    try {
      await onSavePrediction(match.id);
    } finally {
      setSavingPrediction(false);
    }
  };

  const homeIsWinner = winner === match.homeTeam;
  const awayIsWinner = winner === match.awayTeam;

  return (
    <article
      className={`group relative w-[240px] overflow-hidden rounded-2xl border bg-slate-950/80 px-3 py-2.5 backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-300/40 hover:shadow-[0_22px_60px_-22px_rgba(74,222,128,0.45)] ${
        highlight
          ? "border-emerald-300/40 bg-gradient-to-br from-emerald-300/10 via-slate-950/85 to-lime-300/10 shadow-[inset_0_0_0_1px_rgba(74,222,128,0.25),0_24px_60px_-28px_rgba(34,197,94,0.55)]"
          : "border-white/[0.07] shadow-lg shadow-black/30"
      }`}
    >
      {/* Acento LED superior */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-3 top-0 h-px bg-[linear-gradient(90deg,_transparent_0%,_rgba(74,222,128,0.45)_50%,_transparent_100%)] opacity-60"
      />
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
            className="fc-display rounded-lg bg-emerald-300 px-3 py-1 text-[0.65rem] uppercase tracking-[0.16em] text-slate-950 shadow-[0_8px_18px_-8px_rgba(74,222,128,0.5)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {saving ? "Guardando…" : hasResult ? "Actualizar" : "Guardar"}
          </button>
          {hasResult ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="fc-display rounded-lg border border-red-300/30 bg-red-300/10 px-3 py-1 text-[0.65rem] uppercase tracking-[0.16em] text-red-100 transition hover:-translate-y-0.5 hover:bg-red-300/15 disabled:cursor-not-allowed disabled:opacity-50"
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
          hasResult={hasResult}
          points={points}
          saving={savingPrediction}
          onPredictionChange={onPredictionChange}
          onSave={handleSavePrediction}
        />
      ) : (
        <ViewModeFooter
          hasResult={hasResult}
          prediction={prediction}
          isPredictionSaved={isPredictionSaved}
          points={points}
        />
      )}
    </article>
  );
}

type PredictionEditorProps = {
  match: Match;
  prediction?: ScoreInput;
  isPredictionSaved: boolean;
  hasResult: boolean;
  points: number | null;
  saving: boolean;
  onPredictionChange?: (matchId: string, side: keyof ScoreInput, value: string) => void;
  onSave: () => void;
};

function PredictionEditor({
  match,
  prediction,
  isPredictionSaved,
  hasResult,
  points,
  saving,
  onPredictionChange,
  onSave,
}: PredictionEditorProps) {
  const homeValue = prediction?.home ?? "";
  const awayValue = prediction?.away ?? "";
  const draftValid = Boolean(parseScore({ home: homeValue, away: awayValue }));

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
            disabled={!draftValid || saving}
            className="fc-display rounded-lg bg-cyan-300 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.12em] text-slate-950 shadow-[0_8px_18px_-8px_rgba(56,189,248,0.55)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {saving ? "…" : "OK"}
          </button>
        </div>
      </div>
      <div className="fc-display mt-1 flex items-center justify-between gap-1 text-[0.6rem] tabular-nums">
        <span
          className={`uppercase tracking-[0.12em] ${
            isPredictionSaved ? "text-emerald-200" : "text-amber-200"
          }`}
        >
          {isPredictionSaved ? "Guardada" : draftValid ? "Sin guardar" : "Pendiente"}
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
}: {
  hasResult: boolean;
  prediction?: ScoreInput;
  isPredictionSaved: boolean;
  points: number | null;
}) {
  const hasPrediction = parseScore(prediction);
  if (!hasResult && !hasPrediction) {
    return null;
  }

  return (
    <div className="fc-display mt-2 flex flex-wrap items-center justify-between gap-1.5 text-[0.65rem] tabular-nums">
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
        <div className="flex items-center gap-1.5">
          {isWinner ? (
            <span
              aria-hidden
              className="h-1 w-1 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(74,222,128,0.6)]"
            />
          ) : null}
          <CountryWithFlag name={name} size={18} truncate />
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
