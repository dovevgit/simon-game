import type { ColorId } from './colors.ts';
import { TOTAL_ROUNDS } from './constants.ts';

export type GameStatus = 'idle' | 'presenting' | 'awaitingInput' | 'won' | 'lost';

export type GameState = {
  status: GameStatus;
  sequence: ColorId[];
  round: number;
  inputIndex: number;
  completedRounds: number;
  // Incremented on every "start"; lets effects tell games apart.
  gameId: number;
  // Incremented on every entry to (or cancellation of) a presentation; stale completions are ignored.
  presentationId: number;
  // True when the current presentation was entered by completing a round (adds the round-change pause).
  roundAdvanced: boolean;
};

export type GameAction =
  | { type: 'start'; firstColor: ColorId }
  | { type: 'presentationDone'; presentationId: number }
  | { type: 'press'; color: ColorId; nextColor: ColorId }
  | { type: 'dismiss' }
  // Temporary until Milestone 4 replaces it with a real pause.
  | { type: 'abandon' };

export const initialGameState: GameState = {
  status: 'idle',
  sequence: [],
  round: 1,
  inputIndex: 0,
  completedRounds: 0,
  gameId: 0,
  presentationId: 0,
  roundAdvanced: false,
};

// Pure: no timers, audio or storage. Random colors arrive inside the actions.
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'start':
      if (state.status !== 'idle') return state;
      return {
        ...initialGameState,
        status: 'presenting',
        sequence: [action.firstColor],
        gameId: state.gameId + 1,
        presentationId: state.presentationId + 1,
      };

    case 'presentationDone':
      if (state.status !== 'presenting' || action.presentationId !== state.presentationId) {
        return state;
      }
      return { ...state, status: 'awaitingInput', inputIndex: 0 };

    case 'press': {
      if (state.status !== 'awaitingInput') return state;

      if (action.color !== state.sequence[state.inputIndex]) {
        return { ...state, status: 'lost', completedRounds: state.round - 1 };
      }

      const isLastInRound = state.inputIndex === state.sequence.length - 1;
      if (!isLastInRound) {
        return { ...state, inputIndex: state.inputIndex + 1 };
      }

      if (state.round >= TOTAL_ROUNDS) {
        return { ...state, status: 'won', completedRounds: TOTAL_ROUNDS };
      }

      return {
        ...state,
        status: 'presenting',
        sequence: [...state.sequence, action.nextColor],
        round: state.round + 1,
        inputIndex: 0,
        completedRounds: state.round,
        presentationId: state.presentationId + 1,
        roundAdvanced: true,
      };
    }

    case 'dismiss':
      if (state.status !== 'won' && state.status !== 'lost') return state;
      return {
        ...initialGameState,
        gameId: state.gameId,
        presentationId: state.presentationId,
      };

    case 'abandon':
      if (state.status !== 'presenting' && state.status !== 'awaitingInput') return state;
      return {
        ...initialGameState,
        gameId: state.gameId,
        presentationId: state.presentationId + 1,
      };
  }
}
