"use client";

import { type ReactNode } from "react";
import type { Match } from "@/data/matches";
import { BracketMatch } from "@/components/bracket/BracketMatch";
import { BracketMatchModal } from "@/components/bracket/BracketMatchModal";
import { BracketConnector } from "@/components/bracket/BracketConnector";
import { BracketTrophy } from "@/components/bracket/BracketTrophy";
import { useBracketModal } from "@/hooks/useBracketModal";
import type { ResultsByMatch, ScoreInput } from "@/lib/prode";
import type { BracketLayout, BracketMode } from "@/types/bracket";
import type { PredictionLock } from "@/lib/matchTime";

type Props = {
  bracket: BracketLayout;
  results: ResultsByMatch;
  /** Inputs locales del usuario (editable, "dirty" mientras escribe). */
  predictions: Record<string, ScoreInput>;
  /** Valores confirmados en Supabase (lectura/locked). Opcional. */
  dbPredictions?: Record<string, ScoreInput>;
  savedPredictions: Record<string, boolean>;
  mode: BracketMode;
  canPredict?: boolean;
  /**
   * Función que decide si la predicción está abierta para un match dado.
   * Si no se pasa, cada match queda abierto (compat con admin / vistas
   * históricas sin gating temporal).
   */
  getPredictionLock?: (match: Match) => PredictionLock;
  onSaveResult?: (matchId: string, score: ScoreInput) => Promise<boolean> | void;
  onDeleteResult?: (matchId: string) => Promise<void> | void;
  onPredictionChange?: (matchId: string, side: keyof ScoreInput, value: string) => void;
  onSavePrediction?: (matchId: string) => Promise<boolean> | boolean | void;
};

/**
 * Bracket eliminatorio con layout espejado y trofeo central.
 *
 * Estructura horizontal (de izquierda a derecha):
 *   r32-L → conn → 8-L → conn → 4-L → conn → semi-L → centro(final + 3°) →
 *   semi-R → conn → 4-R → conn → 8-R → conn → r32-R
 *
 * Mobile: el contenedor exterior tiene `overflow-x-auto`; el interior mantiene
 * un `min-w` para que el bracket no se aplaste y se navega con scroll lateral.
 */
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

  return (
    <>
      <div className="overflow-x-auto pb-6">
        <div className="flex min-w-[1700px] items-stretch gap-1 px-2 lg:min-w-[1800px]">
          {/* LEFT */}
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

          {/* CENTER */}
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
            onMatchOpen={(match) => bracketModal.open(match)}
            onPredictionChange={onPredictionChange}
            onSavePrediction={onSavePrediction}
          />

          {/* RIGHT (mirror) */}
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
        canRevealPredictions={bracketModal.canRevealPredictions}
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
