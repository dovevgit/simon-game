import { useState } from 'react';
import BottomNav, { type Screen } from './components/BottomNav.tsx';
import ResultDialog from './components/ResultDialog.tsx';
import { useGame } from './game/useGame.ts';
import HomeScreen from './screens/HomeScreen.tsx';
import AboutScreen from './screens/AboutScreen.tsx';

export default function App() {
  // Both screens live in the same React tree, so switching never reloads the page.
  const [screen, setScreen] = useState<Screen>('home');
  // Owned here so the game survives screen changes.
  const game = useGame();

  function handleNavigate(next: Screen) {
    // Temporary until Milestone 4: leaving for About cancels an active game.
    if (next === 'about') game.abandon();
    setScreen(next);
  }

  const showResult =
    screen === 'home' && game.resultVisible && (game.status === 'won' || game.status === 'lost');

  return (
    <div className="app">
      <main className="app__content">
        {screen === 'home' ? <HomeScreen game={game} /> : <AboutScreen />}
      </main>
      <BottomNav current={screen} onNavigate={handleNavigate} />
      {showResult && (
        <ResultDialog
          outcome={game.status === 'won' ? 'won' : 'lost'}
          completedRounds={game.completedRounds}
          onConfirm={game.dismiss}
        />
      )}
    </div>
  );
}
