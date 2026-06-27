import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthProvider';
import { GameProvider, useGame } from './context/GameProvider';
import { FriendsProvider } from './context/FriendsProvider';
import { LeaguesProvider } from './context/LeaguesProvider';
import { AppShell } from './components/layout/AppShell';
import { HomePage } from './components/home/HomePage';
import { LobbyPage } from './components/lobby/LobbyPage';
import { GamePage } from './components/game/GamePage';
import { FinalResult } from './components/game/FinalResult';
import { CareerHub } from './components/career/CareerHub';
import { CareerResult } from './components/career/CareerResult';
import { GameModesHub } from './components/solo/GameModesHub';
import { ConnectionsGame } from './components/connections/ConnectionsGame';
import { CupHub } from './components/cup/CupHub';
import { CupResult } from './components/cup/CupResult';

/** Top-level singleplayer view when no match is in progress. */
type View = 'home' | 'career' | 'modes' | 'cup' | 'connections';

/** Brief gate while a signed-in session's progress is restored. */
function SyncSplash() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-center animate-fade-in">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-pitch" />
      <p className="text-sm text-white/50">Restoring your progress…</p>
    </div>
  );
}

/** Routes between screens based on the live room status (and the home view). */
function Screens() {
  const { room } = useGame();
  const { hydrating } = useAuth();
  const [view, setView] = useState<View>('home');

  if (hydrating && !room) return <SyncSplash />;

  if (room) {
    switch (room.status) {
      case 'lobby':
        return <LobbyPage />;
      case 'starting':
      case 'in_question':
      case 'showing_result':
        return <GamePage />;
      case 'finished':
        if (room.settings.careerMatch) return <CareerResult />;
        if (room.settings.cupMatch) return <CupResult />;
        return <FinalResult />;
      default:
        break;
    }
  }

  if (view === 'career') return <CareerHub onExit={() => setView('home')} />;
  if (view === 'modes') return <GameModesHub onExit={() => setView('home')} />;
  if (view === 'cup') return <CupHub onExit={() => setView('home')} />;
  if (view === 'connections') return <ConnectionsGame onExit={() => setView('home')} />;
  return (
    <HomePage
      onOpenCareer={() => setView('career')}
      onOpenModes={() => setView('modes')}
      onOpenCup={() => setView('cup')}
      onOpenConnections={() => setView('connections')}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <FriendsProvider>
          <LeaguesProvider>
            <AppShell>
              <Screens />
            </AppShell>
          </LeaguesProvider>
        </FriendsProvider>
      </GameProvider>
    </AuthProvider>
  );
}
