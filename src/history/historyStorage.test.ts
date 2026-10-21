import {
  HISTORY_KEY,
  addResult,
  clearHistory,
  createResult,
  loadHistory,
  saveHistory,
  type GameResult,
} from './historyStorage.ts';

function result(completedRounds: number, outcome: GameResult['outcome'] = 'loss'): GameResult {
  return createResult(outcome, completedRounds, new Date(2026, 9, 21, 14, completedRounds));
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('historyStorage', () => {
  it('loads an empty history when nothing is stored', () => {
    expect(loadHistory()).toEqual({ ok: true, results: [] });
  });

  it('saves and loads results in the same order, with a schema version', () => {
    const results = [result(10, 'win'), result(3)];
    expect(saveHistory(results)).toBe(true);
    expect(loadHistory()).toEqual({ ok: true, results });
    expect(JSON.parse(localStorage.getItem(HISTORY_KEY)!)).toMatchObject({ schemaVersion: 1 });
  });

  it('keeps the 10 newest results, newest first', () => {
    let results: GameResult[] = [];
    for (let i = 0; i <= 10; i++) results = addResult(results, result(i));
    expect(results).toHaveLength(10);
    expect(results.map((r) => r.completedRounds)).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  });

  it('reports unreadable data as an error', () => {
    localStorage.setItem(HISTORY_KEY, '{not json');
    expect(loadHistory()).toEqual({ ok: false });
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ schemaVersion: 2, results: [] }));
    expect(loadHistory()).toEqual({ ok: false });
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ schemaVersion: 1, results: 'x' }));
    expect(loadHistory()).toEqual({ ok: false });
  });

  it('drops invalid entries from otherwise valid data', () => {
    const valid = result(4);
    const invalid = [
      { ...valid, completedRounds: 11 },
      { ...valid, completedRounds: 2.5 },
      { ...valid, outcome: 'draw' },
      { ...valid, finishedAt: 'yesterday' },
      { ...valid, id: 7 },
      null,
    ];
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ schemaVersion: 1, results: [valid, ...invalid] }));
    expect(loadHistory()).toEqual({ ok: true, results: [valid] });
  });

  it('clears the stored history', () => {
    saveHistory([result(1)]);
    expect(clearHistory()).toBe(true);
    expect(localStorage.getItem(HISTORY_KEY)).toBeNull();
    expect(loadHistory()).toEqual({ ok: true, results: [] });
  });

  it('reports blocked storage without throwing', () => {
    const blocked = () => {
      throw new Error('blocked');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(blocked);
    expect(loadHistory()).toEqual({ ok: false });
    expect(saveHistory([result(1)])).toBe(false);
    expect(clearHistory()).toBe(false);
  });

  it('creates results with an ISO finish time and distinct ids', () => {
    const now = new Date('2026-10-21T12:34:56.000Z');
    const a = createResult('win', 10, now);
    const b = createResult('win', 10, now);
    expect(a).toMatchObject({ finishedAt: '2026-10-21T12:34:56.000Z', completedRounds: 10, outcome: 'win' });
    expect(a.id).not.toBe(b.id);
  });
});
