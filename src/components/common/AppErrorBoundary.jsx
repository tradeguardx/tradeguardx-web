import { Component } from 'react';
import { Sentry } from '../../sentry.js';

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Keep console error for local debugging visibility.
    // eslint-disable-next-line no-console
    console.error('Unhandled UI error:', error);
    // Forward to Sentry so we see this in production. The SDK is a no-op when
    // VITE_SENTRY_DSN is not configured (local dev).
    try {
      Sentry.withScope((scope) => {
        scope.setTag('boundary', 'app-root');
        scope.setExtra('componentStack', errorInfo?.componentStack || null);
        Sentry.captureException(error);
      });
    } catch { /* noop — never let reporting take down the fallback UI */ }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center px-6">
        <div className="max-w-md w-full rounded-3xl border border-white/[0.08] bg-surface-900/80 p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-danger/10 border border-danger/30 mx-auto grid place-items-center mb-5">
            <svg className="w-6 h-6 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
            </svg>
          </div>
          <h2 className="font-display text-2xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-slate-400 text-sm mb-6">
            We hit an unexpected UI error. Reload to continue safely.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-accent text-surface-950 font-semibold hover:bg-accent-hover transition-colors"
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }
}
