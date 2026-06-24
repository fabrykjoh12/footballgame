import { useMatch } from '../providers/MatchProvider.tsx';
import type { MatchErrorCode } from '../../types/match.ts';

const MESSAGES: Record<MatchErrorCode, string> = {
  ONLINE_UNAVAILABLE: 'Online play isn’t configured yet. Try a CPU match.',
  OPPONENT_LEFT: 'Your opponent left the match.',
  TRANSPORT_FAILURE: 'The connection dropped. Please try again.',
  MALFORMED_PAYLOAD: 'We received an unexpected message and stopped the match.',
  ILLEGAL_TRANSITION: 'Something went wrong setting up the match.',
};

export function ErrorScreen({ code }: { code: MatchErrorCode }) {
  const { reset } = useMatch();
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-5 text-center">
      <div className="text-5xl">⚠️</div>
      <p className="font-display text-xl font-semibold">{MESSAGES[code]}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-neon-grad px-5 py-3 font-display font-bold text-pitch-950 shadow-neon transition hover:brightness-110"
      >
        Back to menu
      </button>
    </div>
  );
}
