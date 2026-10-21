import { useState } from 'react';
import BottomNav, { type Screen } from './components/BottomNav.tsx';
import HomeScreen from './screens/HomeScreen.tsx';
import AboutScreen from './screens/AboutScreen.tsx';

export default function App() {
  // Both screens live in the same React tree, so switching never reloads the page.
  const [screen, setScreen] = useState<Screen>('home');

  return (
    <div className="app">
      <main className="app__content">{screen === 'home' ? <HomeScreen /> : <AboutScreen />}</main>
      <BottomNav current={screen} onNavigate={setScreen} />
    </div>
  );
}
