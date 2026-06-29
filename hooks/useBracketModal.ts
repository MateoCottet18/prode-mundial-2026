"use client";

import { useCallback, useEffect, useState } from "react";
import type { Match } from "@/data/matches";
import {
  isKnockoutMatch,
  resolveResultMeta,
} from "@/lib/knockoutResult";
import type { PredictionLock } from "@/lib/matchTime";
import {
  calculatePoints,
  emptyScore,
  parseScore,
  type MatchResult,
  type ResultsByMatch,
  type ScoreInput,
} from "@/lib/prode";
import type { BracketMode } from "@/types/bracket";

export type BracketModalVariant = "admin" | "prediction" | "readonly";

export type SaveResultMeta = Pick<MatchResult, "winnerTeam" | "decidedBy">;

function scoresEqual(a?: ScoreInput, b?: ScoreInput) {
  return (a?.home ?? "") === (b?.home ?? "") && (a?.away ?? "") === (b?.away ?? "");
}

type UseBracketModalOptions = {
  mode: BracketMode;
  results: ResultsByMatch;
  predictions?: Record<string, ScoreInput>;
  dbPredictions?: Record<string, ScoreInput>;
  savedPredictions?: Record<string, boolean>;
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

export function useBracketModal({
  mode,
  results,
  predictions = {},
  dbPredictions = {},
  savedPredictions = {},
  canPredict = false,
  getPredictionLock,
  onSaveResult,
  onDeleteResult,
  onPredictionChange,
  onSavePrediction,
}: UseBracketModalOptions) {
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [variant, setVariant] = useState<BracketModalVariant>("readonly");
  const [draft, setDraft] = useState<ScoreInput>(emptyScore);
  const [penaltyWinner, setPenaltyWinner] = useState<string | null>(null);
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const resolveVariant = useCallback(
    (match: Match): { variant: BracketModalVariant; lockMessage: string | null } => {
      if (mode === "admin") {
        return { variant: "admin", lockMessage: null };
      }
      if (!canPredict) {
        return { variant: "readonly", lockMessage: null };
      }
      const lock = getPredictionLock?.(match);
      if (lock?.locked) {
        return { variant: "readonly", lockMessage: lock.message };
      }
      return { variant: "prediction", lockMessage: null };
    },
    [mode, canPredict, getPredictionLock],
  );

  const initialDraftFor = useCallback(
    (match: Match, nextVariant: BracketModalVariant): ScoreInput => {
      if (nextVariant === "admin") {
        return results[match.id] ?? emptyScore;
      }
      return (
        predictions[match.id] ??
        dbPredictions[match.id] ??
        emptyScore
      );
    },
    [results, predictions, dbPredictions],
  );

  const open = useCallback(
    (match: Match) => {
      const resolved = resolveVariant(match);
      setActiveMatch(match);
      setVariant(resolved.variant);
      setLockMessage(resolved.lockMessage);
      setDraft(initialDraftFor(match, resolved.variant));
      setPenaltyWinner(results[match.id]?.winnerTeam ?? null);
      setSaveError(null);
    },
    [resolveVariant, initialDraftFor, results],
  );

  const close = useCallback(() => {
    setActiveMatch(null);
    setDraft(emptyScore);
    setPenaltyWinner(null);
    setLockMessage(null);
    setSaveError(null);
  }, []);

  const updateDraft = useCallback(
    (side: keyof ScoreInput, value: string) => {
      setDraft((current) => {
        const next = { ...current, [side]: value };
        if (variant === "prediction" && activeMatch) {
          onPredictionChange?.(activeMatch.id, side, value);
        }
        return next;
      });
      setSaveError(null);
    },
    [variant, activeMatch, onPredictionChange],
  );

  const updatePenaltyWinner = useCallback((team: string) => {
    setPenaltyWinner(team);
    setSaveError(null);
  }, []);

  const save = useCallback(async () => {
    if (!activeMatch) return;

    if (variant === "admin") {
      if (!onSaveResult || !parseScore(draft)) return;

      const resolvedMeta = resolveResultMeta(activeMatch, draft, penaltyWinner);
      if (!resolvedMeta.ok) {
        setSaveError(resolvedMeta.error);
        return;
      }

      setSaving(true);
      setSaveError(null);
      try {
        const ok = await onSaveResult(activeMatch.id, draft, resolvedMeta.meta);
        if (ok !== false) close();
      } finally {
        setSaving(false);
      }
      return;
    }

    if (variant === "prediction") {
      if (!onSavePrediction || !parseScore(draft)) return;
      setSaving(true);
      setSaveError(null);
      try {
        const ok = await onSavePrediction(activeMatch.id);
        if (ok === false) {
          setSaveError("No se pudo guardar. Revisá tu sesión o intentá de nuevo.");
        } else {
          close();
        }
      } finally {
        setSaving(false);
      }
    }
  }, [activeMatch, variant, draft, penaltyWinner, onSaveResult, onSavePrediction, close]);

  const deleteResult = useCallback(async () => {
    if (!activeMatch || !onDeleteResult) return;
    setSaving(true);
    try {
      await onDeleteResult(activeMatch.id);
      close();
    } finally {
      setSaving(false);
    }
  }, [activeMatch, onDeleteResult, close]);

  useEffect(() => {
    if (!activeMatch) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeMatch, close]);

  const activeResult = activeMatch ? results[activeMatch.id] : undefined;
  const activeDbPrediction = activeMatch ? dbPredictions[activeMatch.id] : undefined;
  const isPredictionSaved = activeMatch
    ? Boolean(savedPredictions[activeMatch.id])
    : false;
  const draftValid = Boolean(parseScore(draft));
  const parsedDraft = parseScore(draft);
  const hasOfficialResult = Boolean(parseScore(activeResult));
  const isKnockout = activeMatch ? isKnockoutMatch(activeMatch) : false;
  const isDraftTie = Boolean(parsedDraft && parsedDraft.home === parsedDraft.away);
  const showPenaltyPicker = variant === "admin" && isKnockout && isDraftTie;
  const needsSavedPenaltyAlert =
    variant === "admin" &&
    isKnockout &&
    hasOfficialResult &&
    Boolean(parsedDraft && parsedDraft.home === parsedDraft.away) &&
    !activeResult?.winnerTeam;

  const isDirty =
    variant === "prediction" &&
    isPredictionSaved &&
    !scoresEqual(draft, activeDbPrediction);
  const adminDraftDiffers =
    variant === "admin" &&
    (draft.home !== (activeResult?.home ?? "") ||
      draft.away !== (activeResult?.away ?? "") ||
      penaltyWinner !== (activeResult?.winnerTeam ?? null));

  const points =
    activeMatch && variant !== "admin"
      ? calculatePoints(
          activeDbPrediction ?? (isPredictionSaved ? draft : undefined),
          activeResult,
          isPredictionSaved,
        )
      : null;

  const penaltyResolved = !showPenaltyPicker || Boolean(penaltyWinner);

  const canSave =
    variant === "admin"
      ? draftValid && penaltyResolved && adminDraftDiffers && !saving
      : variant === "prediction"
        ? draftValid && !saving && (isDirty || !isPredictionSaved)
        : false;

  const canRevealPredictions =
    variant === "readonly" && canPredict && Boolean(lockMessage);

  return {
    activeMatch,
    variant,
    draft,
    penaltyWinner,
    showPenaltyPicker,
    needsSavedPenaltyAlert,
    lockMessage,
    saveError,
    updateDraft,
    updatePenaltyWinner,
    open,
    close,
    save,
    deleteResult,
    saving,
    draftValid,
    hasOfficialResult,
    isPredictionSaved,
    isDirty,
    canSave,
    canRevealPredictions,
    activeResult,
    activeDbPrediction,
    points,
    isOpen: activeMatch !== null,
  };
}
