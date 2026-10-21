import { GAME_COLORS } from '../game/colors.ts';
import './SimonBoard.css';

export default function SimonBoard() {
  return (
    <div className="simon-board" role="group" aria-label="לוח המשחק">
      {GAME_COLORS.map((color) => (
        <button
          key={color.id}
          type="button"
          className={`simon-board__pad simon-board__pad--${color.id}`}
          aria-label={color.label}
        />
      ))}
      <div className="simon-board__center" aria-hidden="true" />
    </div>
  );
}
