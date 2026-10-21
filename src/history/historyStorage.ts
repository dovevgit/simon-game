import { TOTAL_ROUNDS } from '../game/constants.ts';

export type GameOutcome = 'win' | 'loss';

export type GameResult = {
  id: string;
  // ISO 8601; formatted for display only when shown.
  finishedAt: string;
  completedRounds: number;
  outcome: GameOutcome;
};

type HistoryData = {
  schemaVersion: 1;
  results: GameResult[];
};

export type LoadResult = { ok: true; results: GameResult[] } | { ok: false };

export const HISTORY_KEY = 'simon.history.v1';
export const MAX_RESULTS = 10;

// Pure module: no React. Every localStorage access may throw (blocked, private mode, quota).

function isGameResult(value: unknown): value is GameResult {
  if (typeof value !== 'object' || value === null) return false;
  const { id, finishedAt, completedRounds, outcome } = value as Record<string, unknown>;
  return (
    typeof id === 'string' &&
    typeof finishedAt === 'string' &&
    !Number.isNaN(Date.parse(finishedAt)) &&
    Number.isInteger(completedRounds) &&
    (completedRounds as number) >= 0 &&
    (completedRounds as number) <= TOTAL_ROUNDS &&
    (outcome === 'win' || outcome === 'loss')
  );
}

export function loadHistory(): LoadResult {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (raw === null) return { ok: true, results: [] };
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return { ok: false };
    const { schemaVersion, results } = data as Record<string, unknown>;
    if (schemaVersion !== 1 || !Array.isArray(results)) return { ok: false };
    // Invalid entries are dropped quietly; the next save writes a clean list.
    return { ok: true, results: results.filter(isGameResult).slice(0, MAX_RESULTS) };
  } catch {
    return { ok: false };
  }
}

export function saveHistory(results: GameResult[]): boolean {
  const data: HistoryData = { schemaVersion: 1, results };
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearHistory(): boolean {
  try {
    window.localStorage.removeItem(HISTORY_KEY);
    return true;
  } catch {
    return false;
  }
}

// Newest first; the oldest result drops off past the limit.
export function addResult(results: GameResult[], result: GameResult): GameResult[] {
  return [result, ...results].slice(0, MAX_RESULTS);
}

// Not crypto.randomUUID: it is unavailable on plain HTTP (testing on a phone over the LAN).
export function createResult(
  outcome: GameOutcome,
  completedRounds: number,
  now: Date = new Date(),
): GameResult {
  const id = `${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return { id, finishedAt: now.toISOString(), completedRounds, outcome };
}
