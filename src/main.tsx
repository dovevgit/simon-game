import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/heebo/400.css';
import '@fontsource/heebo/600.css';
import '@fontsource/heebo/700.css';
import './index.css';
import App from './App.tsx';

// Offline support. No onNeedRefresh: an update installs in the background and takes over
// only after the app is fully closed, so an active game is never reloaded.
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
