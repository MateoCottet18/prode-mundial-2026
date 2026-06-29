"use client";

import { useState } from "react";
import { CountryWithFlag } from "@/components/CountryWithFlag";
import { MatchPredictionsReveal } from "@/components/MatchPredictionsReveal";
import { bracketStageShortLabel } from "@/components/bracket/bracketLabels";
import type { Match } from "@/data/matches";
import {
  getAdvanceHint,
  getBracketBranch,
  getBranchLabel,
  getFeedLabels,
  getMatchesForRound,
  KNOCKOUT_ROUND_TABS,
  type KnockoutRoundTab,
} from "@/lib/bracket/bracketNavigation";
import { getPenaltyAdvanceLabel, needsPenaltyWinnerDefinition } from "@/lib/knockoutResult";
import {
  formatMobileKickoffArgentina,
  type PredictionLock,
} from "@/lib/matchTime";
import { calculatePoints, parseScore, type MatchResult, type ScoreInput } from "@/lib/prode";
import { getMatchWinner } from "@/lib/standings";
import type { BracketLayout, BracketMode } from "@/types/bracket";

type Props = {
  bracket: BracketLayout;
  results: Record<string, ScoreInput>;
  predictions: Record<string, ScoreInput>;
  dbPredictions?: Record<string, ScoreInput>;
  savedPredictions: Record<string, boolean>;
  mode: BracketMode;
  canPredict?: boolean;
  getPredictionLock?: (match: Match) => PredictionLock;
  onMatchOpen: (match: Match) => void;
  onShowFullBracket: () => void;
};

