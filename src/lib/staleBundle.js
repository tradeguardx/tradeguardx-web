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

const CHECK_EVERY_MS = 5 * 60_000;

/** The entry script's hashed name in a page of HTML, e.g. "main-qASmwEv_.js". */
export function entryScriptOf(html) {
  return /\/assets\/(main-[\w-]+\.js)/.exec(String(html ?? ''))?.[1] ?? null;
}

/**
 * A tab opened before a deploy keeps running the old code for as long as it
 * stays open: navigation inside the app never reloads it, so a fix that has
 * shipped stays invisible (the replay chart kept saying "Binance 400" in a tab
 * from before its fix). Every few minutes, and when the tab comes back into
 * view, ask the server which entry script it serves now. If that changed, the
 * next in-app navigation becomes a real page load. Never mid-page, so nothing
 * half-typed is lost.
 */
export function installDeployWatch({ fetchHtml = () => fetch('/', { cache: 'no-store' }).then((r) => r.text()) } = {}) {
  const running = entryScriptOf(document.querySelector('script[type="module"][src*="/assets/main-"]')?.outerHTML);
  if (!running) return; // dev server, tests
  let deployed = false;
  let lastCheck = 0;

  const check = () => {
    if (deployed || Date.now() - lastCheck < CHECK_EVERY_MS) return;
    lastCheck = Date.now();
    fetchHtml()
      .then((html) => {
        const served = entryScriptOf(html);
        if (served && served !== running) deployed = true;
      })
      .catch(() => {});
  };

  const pushState = window.history.pushState.bind(window.history);
  window.history.pushState = (state, title, url) => {
    if (deployed && url != null) {
      window.location.assign(url);
      return;
    }
    pushState(state, title, url);
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check();
  });
  setInterval(check, CHECK_EVERY_MS);
}
