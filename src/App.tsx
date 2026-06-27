import { useState } from 'react';
import { GameProvider, useGame } from './context/GameProvider';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './components/home/HomePage';
import { LobbyPage } from './components/lobby/LobbyPage';
import { GamePage } from './components/game/GamePage';
import { FinalResult } from './components/game/FinalResult';
import { CareerHub } from './components/career/CareerHub';
import { CareerResult } from './components/career/CareerResult';

/** Top-level singleplayer view when no match is in progress. */
type View = 'home' | 'career';

/** Routes between screens based on the live room status (and the home view). */
function Screens() {
  const { room } = useGame();
  const [view, setView] = useState<View>('home');

  if (room) {
    switch (room.status) {
      case 'lobby':
        return <LobbyPage />;
      case 'starting':
      case 'in_question':
      case 'showing_result':
        return <GamePage />;
      case 'finished':
        return room.settings.careerMatch ? <CareerResult /> : <FinalResult />;
      default:
        break;
    }
  }

  if (view === 'career') return <CareerHub onExit={() => setView('home')} />;
  return <HomePage onOpenCareer={() => setView('career')} />;
}

export default function App() {
  return (
    <GameProvider>
      <AppShell>
        <Screens />
      </AppShell>
    </GameProvider>
  );
}
