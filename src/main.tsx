import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import { unlockAudio } from './lib/sound';

// Browsers require a user gesture before audio can start; unlock once.
window.addEventListener('pointerdown', () => unlockAudio(), { once: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
