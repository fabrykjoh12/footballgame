import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import { unlockAudio } from './lib/sound';
import { hydrateClubKit } from './lib/clubIdentity';

// Browsers require a user gesture before audio can start; unlock once.
window.addEventListener('pointerdown', () => unlockAudio(), { once: true });

// Register the saved club's kit colour so it shows in matches from the start.
hydrateClubKit();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
