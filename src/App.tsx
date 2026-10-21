import { useEffect, useRef, useState } from 'react';
import BottomNav, { type Screen } from './components/BottomNav.tsx';
import ResultDialog from './components/ResultDialog.tsx';
import { useGame } from './game/useGame.ts';
import { useHistory } from './history/useHistory.ts';
import HomeScreen from './screens/HomeScreen.tsx';
import AboutScreen from './screens/AboutScreen.tsx';

export default function App() {
  // Both screens live in the same React tree, so switching never reloads the page.
  const [screen, setScreen] = useState<Screen>('home');
  // Owned here so the game survives screen changes.
  const game = useGame();
  const history = useHistory();
  // The last game already written to the history; survives Strict Mode's double effects.
  const recordedGameId = useRef(0);

  const { status, gameId, completedRounds } = game;
  const { record } = history;

  // A decided game is recorded once, right away (not after the result message delay).
  useEffect(() => {
    if (status !== 'won' && status !== 'lost') return;
    if (recordedGameId.current === gameId) return;
    recordedGameId.current = gameId;
    record(status === 'won' ? 'win' : 'loss', completedRounds);
  }, [status, gameId, completedRounds, record]);

  function handleNavigate(next: Screen) {
    // Leaving for About pauses an active game; coming back never resumes it on its own.
    if (next === 'about') game.pause();
    setScreen(next);
  }

  const showResult =
    screen === 'home' && game.resultVisible && (status === 'won' || status === 'lost');

  return (
    <div className="app">
      <main className="app__content">
        {screen === 'home' ? <HomeScreen game={game} /> : <AboutScreen history={history} />}
      </main>
      <BottomNav current={screen} onNavigate={handleNavigate} />
      {showResult && (
        <ResultDialog
          outcome={status === 'won' ? 'won' : 'lost'}
          completedRounds={completedRounds}
          saveFailed={history.saveError}
          onConfirm={game.dismiss}
        />
      )}
    </div>
  );
}
