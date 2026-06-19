"use client";

import { useEffect, useRef } from "react";
import { CountryWithFlag } from "@/components/CountryWithFlag";
import { MatchPredictionsReveal } from "@/components/MatchPredictionsReveal";
import { bracketStageLabel } from "@/components/bracket/bracketLabels";
import type { BracketModalVariant } from "@/hooks/useBracketModal";
import type { Match } from "@/data/matches";
import { parseScore, type ScoreInput } from "@/lib/prode";
import { getMatchWinner } from "@/lib/standings";
import {
  formatDateTimeArgentina,
  getKickoffDateLabelArgentina,
  getPredictionCloseLabel,
  parseMatchKickoff,
} from "@/lib/matchTime";

type Props = {
  variant: BracketModalVariant;
  match: Match | null;
  draft: ScoreInput;
  result?: ScoreInput;
  savedPrediction?: ScoreInput;
  allResults: Record<string, ScoreInput>;
  isOpen: boolean;
  saving: boolean;
  canSave: boolean;
  hasOfficialResult: boolean;
  isPredictionSaved?: boolean;
  isDirty?: boolean;
  lockMessage?: string | null;
  saveError?: string | null;
  points?: number | null;
  canRevealPredictions?: boolean;
  /** Admin: listado de predicciones siempre disponible en el modal. */
  adminPreviewPredictions?: boolean;
  onClose: () => void;
  onDraftChange: (side: keyof ScoreInput, value: string) => void;
  onSave: () => void;
  onDelete?: () => void;
};

