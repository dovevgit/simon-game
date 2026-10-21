import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import * as audio from '../audio/audioEngine.ts';
import { clearConfetti, fireWinConfetti } from '../effects/confetti.ts';
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
  const [audioError, setAudioError] = useState(false);

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerHeld = useRef(false);
  // Stops the tone of the current player press; null when no press is active.
  const stopPressTone = useRef<(() => void) | null>(null);
  const unlocking = useRef(false);
  const confettiGameId = useRef(0);

  const { status, sequence, round, roundAdvanced, presentationId, gameId } = state;

  // Sequence playback; aborting cancels every pending timer and ignores the stale completion.
  useEffect(() => {
    if (status !== 'presenting') return;
    const controller = new AbortController();
    let stopFlashTone: (() => void) | null = null;
    playPresentation({
      sequence,
      roundAdvanced,
      signal: controller.signal,
      onRevealRound: () => setRevealedPresentationId(presentationId),
      onFlash: (color) => {
        setActiveColor(color);
        stopFlashTone?.();
        stopFlashTone = color ? audio.startTone(color) : null;
      },
    }).then(
      () => dispatch({ type: 'presentationDone', presentationId }),
      (error: unknown) => {
        if (!controller.signal.aborted) throw error;
      },
    );
    return () => {
      controller.abort();
      stopFlashTone?.();
      setActiveColor(null);
    };
  }, [status, sequence, roundAdvanced, presentationId]);

  // Display-only delay before the win/loss message, its sound and confetti; navigation does not cancel it.
  useEffect(() => {
    if (status !== 'won' && status !== 'lost') return;
    const timer = setTimeout(() => {
      setResultVisible(true);
      if (status === 'lost') {
        audio.playLoss();
        return;
      }
      audio.playWin();
      if (confettiGameId.current !== gameId) {
        confettiGameId.current = gameId;
        fireWinConfetti();
      }
    }, RESULT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [status, gameId]);

  // Confetti is cleared when leaving the win state.
  useEffect(() => {
    if (status !== 'won') return;
    return clearConfetti;
  }, [status]);

  const endPress = useCallback(() => {
    if (pressTimer.current !== null) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    pointerHeld.current = false;
    stopPressTone.current?.();
    stopPressTone.current = null;
    setPressedColor(null);
  }, []);

  const release = useCallback(() => {
    pointerHeld.current = false;
    // Keep the press going until the minimum duration has passed.
    if (stopPressTone.current && pressTimer.current === null) endPress();
  }, [endPress]);

  // The pad may become inactive mid-press, so the release is caught on the window.
  useEffect(() => {
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
    };
  }, [release]);

  useEffect(
    () => () => {
      endPress();
      audio.stopAll();
    },
    [endPress],
  );

  const press = useCallback(
    (color: ColorId, held: boolean) => {
      if (status !== 'awaitingInput') return;
      dispatch({ type: 'press', color, nextColor: randomColor() });

      // Every press sounds immediately, including the wrong one.
      if (pressTimer.current !== null) clearTimeout(pressTimer.current);
      stopPressTone.current?.();
      stopPressTone.current = audio.startTone(color);
      pointerHeld.current = held;
      setPressedColor(color);
      pressTimer.current = setTimeout(() => {
        pressTimer.current = null;
        if (!pointerHeld.current) endPress();
      }, PRESS_MIN_MS);
    },
    [status, endPress],
  );

  // Called from the "התחל משחק" click: the audio unlock must happen inside that gesture.
  const start = useCallback(() => {
    if (unlocking.current) return;
    unlocking.current = true;
    audio
      .unlock()
      .then(
        () => {
          setAudioError(false);
          dispatch({ type: 'start', firstColor: randomColor() });
        },
        // Never start a silent sequence; the player can tap again.
        () => setAudioError(true),
      )
      .finally(() => {
        unlocking.current = false;
      });
  }, []);

  const dismiss = useCallback(() => {
    setResultVisible(false);
    endPress();
    audio.stopAll();
    dispatch({ type: 'dismiss' });
  }, [endPress]);

  const abandon = useCallback(() => {
    if (status !== 'presenting' && status !== 'awaitingInput') return;
    endPress();
    audio.stopAll();
    dispatch({ type: 'abandon' });
  }, [status, endPress]);

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
    audioError,
    start,
    press,
    dismiss,
    abandon,
  };
}

export type GameView = ReturnType<typeof useGame>;
