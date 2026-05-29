"use client";

import Image from "next/image";
import type { Match } from "@/data/matches";
import { CountryWithFlag } from "@/components/CountryWithFlag";
import type { ResultsByMatch, ScoreInput } from "@/lib/prode";
import { getMatchWinner } from "@/lib/standings";
import { BracketMatch } from "@/components/bracket/BracketMatch";
import type { BracketMode } from "@/types/bracket";
import type { PredictionLock } from "@/lib/matchTime";

type Props = {
  finalMatch: Match;
  thirdPlaceMatch: Match;
  results: ResultsByMatch;
  predictions: Record<string, ScoreInput>;
  dbPredictions?: Record<string, ScoreInput>;
  savedPredictions: Record<string, boolean>;
  mode: BracketMode;
  canPredict?: boolean;
  getPredictionLock?: (match: Match) => PredictionLock;
  onSaveResult?: (matchId: string, score: ScoreInput) => Promise<boolean> | void;
  onDeleteResult?: (matchId: string) => Promise<void> | void;
  onPredictionChange?: (matchId: string, side: keyof ScoreInput, value: string) => void;
  onSavePrediction?: (matchId: string) => Promise<boolean> | boolean | void;
};

/**
 * Columna central del bracket: copa + final + tercer puesto.
 *
 * - El campeón se infiere de `results[final.id]`. Si el resultado no está,
 *   muestra "Por definirse".
 * - Tercer puesto se renderiza más chiquito debajo del trofeo.
 */
export function BracketTrophy({
  finalMatch,
  thirdPlaceMatch,
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
  const champion = getMatchWinner(finalMatch, results);
  const third = getMatchWinner(thirdPlaceMatch, results);

  return (
    <div className="flex w-[260px] shrink-0 flex-col items-center justify-center gap-4 px-2">
      <div className="fc-broadcast-cut relative flex flex-col items-center gap-2 overflow-hidden border border-[var(--fc-yellow)]/30 bg-black p-5 text-center">
        <div aria-hidden className="absolute inset-x-4 top-0 h-[2px] fc-flag-stripe opacity-80" />

        {/*
          Imagen oficial de la Copa del Mundo. Trae fondo negro sólido y rayos
          dorados integrados; la card también tiene fondo negro para que se
          fundan visualmente y la copa parezca recortada con su halo natural.
        */}
        <div className="relative z-10 grid place-items-center">
          <Image
            src="/world-cup-trophy.png"
            alt="Copa del Mundo FIFA"
            width={200}
            height={200}
            priority
            className="h-auto w-[180px]"
          />
        </div>

        <p className="fc-display-italic relative z-10 text-[0.7rem] uppercase tracking-[0.32em] text-[var(--fc-yellow)]">
          Campeón
        </p>
        {champion ? (
          <div className="relative z-10 flex flex-col items-center gap-2">
            <CountryWithFlag
              name={champion}
              size={64}
              variant="stack"
              nameClassName="fc-display-italic text-base uppercase tracking-[0.04em] text-white"
            />
          </div>
        ) : (
          <p className="fc-display-italic relative z-10 text-sm uppercase tracking-[0.22em] text-slate-300">
            Por definirse
          </p>
        )}
      </div>

      <BracketMatch
        match={finalMatch}
        result={results[finalMatch.id]}
        prediction={predictions[finalMatch.id]}
        dbPrediction={dbPredictions?.[finalMatch.id]}
        isPredictionSaved={Boolean(savedPredictions[finalMatch.id])}
        mode={mode}
        canPredict={canPredict}
        predictionLock={getPredictionLock?.(finalMatch)}
        allResults={results}
        highlight
        onSaveResult={onSaveResult}
        onDeleteResult={onDeleteResult}
        onPredictionChange={onPredictionChange}
        onSavePrediction={onSavePrediction}
      />

      <div className="flex w-full flex-col items-center gap-1.5">
        <p className="fc-display-italic text-[0.65rem] uppercase tracking-[0.28em] text-[var(--fc-orange)]">
          Tercer puesto
        </p>
        <BracketMatch
          match={thirdPlaceMatch}
          result={results[thirdPlaceMatch.id]}
          prediction={predictions[thirdPlaceMatch.id]}
          dbPrediction={dbPredictions?.[thirdPlaceMatch.id]}
          isPredictionSaved={Boolean(savedPredictions[thirdPlaceMatch.id])}
          mode={mode}
          canPredict={canPredict}
          predictionLock={getPredictionLock?.(thirdPlaceMatch)}
          allResults={results}
          onSaveResult={onSaveResult}
          onDeleteResult={onDeleteResult}
          onPredictionChange={onPredictionChange}
          onSavePrediction={onSavePrediction}
        />
        {third ? (
          <p className="fc-chip fc-chip-yellow">
            <span aria-hidden>🥉</span> {third}
          </p>
        ) : null}
      </div>
    </div>
  );
}