export function BracketMatchModal({
  variant,
  match,
  draft,
  result,
  savedPrediction,
  allResults,
  isOpen,
  saving,
  canSave,
  hasOfficialResult,
  isPredictionSaved = false,
  isDirty = false,
  lockMessage,
  saveError,
  points = null,
  canRevealPredictions = false,
  adminPreviewPredictions = false,
  onClose,
  onDraftChange,
  onSave,
  onDelete,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const readOnly = variant === "readonly";

  useEffect(() => {
    if (!isOpen || readOnly) return;
    const timer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [isOpen, readOnly, match?.id]);

  if (!isOpen || !match) return null;

  const kickoff = parseMatchKickoff(match);
  const closeLabel = getPredictionCloseLabel(match);
  const winner = getMatchWinner(match, allResults);
  const homeIsWinner = winner === match.homeTeam;
  const awayIsWinner = winner === match.awayTeam;
  const parsedResult = parseScore(result);
  const displayPrediction = readOnly
    ? parseScore(draft)
      ? draft
      : savedPrediction
    : savedPrediction;
  const isManual =
    match.homeTeamSource === "manual" || match.awayTeamSource === "manual";
  const accent =
    variant === "admin" ? "emerald" : variant === "prediction" ? "cyan" : "slate";

  const titleAccent =
    variant === "admin"
      ? "text-emerald-200"
      : variant === "prediction"
        ? "text-cyan-200"
        : "text-slate-300";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-md"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bracket-modal-title"
        className="relative z-10 flex max-h-[94dvh] w-full max-w-lg flex-col overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0a1018] shadow-2xl shadow-black/60 sm:max-h-[90dvh] sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                id="bracket-modal-title"
                className={`fc-display text-xs uppercase tracking-[0.24em] ${titleAccent}`}
              >
                {bracketStageLabel(match.id, match.stage)}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {kickoff
                  ? `${getKickoffDateLabelArgentina(match) ?? match.date} · ${closeLabel ?? match.time} (Argentina)`
                  : `${match.date} · ${match.time}`}
              </p>
              <p className="mt-0.5 text-[0.7rem] text-slate-500">
                {kickoff ? `${formatDateTimeArgentina(kickoff)} · ` : ""}
                {match.venue}
                {match.city ? `, ${match.city}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="fc-display shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.16em] text-slate-300 transition hover:bg-white/[0.08]"
            >
              Cerrar
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {isManual ? (
              <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2.5 py-0.5 text-[0.65rem] uppercase tracking-[0.14em] text-amber-100">
                Clasificación manual
              </span>
            ) : null}
            {variant === "admin" ? (
              hasOfficialResult ? (
                <StatusChip tone="emerald" label="Resultado cargado" />
              ) : (
                <StatusChip tone="slate" label="Sin resultado" />
              )
            ) : null}
            {variant === "prediction" ? (
              <StatusChip
                tone={isDirty ? "amber" : isPredictionSaved ? "emerald" : "cyan"}
                label={
                  isDirty
                    ? "Cambios sin guardar"
                    : isPredictionSaved
                      ? "Predicción guardada"
                      : "Predicción pendiente"
                }
              />
            ) : null}
            {readOnly && lockMessage ? (
              <StatusChip tone="amber" label="Predicción cerrada" />
            ) : null}
          </div>

          {readOnly && lockMessage ? (
            <p
              className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300/30 bg-amber-300/[0.08] px-3 py-2.5 text-sm text-amber-100"
              role="status"
            >
              <span aria-hidden className="mt-0.5 shrink-0">🔒</span>
              <span>{lockMessage}</span>
            </p>
          ) : null}
        </header>

        <div className="px-5 py-5 sm:px-6 sm:py-6">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
            <TeamScoreBlock
              name={match.homeTeam}
              value={readOnly ? displayPrediction?.home ?? result?.home : draft.home}
              isWinner={homeIsWinner}
              manual={match.homeTeamSource === "manual"}
              readOnly={readOnly}
              accent={accent}
              onChange={(value) => onDraftChange("home", value)}
            />
            <span className="fc-display text-2xl text-slate-500">:</span>
            <TeamScoreBlock
              name={match.awayTeam}
              value={readOnly ? displayPrediction?.away ?? result?.away : draft.away}
              isWinner={awayIsWinner}
              manual={match.awayTeamSource === "manual"}
              readOnly={readOnly}
              accent={accent}
              alignRight
              onChange={(value) => onDraftChange("away", value)}
            />
          </div>

          {variant !== "admin" && parseScore(displayPrediction) ? (
            <p className="mt-4 text-center text-sm text-slate-400">
              Tu predicción:{" "}
              <span className="fc-display tabular-nums text-cyan-100">
                {displayPrediction?.home}–{displayPrediction?.away}
              </span>
              {!isPredictionSaved && variant === "prediction" ? (
                <span className="text-amber-200"> · sin guardar</span>
              ) : null}
            </p>
          ) : null}

          {parsedResult ? (
            <p className="mt-3 text-center text-sm text-slate-400">
              Resultado oficial:{" "}
              <span className="fc-display tabular-nums text-emerald-100">
                {parsedResult.home}–{parsedResult.away}
              </span>
            </p>
          ) : null}

          {hasOfficialResult && points !== null ? (
            <p className="mt-3 text-center">
              <span
                className={`fc-display inline-flex rounded-full px-3 py-1 text-[0.7rem] uppercase tracking-[0.14em] ${
                  points === 3
                    ? "border border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
                    : points === 1
                      ? "border border-amber-300/40 bg-amber-300/10 text-amber-100"
                      : "border border-slate-500/40 bg-slate-500/10 text-slate-300"
                }`}
              >
                {points} puntos
              </span>
            </p>
          ) : null}

          {canRevealPredictions || adminPreviewPredictions ? (
            <div className="mt-5 border-t border-white/[0.06] pt-4">
              <MatchPredictionsReveal
                matchId={match.id}
                revealed={canRevealPredictions}
                adminPreview={adminPreviewPredictions}
                homeTeam={match.homeTeam}
                awayTeam={match.awayTeam}
              />
            </div>
          ) : null}
        </div>

        <footer className="mt-auto border-t border-white/[0.06] px-5 py-4 sm:px-6">
          {saveError ? (
            <p className="mb-3 text-sm text-red-300" role="alert">
              {saveError}
            </p>
          ) : null}

          {readOnly ? (
            <button
              type="button"
              onClick={onClose}
              className="fc-display w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm uppercase tracking-[0.16em] text-slate-200 transition hover:bg-white/[0.08]"
            >
              Cerrar
            </button>
          ) : (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="fc-display w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm uppercase tracking-[0.16em] text-slate-200 transition hover:bg-white/[0.08] disabled:opacity-50 sm:w-auto"
              >
                {variant === "admin" ? "Cancelar" : "Cerrar"}
              </button>
              {variant === "admin" && hasOfficialResult && onDelete ? (
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={saving}
                  className="fc-display w-full rounded-xl border border-red-300/30 bg-red-300/10 px-4 py-3 text-sm uppercase tracking-[0.16em] text-red-100 transition hover:bg-red-300/15 disabled:opacity-50 sm:w-auto"
                >
                  Borrar
                </button>
              ) : null}
              <button
                type="button"
                onClick={onSave}
                disabled={!canSave}
                className={`fc-display w-full rounded-xl px-4 py-3 text-sm uppercase tracking-[0.16em] text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${
                  variant === "admin"
                    ? "bg-emerald-300 hover:bg-emerald-200"
                    : "bg-cyan-300 hover:bg-cyan-200"
                }`}
              >
                {saving
                  ? "Guardando…"
                  : variant === "admin"
                    ? hasOfficialResult
                      ? "Actualizar resultado"
                      : "Guardar resultado"
                    : isDirty
                      ? "Guardar predicción"
                      : isPredictionSaved
                        ? "Predicción guardada"
                        : "Guardar predicción"}
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}

function StatusChip({
  tone,
  label,
}: {
  tone: "emerald" | "cyan" | "amber" | "slate";
  label: string;
}) {
  const styles = {
    emerald: "border-emerald-300/40 bg-emerald-300/10 text-emerald-100",
    cyan: "border-cyan-300/40 bg-cyan-300/10 text-cyan-100",
    amber: "border-amber-300/40 bg-amber-300/10 text-amber-100",
    slate: "border-slate-500/40 bg-slate-500/10 text-slate-300",
  }[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.65rem] uppercase tracking-[0.14em] ${styles}`}
    >
      {label}
    </span>
  );
}

type TeamScoreBlockProps = {
  name: string;
  value: string | undefined;
  isWinner: boolean;
  manual: boolean;
  readOnly: boolean;
  accent: "emerald" | "cyan" | "slate";
  alignRight?: boolean;
  onChange: (value: string) => void;
};

function TeamScoreBlock({
  name,
  value,
  isWinner,
  manual,
  readOnly,
  accent,
  alignRight = false,
  onChange,
}: TeamScoreBlockProps) {
  const focusRing =
    accent === "emerald"
      ? "focus:border-emerald-300 focus:ring-emerald-300/20"
      : accent === "cyan"
        ? "focus:border-cyan-300 focus:ring-cyan-300/20"
        : "focus:border-slate-400 focus:ring-slate-400/20";

  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-2xl border px-3 py-4 transition ${
        isWinner
          ? "border-emerald-300/40 bg-emerald-300/[0.08]"
          : "border-white/[0.06] bg-slate-950/50"
      } ${alignRight ? "text-right" : "text-left"}`}
    >
      <CountryWithFlag
        name={name}
        size={64}
        variant="stack"
        nameClassName="text-[0.75rem] uppercase tracking-[0.06em]"
      />
      {manual ? (
        <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.12em] text-amber-100">
          Manual
        </span>
      ) : null}
      {readOnly ? (
        <span className="fc-display text-4xl tabular-nums text-white sm:text-5xl">
          {value && value !== "" ? value : "—"}
        </span>
      ) : (
        <input
          type="number"
          min={0}
          max={20}
          inputMode="numeric"
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          className={`fc-display h-16 w-20 rounded-xl border border-white/10 bg-slate-950 px-2 text-center text-4xl tabular-nums text-white outline-none transition focus:ring-2 sm:h-[4.5rem] sm:w-24 sm:text-5xl ${focusRing}`}
          placeholder="—"
          aria-label={`Goles de ${name}`}
        />
      )}
    </div>
  );
}
