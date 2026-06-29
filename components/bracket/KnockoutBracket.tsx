"use client";

import { useState, type ReactNode } from "react";
import type { Match } from "@/data/matches";
import { BracketMatch } from "@/components/bracket/BracketMatch";
import { BracketMatchModal } from "@/components/bracket/BracketMatchModal";
import { BracketConnector } from "@/components/bracket/BracketConnector";
import { BracketTrophy } from "@/components/bracket/BracketTrophy";
import { MobileKnockoutRounds } from "@/components/bracket/MobileKnockoutRounds";
import { useBracketModal } from "@/hooks/useBracketModal";
import type { ResultsByMatch, ScoreInput } from "@/lib/prode";
import type { BracketLayout, BracketMode } from "@/types/bracket";
import type { PredictionLock } from "@/lib/matchTime";
import type { SaveResultMeta } from "@/hooks/useBracketModal";

type Props = {
  bracket: BracketLayout;
  results: ResultsByMatch;
  predictions: Record<string, ScoreInput>;
  dbPredictions?: Record<string, ScoreInput>;
  savedPredictions: Record<string, boolean>;
  mode: BracketMode;
  canPredict?: boolean;
  getPredictionLock?: (match: Match) => PredictionLock;
  onSaveResult?: (
    matchId: string,
    score: ScoreInput,
    meta?: SaveResultMeta,
  ) => Promise<boolean> | void;
  onDeleteResult?: (matchId: string) => Promise<void> | void;
  onPredictionChange?: (matchId: string, side: keyof ScoreInput, value: string) => void;
  onSavePrediction?: (matchId: string) => Promise<boolean> | boolean | void;
};

export function KnockoutBracket({
  bracket,
  results,
  predictions,
  dbPredictions,
  savedPredictions,
  mode,
  canPredict = false,
  getPredictionLock,
  onSaveResult,
  onDeleteResult,
  onPredictionChange,
  onSavePrediction,
}: Props) {
  const [showFullBracketMobile, setShowFullBracketMobile] = useState(false);

  const bracketModal = useBracketModal({
    mode,
    results,
    predictions,
    dbPredictions,
    savedPredictions,
    canPredict,
    getPredictionLock,
    onSaveResult,
    onDeleteResult,
    onPredictionChange,
    onSavePrediction,
  });

  const renderMatch = (match: Match, highlight = false) => (
    <BracketMatch
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
      highlight={highlight}
      onSaveResult={onSaveResult}
      onDeleteResult={onDeleteResult}
      onMatchOpen={() => bracketModal.open(match)}
      onPredictionChange={onPredictionChange}
      onSavePrediction={onSavePrediction}
    />
  );

  const treeProps: BracketTreeInnerProps = {
    bracket,
    results,
    predictions,
    dbPredictions,
    savedPredictions,
    mode,
    canPredict,
    getPredictionLock,
    onSaveResult,
    onDeleteResult,
    onMatchOpen: (match) => bracketModal.open(match),
    onPredictionChange,
    onSavePrediction,
    renderMatch,
  };

  return (
    <>
      <div className="lg:hidden">
        {showFullBracketMobile ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowFullBracketMobile(false)}
              className="fc-display rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-[0.62rem] uppercase tracking-[0.14em] text-slate-200 transition-colors hover:border-[var(--fc-lime)]/35 hover:bg-[var(--fc-lime)]/[0.08] hover:text-white"
            >
              ← Volver a rondas
            </button>
            <HorizontalBracketScroll>
              <BracketTreeContent {...treeProps} />
            </HorizontalBracketScroll>
          </div>
        ) : (
          <MobileKnockoutRounds
            bracket={bracket}
            results={results}
            predictions={predictions}
            dbPredictions={dbPredictions}
            savedPredictions={savedPredictions}
            mode={mode}
            canPredict={canPredict}
            getPredictionLock={getPredictionLock}
            onMatchOpen={(match) => bracketModal.open(match)}
            onShowFullBracket={() => setShowFullBracketMobile(true)}
          />
        )}
      </div>

      <div className="hidden overflow-x-auto pb-6 lg:block">
        <BracketTreeContent {...treeProps} />
      </div>

      <BracketMatchModal
        variant={bracketModal.variant}
        match={bracketModal.activeMatch}
        draft={bracketModal.draft}
        result={bracketModal.activeResult}
        savedPrediction={bracketModal.activeDbPrediction}
        allResults={results}
        isOpen={bracketModal.isOpen}
        saving={bracketModal.saving}
        canSave={bracketModal.canSave}
        hasOfficialResult={bracketModal.hasOfficialResult}
        isPredictionSaved={bracketModal.isPredictionSaved}
        isDirty={bracketModal.isDirty}
        lockMessage={bracketModal.lockMessage}
        saveError={bracketModal.saveError}
        points={bracketModal.points}
        showPenaltyPicker={bracketModal.showPenaltyPicker}
        needsSavedPenaltyAlert={bracketModal.needsSavedPenaltyAlert}
        penaltyWinner={bracketModal.penaltyWinner}
        onPenaltyWinnerChange={bracketModal.updatePenaltyWinner}
        canRevealPredictions={bracketModal.canRevealPredictions}
        adminPreviewPredictions={mode === "admin"}
        onClose={bracketModal.close}
        onDraftChange={bracketModal.updateDraft}
        onSave={() => void bracketModal.save()}
        onDelete={
          mode === "admin" && onDeleteResult
            ? () => void bracketModal.deleteResult()
            : undefined
        }
      />
    </>
  );
}

