const KEY = 'tgx_stale_bundle_reload';
const WINDOW_MS = 60_000;

/** The browser's wording for a lazy file that no longer exists. */
export function isStaleBundleError(err) {
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported|Unable to preload/i.test(
    String(err?.message ?? err ?? ''),
  );
}

/**
 * A tab opened before a deploy asks for files the deploy removed, and the page
 * dies with "Something went wrong" until someone refreshes. Refresh for them,
 * once: if it still fails within a minute the problem is not an old tab, and
 * looping would hide the error screen behind endless reloads.
 */
export function reloadForStaleBundle(reload = () => window.location.reload()) {
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < WINDOW_MS) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    return false;
  }
  reload();
  return true;
}

export function installStaleBundleReload() {
  window.addEventListener('vite:preloadError', (e) => {
    if (reloadForStaleBundle()) e.preventDefault();
  });
}
