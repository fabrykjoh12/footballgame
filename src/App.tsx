import { GameProvider, useGame } from './context/GameProvider';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './components/home/HomePage';
import { LobbyPage } from './components/lobby/LobbyPage';
import { GamePage } from './components/game/GamePage';
import { FinalResult } from './components/game/FinalResult';

/** Routes between screens based purely on the live room status. */
function Screens() {
  const { room } = useGame();

  if (!room) return <HomePage />;

  switch (room.status) {
    case 'lobby':
      return <LobbyPage />;
    case 'starting':
    case 'in_question':
    case 'showing_result':
      return <GamePage />;
    case 'finished':
      return <FinalResult />;
    default:
      return <HomePage />;
  }
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
