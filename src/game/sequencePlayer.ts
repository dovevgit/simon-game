import type { ColorId } from './colors.ts';
import {
  FLASH_MS,
  GAP_MS,
  NEXT_ROUND_DELAY_MS,
  ROUND_HOLD_MS,
  START_DELAY_MS,
} from './constants.ts';

// Resolves after `ms`, or rejects with AbortError as soon as `signal` aborts (the timer is cleared).
export function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(signal.reason);
    }
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

type PresentationOptions = {
  sequence: readonly ColorId[];
  roundAdvanced: boolean;
  signal: AbortSignal;
  onRevealRound: () => void;
  onFlash: (color: ColorId | null) => void;
};

// Plays the lead-in pause and then flashes each color in order.
export async function playPresentation({
  sequence,
  roundAdvanced,
  signal,
  onRevealRound,
  onFlash,
}: PresentationOptions): Promise<void> {
  if (roundAdvanced) {
    // Keep the completed round on screen, then show the next round number.
    await wait(ROUND_HOLD_MS, signal);
    onRevealRound();
    await wait(NEXT_ROUND_DELAY_MS, signal);
  } else {
    await wait(START_DELAY_MS, signal);
  }

  for (let i = 0; i < sequence.length; i++) {
    onFlash(sequence[i]);
    await wait(FLASH_MS, signal);
    onFlash(null);
    if (i < sequence.length - 1) {
      await wait(GAP_MS, signal);
    }
  }
}
