import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry for the web app. No-op when VITE_SENTRY_DSN is not set,
 * so local development without a Sentry account stays quiet.
 *
 * Wire this in before any React render so early errors are captured.
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_APP_ENV || 'production',
    // Set release from build-time env if available (e.g. CI sets VITE_APP_VERSION
    // = git SHA), else fall back to the package version. Sentry uses this to
    // bucket errors per deploy so you can tell when a fix actually shipped.
    release: import.meta.env.VITE_APP_VERSION || undefined,
    // Performance tracing is opt-in — leave at 0 unless you want to start
    // paying attention to span/transaction quotas. Bump to 0.1 if needed.
    tracesSampleRate: 0,
    // Don't capture user input by default; broker / financial UIs are
    // sensitive. Switch to true only after a privacy review.
    sendDefaultPii: false,
    // Throw away noisy errors that aren't actionable.
    ignoreErrors: [
      // Browser extensions firing into our window
      'top.GLOBALS',
      // ResizeObserver loop noise
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
    ],
  });
}

/** Tag the current Sentry scope with a user identity (call after login). */
export function identifySentryUser(user) {
  if (!user) return;
  try {
    Sentry.setUser({
      id: user.id || null,
      email: user.email || null,
    });
  } catch { /* noop */ }
}

/** Clear the user from the Sentry scope on logout. */
export function clearSentryUser() {
  try {
    Sentry.setUser(null);
  } catch { /* noop */ }
}

export { Sentry };
