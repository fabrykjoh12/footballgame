export function MatchmakingScreen({ mode }: { mode: 'cpu' | 'online' }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-5 text-center">
      <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-neon" />
      <p className="font-display text-lg">
        {mode === 'cpu' ? 'Warming up the CPU…' : 'Finding an opponent…'}
      </p>
    </div>
  );
}
