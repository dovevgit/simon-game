import type { KeyboardEvent, PointerEvent } from 'react';
import { GAME_COLORS, type ColorId } from '../game/colors.ts';
import './SimonBoard.css';

type SimonBoardProps = {
  activeColor: ColorId | null;
  pressedColor: ColorId | null;
  // Unlit pads are dimmed while the sequence is shown.
  dimmed: boolean;
  interactive: boolean;
  onPadDown: (color: ColorId, held: boolean) => void;
};

export default function SimonBoard({
  activeColor,
  pressedColor,
  dimmed,
  interactive,
  onPadDown,
}: SimonBoardProps) {
  function handlePointerDown(event: PointerEvent<HTMLButtonElement>, color: ColorId) {
    // Prevents text selection, double-tap zoom and the delayed click.
    event.preventDefault();
    if (event.button !== 0 || !interactive) return;
    onPadDown(color, true);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, color: ColorId) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (event.repeat || !interactive) return;
    onPadDown(color, false);
  }

  const classNames = ['simon-board'];
  if (dimmed) classNames.push('simon-board--dimmed');
  if (interactive) classNames.push('simon-board--interactive');

  return (
    <div className={classNames.join(' ')} role="group" aria-label="לוח המשחק">
      {GAME_COLORS.map((color) => {
        const lit = color.id === activeColor || color.id === pressedColor;
        return (
          <button
            key={color.id}
            type="button"
            className={`simon-board__pad simon-board__pad--${color.id}${lit ? ' simon-board__pad--lit' : ''}`}
            aria-label={color.label}
            aria-disabled={!interactive}
            onPointerDown={(event) => handlePointerDown(event, color.id)}
            onKeyDown={(event) => handleKeyDown(event, color.id)}
            onContextMenu={(event) => event.preventDefault()}
          />
        );
      })}
      <div className="simon-board__center" aria-hidden="true" />
    </div>
  );
}
