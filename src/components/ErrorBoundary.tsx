import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** Last line of defence: an unexpected render error shows a recovery screen instead of a blank app. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-[100dvh] bg-surface flex flex-col items-center justify-center text-center px-margin gap-space-sm">
        <span className="material-symbols-outlined text-[40px] text-tertiary" aria-hidden="true">
          error
        </span>
        <h1 className="font-title-lg text-title-lg text-on-surface">Something went wrong</h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">Your data is safe on this device. Reload the app to continue.</p>
        <button
          type="button"
          className="mt-space-sm h-11 px-space-lg rounded-full bg-primary text-on-primary font-label-lg text-label-lg"
          onClick={() => {
            window.location.hash = '#/';
            window.location.reload();
          }}
        >
          Reload
        </button>
      </div>
    );
  }
}
