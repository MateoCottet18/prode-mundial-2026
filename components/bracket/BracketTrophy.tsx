"use client";

import Image from "next/image";
import type { Match } from "@/data/matches";
import { CountryWithFlag } from "@/components/CountryWithFlag";
import type { ResultsByMatch, ScoreInput } from "@/lib/prode";
import { getMatchWinner } from "@/lib/standings";
import { BracketMatch } from "@/components/bracket/BracketMatch";
import type { BracketMode } from "@/types/bracket";

type Props = {
  finalMatch: Match;
  thirdPlaceMatch: Match;
  results: ResultsByMatch;
  predictions: Record<string, ScoreInput>;
  savedPredictions: Record<string, boolean>;
  mode: BracketMode;
  canPredict?: boolean;
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
  savedPredictions,
  mode,
  canPredict = false,
  onSaveResult,
  onDeleteResult,
  onPredictionChange,
  onSavePrediction,
}: Props) {
  const champion = getMatchWinner(finalMatch, results);
  const third = getMatchWinner(thirdPlaceMatch, results);

  return (
    <div className="flex w-[260px] shrink-0 flex-col items-center justify-center gap-4 px-2">
      <div
        className="fc-broadcast-cut relative flex flex-col items-center gap-2 overflow-hidden border border-[var(--fc-yellow)]/40 bg-black p-5 text-center"
        style={{
          boxShadow:
            "inset 0 0 0 1px rgba(255,216,77,0.18), 0 28px 80px -22px rgba(255,216,77,0.4)",
        }}
      >
        {/* Halftone overlay (encima del negro, detrás de la copa) */}
        <div aria-hidden className="pointer-events-none absolute inset-0 fc-halftone opacity-25" />
        {/* FIFA flag-stripe arriba */}
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
            className="h-auto w-[180px] drop-shadow-[0_0_28px_rgba(255,216,77,0.45)]"
          />
        </div>

        <p className="fc-display-italic relative z-10 text-[0.7rem] uppercase tracking-[0.32em] text-[var(--fc-yellow)]">
          Campeón
        </p>
        {champion ? (
          <p className="fc-display-italic relative z-10 flex items-center justify-center gap-2 text-lg uppercase tracking-[0.04em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
            <CountryWithFlag name={champion} size={28} />
          </p>
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
        isPredictionSaved={Boolean(savedPredictions[finalMatch.id])}
        mode={mode}
        canPredict={canPredict}
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
          isPredictionSaved={Boolean(savedPredictions[thirdPlaceMatch.id])}
          mode={mode}
          canPredict={canPredict}
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
