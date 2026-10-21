import confetti from 'canvas-confetti';

const GAME_COLORS_HEX = ['#00D26A', '#FF3B30', '#FFD600', '#00A3FF'];

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

// One celebratory burst for a win; skipped entirely when reduced motion is requested.
export function fireWinConfetti() {
  if (prefersReducedMotion()) return;
  const shared = {
    colors: GAME_COLORS_HEX,
    disableForReducedMotion: true,
    zIndex: 100,
  };
  confetti({ ...shared, particleCount: 120, spread: 80, origin: { x: 0.5, y: 0.45 } });
  confetti({ ...shared, particleCount: 50, angle: 60, spread: 55, origin: { x: 0, y: 0.6 } });
  confetti({ ...shared, particleCount: 50, angle: 120, spread: 55, origin: { x: 1, y: 0.6 } });
}

export function clearConfetti() {
  confetti.reset();
}
