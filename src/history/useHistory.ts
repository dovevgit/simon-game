import { useCallback, useRef, useState } from 'react';
import {
  addResult,
  clearHistory,
  createResult,
  loadHistory,
  saveHistory,
  type GameOutcome,
  type GameResult,
} from './historyStorage.ts';

type InitialHistory = { results: GameResult[]; loadError: boolean };

function readInitialHistory(): InitialHistory {
  const loaded = loadHistory();
  return loaded.ok ? { results: loaded.results, loadError: false } : { results: [], loadError: true };
}

export function useHistory() {
  const [initial] = useState(readInitialHistory);
  const [results, setResults] = useState(initial.results);
  const [loadError, setLoadError] = useState(initial.loadError);
  const [saveError, setSaveError] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  // Latest list, so storage writes happen outside state updaters (Strict Mode runs those twice).
  const resultsRef = useRef(initial.results);

  const record = useCallback((outcome: GameOutcome, completedRounds: number) => {
    const next = addResult(resultsRef.current, createResult(outcome, completedRounds));
    resultsRef.current = next;
    // Shown until the next refresh even if it could not be stored.
    setResults(next);
    const saved = saveHistory(next);
    setSaveError(!saved);
    if (saved) setLoadError(false);
  }, []);

  const clear = useCallback(() => {
    if (!clearHistory()) {
      // Never look as if it was deleted.
      setDeleteError(true);
      return;
    }
    resultsRef.current = [];
    setResults([]);
    setLoadError(false);
    setDeleteError(false);
  }, []);

  const dismissDeleteError = useCallback(() => setDeleteError(false), []);

  return { results, loadError, saveError, deleteError, record, clear, dismissDeleteError };
}

export type HistoryView = ReturnType<typeof useHistory>;
