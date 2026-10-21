import { GAME_COLORS, type ColorId } from './colors.ts';

// Game randomness only — no cryptographic RNG needed. Repeats are allowed.
export function randomColor(): ColorId {
  return GAME_COLORS[Math.floor(Math.random() * GAME_COLORS.length)].id;
}
