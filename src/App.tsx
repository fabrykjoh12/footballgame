import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthProvider';
import { type View } from './lib/viewRoute';
import { GameProvider, useGame } from './context/GameProvider';
import { NavProvider, useNav } from './context/NavProvider';
import { FriendsProvider } from './context/FriendsProvider';
import { LeaguesProvider } from './context/LeaguesProvider';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { HomePage } from './components/home/HomePage';

// Lazy-load every non-home screen so the initial bundle stays small: the match
// flow, the singleplayer hubs, and the standalone modes (Mystery pulls the whole
// player database, Connections/Solo pull the question bank) each load on demand.
const LobbyPage = lazy(() => import('./components/lobby/LobbyPage').then((m) => ({ default: m.LobbyPage })));
const GamePage = lazy(() => import('./components/game/GamePage').then((m) => ({ default: m.GamePage })));
const FinalResult = lazy(() => import('./components/game/FinalResult').then((m) => ({ default: m.FinalResult })));
const CareerHub = lazy(() => import('./components/career/CareerHub').then((m) => ({ default: m.CareerHub })));
const CareerResult = lazy(() => import('./components/career/CareerResult').then((m) => ({ default: m.CareerResult })));
const GameModesHub = lazy(() => import('./components/solo/GameModesHub').then((m) => ({ default: m.GameModesHub })));
const ConnectionsGame = lazy(() => import('./components/connections/ConnectionsGame').then((m) => ({ default: m.ConnectionsGame })));
const CupHub = lazy(() => import('./components/cup/CupHub').then((m) => ({ default: m.CupHub })));
const CupResult = lazy(() => import('./components/cup/CupResult').then((m) => ({ default: m.CupResult })));
const MysteryPlayerGame = lazy(() => import('./components/mystery/MysteryPlayerGame').then((m) => ({ default: m.MysteryPlayerGame })));
const OlderYoungerGame = lazy(() => import('./components/solo/OlderYoungerGame').then((m) => ({ default: m.OlderYoungerGame })));
const CareerPathGame = lazy(() => import('./components/solo/CareerPathGame').then((m) => ({ default: m.CareerPathGame })));
const ManagerMerryGoRound = lazy(() => import('./components/solo/ManagerMerryGoRound').then((m) => ({ default: m.ManagerMerryGoRound })));
const ScoutGame = lazy(() => import('./components/scout/ScoutGame').then((m) => ({ default: m.ScoutGame })));

// Top-level singleplayer views live in lib/viewRoute (typed + hash-mapped).

/** Brief gate while a signed-in session's progress is restored. */
function SyncSplash() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-center animate-fade-in">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-royal" />
      <p className="text-sm text-white/55">Restoring your progress…</p>
    </div>
  );
}

/** Minimal fallback shown while a lazy screen chunk is fetched. */
function RouteFallback() {
  return (
    <div className="flex flex-1 items-center justify-center py-20" aria-busy="true">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-royal" />
    </div>
  );
}

/** Picks the active screen based on the live room status (and the home view). */
function activeScreen(
  room: ReturnType<typeof useGame>['room'],
  view: View,
  setView: (v: View) => void,
) {
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
  // Distinct keys: the plain and daily views share a component type, and
  // without a remount the `daily` prop would be ignored (it seeds initial state).
  if (view === 'connections') return <ConnectionsGame key="connections" onExit={() => setView('home')} />;
  if (view === 'connectionsDaily') return <ConnectionsGame key="connections-daily" daily onExit={() => setView('home')} />;
  if (view === 'mystery') return <MysteryPlayerGame onExit={() => setView('home')} />;
  if (view === 'olderYounger') return <OlderYoungerGame onExit={() => setView('home')} />;
  if (view === 'careerPath') return <CareerPathGame onExit={() => setView('home')} />;
  if (view === 'managers') return <ManagerMerryGoRound onExit={() => setView('home')} />;
  if (view === 'scout') return <ScoutGame key="scout" onExit={() => setView('home')} />;
  if (view === 'scoutDaily') return <ScoutGame key="scout-daily" daily onExit={() => setView('home')} />;
  return <HomePage />;
}

/** Routes between screens based on the live room status (and the nav view). */
function Screens() {
  const { room } = useGame();
  const { hydrating } = useAuth();
  const { view, navigate } = useNav();

  if (hydrating && !room) return <SyncSplash />;

  return <Suspense fallback={<RouteFallback />}>{activeScreen(room, view, navigate)}</Suspense>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <GameProvider>
          <FriendsProvider>
            <LeaguesProvider>
              <NavProvider>
                <AppShell>
                  <Screens />
                </AppShell>
              </NavProvider>
            </LeaguesProvider>
          </FriendsProvider>
        </GameProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
