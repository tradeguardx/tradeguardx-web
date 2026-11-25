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
    /*
     * Throw away noise that is not ours and not actionable.
     *
     * The point of filtering is not tidiness — it is that a feed full of
     * errors nobody can fix trains you to stop reading the feed, and the one
     * real bug arrives in the middle of it.
     */
    ignoreErrors: [
      // Browser extensions firing into our window
      'top.GLOBALS',
      // ResizeObserver loop noise
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      /*
       * Facebook / Instagram in-app browser. Their webview logs
       * FBNavFirstContentfulPaint and friends to the console and talks to the
       * native side over a JS bridge; when Android garbage-collects that
       * bridge object — typically because the webview was backgrounded — the
       * next postMessage throws this. It is Facebook's instrumentation
       * failing inside Facebook's own browser. Nothing we ship causes it and
       * nothing we ship can prevent it.
       */
      'Java object is gone',
      'Error invoking postMessage',
      // Same family: iOS in-app webviews tearing down mid-navigation.
      "null is not an object (evaluating 'webkit.messageHandlers",
      // A user navigating away mid-request is not an error.
      'AbortError',
      'The operation was aborted',
      /*
       * Supabase auth's cross-tab lock: two tabs refreshing the session at
       * once, one takes the lock from the other and supabase-js retries on
       * its own. The user stays signed in; nothing for us to do (21 Nov 2026).
       */
      /Lock "lock:sb-.*-auth-token" was released because another request stole it/,
    ],
    /*
     * Errors thrown inside Vercel's own analytics scripts (21 Nov 2026: 3.3K
     * "Unexpected token '<'" from 65 users over 7 months). On our domain both
     * /_vercel/insights/script.js and its beacon answer correctly; these come
     * from visitors whose ad blocker, privacy browser or network swaps the
     * script for an HTML page. Only their page-view count is lost; the app is
     * untouched. Errors from OUR code on those pages are still reported.
     */
    denyUrls: [/\/_vercel\/insights\//, /\/_vercel\/speed-insights\//, /insights\/script/],
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