export function MobileKnockoutRounds({
  bracket,
  results,
  predictions,
  dbPredictions,
  savedPredictions,
  mode,
  canPredict = false,
  getPredictionLock,
  onMatchOpen,
  onShowFullBracket,
}: Props) {
  const [activeRound, setActiveRound] = useState<KnockoutRoundTab>("16avos");
  const matches = getMatchesForRound(bracket, activeRound);
  const roundLabel =
    KNOCKOUT_ROUND_TABS.find((tab) => tab.id === activeRound)?.label ?? activeRound;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="fc-display-italic text-[0.72rem] uppercase tracking-[0.22em] text-[var(--fc-lime)]">
          Fase eliminatoria
        </p>
        <button
          type="button"
          onClick={onShowFullBracket}
          className="fc-display shrink-0 rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-[0.62rem] uppercase tracking-[0.14em] text-slate-200 transition-colors hover:border-[var(--fc-lime)]/35 hover:bg-[var(--fc-lime)]/[0.08] hover:text-white"
        >
          Ver cuadro completo
        </button>
      </div>

      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        role="tablist"
        aria-label="Rondas eliminatorias"
      >
        {KNOCKOUT_ROUND_TABS.map((tab) => {
          const isActive = tab.id === activeRound;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveRound(tab.id)}
              className={`fc-broadcast-cut-sm fc-display-italic shrink-0 px-3.5 py-2 text-[0.72rem] uppercase tracking-[0.14em] transition-colors ${
                isActive
                  ? "bg-[var(--fc-lime)] text-slate-950"
                  : "border border-white/[0.08] bg-white/[0.02] text-slate-300 hover:border-[var(--fc-lime)]/30 hover:bg-[var(--fc-lime)]/[0.06] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" aria-label={roundLabel} className="space-y-3">
        <h3 className="fc-display-italic text-[0.78rem] uppercase tracking-[0.2em] text-slate-300">
          {roundLabel}
        </h3>

        {matches.map((match) => (
          <MobileBracketMatchCard
            key={match.id}
            match={match}
            result={results[match.id]}
            prediction={predictions[match.id]}
            dbPrediction={dbPredictions?.[match.id]}
            isPredictionSaved={Boolean(savedPredictions[match.id])}
            mode={mode}
            canPredict={canPredict}
            predictionLock={getPredictionLock?.(match)}
            allResults={results}
            onOpen={() => onMatchOpen(match)}
          />
        ))}
      </div>
    </div>
  );
}

type CardProps = {
  match: Match;
  result?: ScoreInput;
  prediction?: ScoreInput;
  dbPrediction?: ScoreInput;
  isPredictionSaved: boolean;
  mode: BracketMode;
  canPredict: boolean;
  predictionLock?: PredictionLock;
  allResults: Record<string, ScoreInput>;
  onOpen: () => void;
};

function MobileBracketMatchCard({
  match,
  result,
  prediction,
  dbPrediction,
  isPredictionSaved,
  mode,
  canPredict,
  predictionLock,
  allResults,
  onOpen,
}: CardProps) {
  const isAdmin = mode === "admin";
  const isLocked = predictionLock?.locked === true;
  const winner = getMatchWinner(match, allResults);
  const persistedPrediction = dbPrediction ?? (isPredictionSaved ? prediction : undefined);
  const points = calculatePoints(persistedPrediction, result, isPredictionSaved);
  const hasResult = Boolean(parseScore(result));
  const hasPrediction = Boolean(parseScore(persistedPrediction ?? prediction));
  const branch = getBracketBranch(match.id);
  const branchLabel = getBranchLabel(branch);
  const feedLabels = getFeedLabels(match.id);
  const advanceHint = getAdvanceHint(match.id);
  const kickoffLabel = formatMobileKickoffArgentina(match);
  const storedResult = result as MatchResult | undefined;
  const penaltyLabel = getPenaltyAdvanceLabel(match, storedResult);
  const missingPenaltyWinner = needsPenaltyWinnerDefinition(match, storedResult);

  const ctaLabel = isAdmin
    ? hasResult
      ? "Ver / editar resultado"
      : "Cargar resultado"
    : canPredict && !isLocked
      ? hasPrediction
        ? "Ver / editar predicción"
        : "Cargar predicción"
      : "Ver detalle";

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      aria-label={`${match.homeTeam} vs ${match.awayTeam}. ${ctaLabel}`}
      className="group w-full cursor-pointer rounded-xl border border-white/[0.08] bg-[#0a1018] p-4 transition-colors hover:border-emerald-300/40 hover:bg-[#0c1418] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300/60"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="fc-display text-[0.62rem] uppercase tracking-[0.16em] text-slate-400">
          {bracketStageShortLabel(match.id, match.stage)} · {match.id}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {branchLabel ? (
            <span className="rounded-full border border-slate-500/35 bg-slate-500/10 px-2 py-0.5 text-[0.58rem] uppercase tracking-[0.12em] text-slate-300">
              {branchLabel}
            </span>
          ) : null}
          {hasResult ? (
            <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-2 py-0.5 text-[0.58rem] uppercase tracking-[0.12em] text-emerald-100">
              Final
            </span>
          ) : (
            <span className="rounded-full border border-slate-500/40 bg-slate-500/10 px-2 py-0.5 text-[0.58rem] uppercase tracking-[0.12em] text-slate-300">
              Pendiente
            </span>
          )}
          {missingPenaltyWinner ? (
            <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-0.5 text-[0.58rem] uppercase tracking-[0.12em] text-amber-100">
              Falta penales
            </span>
          ) : null}
        </div>
      </div>

      {feedLabels.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {feedLabels.map((label) => (
            <span
              key={label}
              className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[0.58rem] text-slate-400"
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        <TeamLine
          name={match.homeTeam}
          score={
            isAdmin
              ? result?.home
              : persistedPrediction?.home ?? prediction?.home ?? result?.home
          }
          isWinner={winner === match.homeTeam}
        />
        <p className="fc-display text-center text-[0.58rem] uppercase tracking-[0.2em] text-slate-500">
          vs
        </p>
        <TeamLine
          name={match.awayTeam}
          score={
            isAdmin
              ? result?.away
              : persistedPrediction?.away ?? prediction?.away ?? result?.away
          }
          isWinner={winner === match.awayTeam}
        />
      </div>

      <p className="fc-display-italic mt-3 text-[0.65rem] uppercase tracking-[0.14em] text-slate-400">
        {kickoffLabel}
      </p>

      {penaltyLabel ? (
        <p className="mt-1 text-[0.62rem] text-[var(--fc-lime)]">{penaltyLabel}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span
          className={`fc-display text-[0.62rem] uppercase tracking-[0.14em] ${
            isAdmin
              ? "text-emerald-200/80 group-hover:text-emerald-100"
              : canPredict && !isLocked
                ? "text-cyan-200/80 group-hover:text-cyan-100"
                : "text-slate-400 group-hover:text-slate-200"
          }`}
        >
          {ctaLabel}
        </span>
        {hasResult && points !== null && !isAdmin ? (
          <span
            className={`rounded-full px-2 py-0.5 text-[0.58rem] uppercase tracking-[0.12em] ${
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

      {advanceHint ? (
        <p className="mt-2 border-t border-white/[0.06] pt-2 text-[0.58rem] uppercase tracking-[0.12em] text-[var(--fc-lime)]/80">
          {advanceHint}
        </p>
      ) : null}

      {isAdmin ? (
        <div
          className="mt-2"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <MatchPredictionsReveal
            matchId={match.id}
            revealed={false}
            adminPreview
            homeTeam={match.homeTeam}
            awayTeam={match.awayTeam}
            compact
          />
        </div>
      ) : canPredict ? (
        <div
          className="mt-2"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <MatchPredictionsReveal
            matchId={match.id}
            revealed={isLocked}
            homeTeam={match.homeTeam}
            awayTeam={match.awayTeam}
            compact
          />
        </div>
      ) : null}
    </article>
  );
}

function TeamLine({
  name,
  score,
  isWinner,
}: {
  name: string;
  score?: string;
  isWinner: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 ${
        isWinner
          ? "bg-emerald-300/12 ring-1 ring-emerald-300/35"
          : "bg-white/[0.025]"
      }`}
    >
      <CountryWithFlag name={name} size={28} truncate />
      <span
        className={`fc-display min-w-[1.25rem] text-right text-lg tabular-nums ${
          isWinner ? "text-emerald-100" : "text-slate-200"
        }`}
      >
        {score && score !== "" ? score : "—"}
      </span>
    </div>
  );
}
