import { useEffect } from 'react';
import { AppSettingsProvider } from './providers/AppSettingsProvider.tsx';
import { MatchProvider, useMatch } from './providers/MatchProvider.tsx';
import { MatchErrorBoundary } from './MatchErrorBoundary.tsx';
import { MainMenuScreen } from './screens/MainMenuScreen.tsx';
import { MatchmakingScreen } from './screens/MatchmakingScreen.tsx';
import { CountdownScreen } from './screens/CountdownScreen.tsx';
import { GameplayScreen } from './screens/GameplayScreen.tsx';
import { PostMatchScreen } from './screens/PostMatchScreen.tsx';
import { ErrorScreen } from './screens/ErrorScreen.tsx';
import { applyTeamTheme } from '../ui/theme/teamThemes.ts';

function Router() {
  const { state } = useMatch();
  const { phase, player, opponent } = state;

  // Tint the whole UI to the active match's team colours.
  useEffect(() => {
    if (player && opponent) {
      const home = player.side === 'home' ? player.team : opponent.team;
      const away = player.side === 'home' ? opponent.team : player.team;
      applyTeamTheme(home, away);
    }
  }, [player, opponent]);

  switch (phase.kind) {
    case 'main_menu':
      return <MainMenuScreen />;
    case 'matchmaking':
      return <MatchmakingScreen mode={phase.mode} />;
    case 'countdown':
      return (
        <CountdownScreen
          secondsLeft={phase.secondsLeft}
          player={player}
          opponent={opponent}
        />
      );
    case 'in_question':
    case 'question_reveal':
    case 'tiebreaker':
      return <GameplayScreen />;
    case 'post_match':
      return <PostMatchScreen summary={phase.summary} />;
    case 'error':
      return <ErrorScreen code={phase.code} />;
    default: {
      // Exhaustiveness guard — a new phase must be handled above.
      const _never: never = phase;
      void _never;
      return null;
    }
  }
}

export function App() {
  return (
    <AppSettingsProvider>
      <MatchProvider>
        <AppShell />
      </MatchProvider>
    </AppSettingsProvider>
  );
}

function AppShell() {
  const { reset } = useMatch();
  return (
    <MatchErrorBoundary onReset={reset}>
      <Router />
    </MatchErrorBoundary>
  );
}
