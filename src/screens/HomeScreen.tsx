import SimonBoard from '../components/SimonBoard.tsx';
import './HomeScreen.css';

const TOTAL_ROUNDS = 10;

export default function HomeScreen() {
  return (
    <section className="home">
      <h1 className="screen-title">סיימון</h1>
      <p className="home__stage">{`שלב 1 מתוך ${TOTAL_ROUNDS}`}</p>
      {/* Status line keeps its height so the board won't jump once game states are added */}
      <p className="home__status" aria-live="polite" />
      <SimonBoard />
      <div className="home__actions">
        <button type="button" className="btn-primary">
          התחל משחק
        </button>
      </div>
    </section>
  );
}
