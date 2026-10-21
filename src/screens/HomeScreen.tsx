import SimonBoard from '../components/SimonBoard.tsx';
import { TOTAL_ROUNDS } from '../game/constants.ts';
import type { GameView } from '../game/useGame.ts';
import './HomeScreen.css';

type HomeScreenProps = {
  game: GameView;
};

export default function HomeScreen({ game }: HomeScreenProps) {
  const { status } = game;

  let statusText = '';
  let hintText = '';
  if (status === 'presenting') {
    statusText = 'המשחק מציג את הרצף';
  } else if (status === 'awaitingInput') {
    statusText = 'התור שלך';
    hintText = 'הקש על הצבעים לפי הסדר';
  }

  return (
    <section className="home">
      <h1 className="screen-title">סיימון</h1>
      <p className="home__stage">{`שלב ${game.displayRound} מתוך ${TOTAL_ROUNDS}`}</p>
      {/* Status line keeps its height so the board doesn't jump between states */}
      <p className="home__status" aria-live="polite">
        {statusText}
      </p>
      <SimonBoard
        activeColor={game.activeColor}
        pressedColor={game.pressedColor}
        dimmed={status === 'presenting'}
        interactive={status === 'awaitingInput'}
        onPadDown={game.press}
      />
      <div className="home__actions">
        {hintText && <p className="home__hint">{hintText}</p>}
        {status === 'idle' && (
          <>
            {game.audioError && (
              <p className="home__error" role="alert">
                לא הצלחנו להפעיל את הצליל. הקש שוב על הכפתור.
              </p>
            )}
            <button type="button" className="btn-primary" onClick={game.start}>
              התחל משחק
            </button>
          </>
        )}
      </div>
    </section>
  );
}
