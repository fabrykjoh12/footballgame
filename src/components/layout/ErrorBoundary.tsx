import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last-line render-crash guard. Without it a single component throw blanks the
 * whole app; with it the player gets a branded recovery screen and a reload
 * button. Deliberately provider-free (plain markup only) so it still renders if
 * a context provider itself is what crashed.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Local diagnostics only — there is no error-reporting backend.
    console.error('Ball Knowledge crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-5 bg-ink-900 px-6 text-center text-white">
        <div className="text-5xl" aria-hidden>
          🟥
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold">Straight red card</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-white/55">
            Something went wrong on our side of the pitch. Reload to restart the
            match — your progress is saved on this device.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl bg-pitch px-6 py-3 font-semibold text-ink-900 shadow-[0_4px_16px_-2px_rgba(22,255,122,0.40)] transition-transform active:scale-[0.97]"
        >
          Reload the app
        </button>
        <details className="max-w-md text-left text-xs text-white/30">
          <summary className="cursor-pointer text-center hover:text-white/60">
            Technical details
          </summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-white/5 p-3">
            {String(this.state.error?.stack ?? this.state.error)}
          </pre>
        </details>
      </div>
    );
  }
}
