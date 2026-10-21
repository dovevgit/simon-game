import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { ColorId } from './colors.ts';
import { PRESS_MIN_MS, RESULT_DELAY_MS } from './constants.ts';
import { gameReducer, initialGameState } from './gameReducer.ts';
import { randomColor } from './random.ts';
import { playPresentation } from './sequencePlayer.ts';

export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const [activeColor, setActiveColor] = useState<ColorId | null>(null);
  const [pressedColor, setPressedColor] = useState<ColorId | null>(null);
  // The presentation whose new round number is already shown (see the round-change pause).
  const [revealedPresentationId, setRevealedPresentationId] = useState(0);
  const [resultVisible, setResultVisible] = useState(false);

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerHeld = useRef(false);

  const { status, sequence, round, roundAdvanced, presentationId, gameId } = state;

  // Sequence playback; aborting cancels every pending timer and ignores the stale completion.
  useEffect(() => {
    if (status !== 'presenting') return;
    const controller = new AbortController();
    playPresentation({
      sequence,
      roundAdvanced,
      signal: controller.signal,
      onRevealRound: () => setRevealedPresentationId(presentationId),
      onFlash: setActiveColor,
    }).then(
      () => dispatch({ type: 'presentationDone', presentationId }),
      (error: unknown) => {
        if (!controller.signal.aborted) throw error;
      },
    );
    return () => {
      controller.abort();
      setActiveColor(null);
    };
  }, [status, sequence, roundAdvanced, presentationId]);

  // Display-only delay before the win/loss message; navigation does not cancel it.
  useEffect(() => {
    if (status !== 'won' && status !== 'lost') return;
    const timer = setTimeout(() => setResultVisible(true), RESULT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [status, gameId]);

  const clearPress = useCallback(() => {
    if (pressTimer.current !== null) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pointerHeld.current = false;
    setPressedColor(null);
  }, []);

  const release = useCallback(() => {
    pointerHeld.current = false;
    // Keep the highlight until the minimum duration has passed.
    if (pressTimer.current === null) setPressedColor(null);
  }, []);

  // The pad may become inactive mid-press, so the release is caught on the window.
  useEffect(() => {
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
    };
  }, [release]);

  useEffect(() => clearPress, [clearPress]);

  const press = useCallback(
    (color: ColorId, held: boolean) => {
      if (status !== 'awaitingInput') return;
      dispatch({ type: 'press', color, nextColor: randomColor() });

      if (pressTimer.current !== null) clearTimeout(pressTimer.current);
      pointerHeld.current = held;
      setPressedColor(color);
      pressTimer.current = setTimeout(() => {
        pressTimer.current = null;
        if (!pointerHeld.current) setPressedColor(null);
      }, PRESS_MIN_MS);
    },
    [status],
  );

  const start = useCallback(() => {
    dispatch({ type: 'start', firstColor: randomColor() });
  }, []);

  const dismiss = useCallback(() => {
    setResultVisible(false);
    clearPress();
    dispatch({ type: 'dismiss' });
  }, [clearPress]);

  const abandon = useCallback(() => {
    if (status !== 'presenting' && status !== 'awaitingInput') return;
    clearPress();
    dispatch({ type: 'abandon' });
  }, [status, clearPress]);

  const holdingPreviousRound =
    status === 'presenting' && roundAdvanced && revealedPresentationId !== presentationId;
  const displayRound = status === 'idle' ? 1 : holdingPreviousRound ? round - 1 : round;

  return {
    status,
    displayRound,
    completedRounds: state.completedRounds,
    activeColor,
    pressedColor,
    resultVisible,
    start,
    press,
    dismiss,
    abandon,
  };
}

export type GameView = ReturnType<typeof useGame>;
