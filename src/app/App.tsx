import { useEffect } from 'react';
import { AppSettingsProvider, useSettings } from './providers/AppSettingsProvider.tsx';
import { MatchProvider, useMatch } from './providers/MatchProvider.tsx';
import { StatsProvider, useStats } from './providers/StatsProvider.tsx';
import { MatchErrorBoundary } from './MatchErrorBoundary.tsx';
import { ScreenAnnouncer } from './a11y/ScreenAnnouncer.tsx';
import { useMatchSound } from '../engine/useMatchSound.ts';
import { MainMenuScreen } from './screens/MainMenuScreen.tsx';
import { MatchmakingScreen } from './screens/MatchmakingScreen.tsx';
import { CountdownScreen } from './screens/CountdownScreen.tsx';
import { GameplayScreen } from './screens/GameplayScreen.tsx';
import { HalfTimeScreen } from './screens/HalfTimeScreen.tsx';
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
    case 'half_time':
      return (
        <HalfTimeScreen
          scoreline={phase.scoreline}
          player={player}
          opponent={opponent}
        />
      );
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
      <StatsProvider>
        <MatchProvider>
          <AppShell />
        </MatchProvider>
      </StatsProvider>
    </AppSettingsProvider>
  );
}

function AppShell() {
  const { state, reset } = useMatch();
  const { soundOn } = useSettings();
  const { record } = useStats();
  useMatchSound(state, soundOn);

  // Record a finished match into career stats exactly once.
  useEffect(() => {
    if (state.phase.kind === 'post_match') record(state.phase.summary);
  }, [state.phase, record]);

  return (
    <MatchErrorBoundary onReset={reset}>
      <ScreenAnnouncer />
      <Router />
    </MatchErrorBoundary>
  );
}
