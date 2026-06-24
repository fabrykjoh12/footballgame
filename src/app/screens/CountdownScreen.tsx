import type { OpponentInfo, PlayerInfo } from '../../types/match.ts';

interface CountdownScreenProps {
  secondsLeft: number;
  player: PlayerInfo | null;
  opponent: OpponentInfo | null;
}

export function CountdownScreen({ secondsLeft, player, opponent }: CountdownScreenProps) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-8 px-5 text-center">
      <div className="flex items-center gap-4 font-display text-lg">
        <span style={{ color: `rgb(${player?.team.primaryRgb})` }}>
          {player?.team.name ?? 'You'}
        </span>
        <span className="text-ink-muted">vs</span>
        <span style={{ color: `rgb(${opponent?.team.primaryRgb})` }}>
          {opponent?.team.name ?? 'CPU'}
        </span>
      </div>
      <div
        key={secondsLeft}
        className="animate-score-pop font-display text-7xl font-bold text-neon sm:text-8xl"
      >
        {secondsLeft > 0 ? secondsLeft : 'KICK OFF'}
      </div>
      <p className="text-sm text-ink-muted">10 questions · 6 mini-games · one scoreline</p>
    </div>
  );
}
