"use client";

import { useEffect, useState } from "react";
import {
  emptyScore,
  parseScore,
  type PredictionsByUser,
  type ResultsByMatch,
  type SavedPredictionsByUser,
  type ScoreInput,
} from "@/lib/prode";
import { migrateLegacyStorage, readStorage, storageKeys, writeStorage } from "@/lib/storage";

type PredictionsStorage = {
  predictions: PredictionsByUser;
  savedPredictions: SavedPredictionsByUser;
};

export function useProdeStore() {
  const [predictions, setPredictions] = useState<PredictionsByUser>({});
  const [savedPredictions, setSavedPredictions] = useState<SavedPredictionsByUser>({});
  const [results, setResults] = useState<ResultsByMatch>({});
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    migrateLegacyStorage();
    loadStoreFromStorage();
  }, []);

  const loadStoreFromStorage = () => {
    const storedPredictions = readStorage<PredictionsStorage>(storageKeys.predictions, {
      predictions: {},
      savedPredictions: {},
    });
    setPredictions(storedPredictions.predictions ?? {});
    setSavedPredictions(storedPredictions.savedPredictions ?? {});
    setResults(readStorage<ResultsByMatch>(storageKeys.results, {}));
    setIsReady(true);
  };

  useEffect(() => {
    const handleStoreChange = () => loadStoreFromStorage();

    window.addEventListener("prode-store-change", handleStoreChange);
    window.addEventListener("storage", handleStoreChange);

    return () => {
      window.removeEventListener("prode-store-change", handleStoreChange);
      window.removeEventListener("storage", handleStoreChange);
    };
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    writeStorage(storageKeys.predictions, { predictions, savedPredictions });
  }, [isReady, predictions, savedPredictions]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    writeStorage(storageKeys.results, results);
  }, [isReady, results]);

  const updatePrediction = (
    username: string,
    matchId: string,
    side: keyof ScoreInput,
    value: string,
  ) => {
    setPredictions((current) => ({
      ...current,
      [username]: {
        ...(current[username] ?? {}),
        [matchId]: {
          ...(current[username]?.[matchId] ?? emptyScore),
          [side]: value,
        },
      },
    }));

    setSavedPredictions((current) => ({
      ...current,
      [username]: {
        ...(current[username] ?? {}),
        [matchId]: false,
      },
    }));
  };

  const savePrediction = (username: string, matchId: string) => {
    if (!parseScore(predictions[username]?.[matchId])) {
      return false;
    }

    setSavedPredictions((current) => ({
      ...current,
      [username]: {
        ...(current[username] ?? {}),
        [matchId]: true,
      },
    }));

    return true;
  };

  const updateResult = (matchId: string, side: keyof ScoreInput, value: string) => {
    setResults((current) => ({
      ...current,
      [matchId]: {
        ...(current[matchId] ?? emptyScore),
        [side]: value,
      },
    }));
  };

  const saveResult = (matchId: string, score: ScoreInput) => {
    if (!parseScore(score)) {
      return false;
    }

    setResults((current) => ({
      ...current,
      [matchId]: score,
    }));

    return true;
  };

  const deleteResult = (matchId: string) => {
    setResults((current) => {
      const nextResults = { ...current };
      delete nextResults[matchId];
      return nextResults;
    });
  };

  const recalculatePoints = () => {
    setResults((current) => ({ ...current }));
  };

  return {
    isReady,
    predictions,
    savedPredictions,
    results,
    updatePrediction,
    savePrediction,
    updateResult,
    saveResult,
    deleteResult,
    recalculatePoints,
  };
}