type BracketTreeInnerProps = {
  bracket: BracketLayout;
  results: ResultsByMatch;
  predictions: Record<string, ScoreInput>;
  dbPredictions?: Record<string, ScoreInput>;
  savedPredictions: Record<string, boolean>;
  mode: BracketMode;
  canPredict: boolean;
  getPredictionLock?: (match: Match) => PredictionLock;
  onSaveResult?: (
    matchId: string,
    score: ScoreInput,
    meta?: SaveResultMeta,
  ) => Promise<boolean> | void;
  onDeleteResult?: (matchId: string) => Promise<void> | void;
  onMatchOpen: (match: Match) => void;
  onPredictionChange?: (matchId: string, side: keyof ScoreInput, value: string) => void;
  onSavePrediction?: (matchId: string) => Promise<boolean> | boolean | void;
  renderMatch: (match: Match, highlight?: boolean) => ReactNode;
};

function BracketTreeContent({
  bracket,
  results,
  predictions,
  dbPredictions,
  savedPredictions,
  mode,
  canPredict,
  getPredictionLock,
  onSaveResult,
  onDeleteResult,
  onMatchOpen,
  onPredictionChange,
  onSavePrediction,
  renderMatch,
}: BracketTreeInnerProps) {
  return (
    <div className="flex min-w-[1700px] items-stretch gap-1 px-2 lg:min-w-[1800px]">
      <RoundColumn label="16avos">
        {bracket.left.r32.map((match) => renderMatch(match))}
      </RoundColumn>
      <BracketConnector pairs={4} side="left" />
      <RoundColumn label="Octavos">
        {bracket.left.octavos.map((match) => renderMatch(match))}
      </RoundColumn>
      <BracketConnector pairs={2} side="left" />
      <RoundColumn label="Cuartos">
        {bracket.left.cuartos.map((match) => renderMatch(match))}
      </RoundColumn>
      <BracketConnector pairs={1} side="left" />
      <RoundColumn label="Semifinal">
        {renderMatch(bracket.left.semifinal)}
      </RoundColumn>

      <BracketTrophy
        finalMatch={bracket.final}
        thirdPlaceMatch={bracket.tercerPuesto}
        results={results}
        predictions={predictions}
        dbPredictions={dbPredictions}
        savedPredictions={savedPredictions}
        mode={mode}
        canPredict={canPredict}
        getPredictionLock={getPredictionLock}
        onSaveResult={onSaveResult}
        onDeleteResult={onDeleteResult}
        onMatchOpen={onMatchOpen}
        onPredictionChange={onPredictionChange}
        onSavePrediction={onSavePrediction}
      />

      <RoundColumn label="Semifinal">
        {renderMatch(bracket.right.semifinal)}
      </RoundColumn>
      <BracketConnector pairs={1} side="right" />
      <RoundColumn label="Cuartos">
        {bracket.right.cuartos.map((match) => renderMatch(match))}
      </RoundColumn>
      <BracketConnector pairs={2} side="right" />
      <RoundColumn label="Octavos">
        {bracket.right.octavos.map((match) => renderMatch(match))}
      </RoundColumn>
      <BracketConnector pairs={4} side="right" />
      <RoundColumn label="16avos">
        {bracket.right.r32.map((match) => renderMatch(match))}
      </RoundColumn>
    </div>
  );
}

function HorizontalBracketScroll({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <p className="fc-display mb-2 flex items-center gap-2 text-[0.62rem] uppercase tracking-[0.14em] text-slate-400">
        <span className="inline-block animate-pulse text-[var(--fc-lime)]">→</span>
        Deslizá para ver las próximas rondas
      </p>
      <div className="overflow-x-auto pb-6">
        {children}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-6 right-0 w-14 bg-gradient-to-l from-[#070b13] via-[#070b13]/80 to-transparent"
      />
    </div>
  );
}

function RoundColumn({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[920px] flex-col">
      <p className="fc-broadcast-cut-sm fc-display-italic mb-3 inline-flex items-center justify-center self-center gap-2 border border-[var(--fc-lime)]/30 bg-[var(--fc-lime)]/[0.08] px-4 py-1.5 text-center text-[0.66rem] uppercase tracking-[0.22em] text-[var(--fc-lime)]">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--fc-lime)] fc-pulse-dot-lime" />
        {label}
      </p>
      <div className="flex flex-1 flex-col">
        {Array.isArray(children) ? (
          children.map((child, index) => (
            <div key={index} className="flex flex-1 flex-col items-center justify-center">
              {child}
            </div>
          ))
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
