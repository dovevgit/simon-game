import type { ColorId } from './colors.ts';
import { gameReducer, initialGameState, type GameAction, type GameState } from './gameReducer.ts';
import { completedRoundsText } from './resultText.ts';

function apply(state: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce(gameReducer, state);
}

function started(firstColor: ColorId = 'green'): GameState {
  return apply(initialGameState, { type: 'start', firstColor });
}

function finishPresentation(state: GameState): GameState {
  return gameReducer(state, { type: 'presentationDone', presentationId: state.presentationId });
}

// Repeats the whole current sequence correctly; `nextColor` is appended if the round advances.
function completeRound(state: GameState, nextColor: ColorId = 'green'): GameState {
  let current = finishPresentation(state);
  for (const color of state.sequence) {
    current = gameReducer(current, { type: 'press', color, nextColor });
  }
  return current;
}

function reachRound(round: number): GameState {
  let state = started();
  for (let r = 1; r < round; r++) state = completeRound(state);
  return state;
}

describe('gameReducer', () => {
  it('starts a game with a single-color sequence at round 1', () => {
    const state = started('red');
    expect(state.status).toBe('presenting');
    expect(state.sequence).toEqual(['red']);
    expect(state.round).toBe(1);
    expect(state.completedRounds).toBe(0);
    expect(state.gameId).toBe(1);
  });

  it('grows the sequence by one color per round, keeping the previous colors', () => {
    const colors: ColorId[] = ['red', 'red', 'blue', 'yellow', 'green', 'green', 'blue', 'red', 'yellow', 'yellow'];
    let state = started(colors[0]);
    expect(state.sequence).toHaveLength(1);

    for (let round = 2; round <= 10; round++) {
      const previous = state.sequence;
      state = completeRound(state, colors[round - 1]);
      expect(state.status).toBe('presenting');
      expect(state.round).toBe(round);
      expect(state.roundAdvanced).toBe(true);
      expect(state.completedRounds).toBe(round - 1);
      expect(state.sequence).toHaveLength(round);
      expect(state.sequence.slice(0, -1)).toEqual(previous);
    }
    // Repeated colors (including back-to-back) are allowed.
    expect(state.sequence).toEqual(colors);
  });

  it('ignores presses outside the player turn', () => {
    const presenting = started();
    const press: GameAction = { type: 'press', color: 'green', nextColor: 'red' };
    expect(gameReducer(presenting, press)).toBe(presenting);
    expect(gameReducer(initialGameState, press)).toBe(initialGameState);

    const lost = apply(finishPresentation(presenting), { type: 'press', color: 'red', nextColor: 'red' });
    expect(gameReducer(lost, press)).toBe(lost);
  });

  it('ignores a stale presentation completion', () => {
    const state = started();
    const stale = gameReducer(state, { type: 'presentationDone', presentationId: state.presentationId - 1 });
    expect(stale).toBe(state);
  });

  it('advances the input index on a correct press without finishing the round', () => {
    const state = finishPresentation(reachRound(3));
    const next = gameReducer(state, { type: 'press', color: state.sequence[0], nextColor: 'red' });
    expect(next.status).toBe('awaitingInput');
    expect(next.inputIndex).toBe(1);
    expect(next.round).toBe(3);
  });

  it('loses at round 1 with 0 completed rounds', () => {
    const state = apply(finishPresentation(started('green')), { type: 'press', color: 'red', nextColor: 'red' });
    expect(state.status).toBe('lost');
    expect(state.completedRounds).toBe(0);
  });

  it('loses on a wrong press in the middle of an advanced round', () => {
    let state = finishPresentation(reachRound(5));
    state = gameReducer(state, { type: 'press', color: 'green', nextColor: 'red' });
    state = gameReducer(state, { type: 'press', color: 'blue', nextColor: 'red' });
    expect(state.status).toBe('lost');
    expect(state.round).toBe(5);
    expect(state.completedRounds).toBe(4);
  });

  it('wins after completing round 10 and never creates round 11', () => {
    const state = completeRound(reachRound(10), 'red');
    expect(state.status).toBe('won');
    expect(state.completedRounds).toBe(10);
    expect(state.round).toBe(10);
    expect(state.sequence).toHaveLength(10);
  });

  it('dismiss returns to idle and the next start is a new game with a new sequence', () => {
    const lost = apply(finishPresentation(started('green')), { type: 'press', color: 'red', nextColor: 'red' });
    const idle = gameReducer(lost, { type: 'dismiss' });
    expect(idle.status).toBe('idle');
    expect(idle.round).toBe(1);
    expect(idle.sequence).toEqual([]);
    expect(idle.gameId).toBe(lost.gameId);

    const next = gameReducer(idle, { type: 'start', firstColor: 'blue' });
    expect(next.gameId).toBe(lost.gameId + 1);
    expect(next.sequence).toEqual(['blue']);
  });

  it('dismiss does nothing while a game is active', () => {
    const state = started();
    expect(gameReducer(state, { type: 'dismiss' })).toBe(state);
  });

  it('abandon cancels an active game without a result', () => {
    const state = finishPresentation(reachRound(3));
    const abandoned = gameReducer(state, { type: 'abandon' });
    expect(abandoned.status).toBe('idle');
    expect(abandoned.round).toBe(1);
    expect(abandoned.presentationId).toBe(state.presentationId + 1);

    const won = completeRound(reachRound(10));
    expect(gameReducer(won, { type: 'abandon' })).toBe(won);
  });
});

describe('completedRoundsText', () => {
  it.each([
    [0, 'לא השלמת אף שלב'],
    [1, 'השלמת שלב אחד'],
    [2, 'השלמת 2 שלבים'],
    [10, 'השלמת 10 שלבים'],
  ])('%i → %s', (count, text) => {
    expect(completedRoundsText(count)).toBe(text);
  });
});
