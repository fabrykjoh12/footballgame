import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onReset: () => void;
}
interface State {
  hasError: boolean;
}

/**
 * Catches render-time failures so a single broken match can never blank the
 * whole app — it routes back to a friendly recovery screen instead.
 */
export class MatchErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('Match render error:', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false });
    this.props.onReset();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 px-5 text-center">
        <div className="text-5xl">🥅</div>
        <p className="font-display text-xl font-semibold">
          The match hit the woodwork.
        </p>
        <button
          type="button"
          onClick={this.handleReset}
          className="rounded-xl bg-neon-grad px-5 py-3 font-display font-bold text-pitch-950 shadow-neon"
        >
          Back to menu
        </button>
      </div>
    );
  }
}
