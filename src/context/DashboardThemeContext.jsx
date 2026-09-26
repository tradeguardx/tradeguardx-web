import { createContext, useContext, useState, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'tradeguardx-dash-theme';
const DashboardThemeContext = createContext(null);

// Dark is the default a new user lands on. Anyone who has toggled keeps their
// choice — the stored value always wins.
//
// This used to say the same thing about light while being untrue in practice:
// the effect below wrote the theme to localStorage on EVERY mount, including
// the very first, so every browser that had ever opened the dashboard was
// carrying a stored 'light' nobody had chosen. Changing this constant would
// have reached new browsers only. The effect now writes on an explicit change,
// and applyDefaultUpgradesOnce() in prefs.js clears the values already stored.
const DEFAULT_THEME = 'dark';

export function DashboardThemeProvider({ children }) {
  const [theme, setThemeRaw] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  });

  /*
   * Persist on an explicit change only — never on mount.
   *
   * The write used to live in an effect keyed on `theme`, which runs on the
   * first render too. That silently turned "the default" into "a stored value
   * the user is stuck with", and it is why changing DEFAULT_THEME on its own
   * would have done nothing for anyone who had already loaded the dashboard.
   * Leaving storage untouched until someone actually picks means the default
   * stays a default, and a future change to it reaches everybody again.
   */
  const persist = useCallback((t) => {
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch { /* private mode — the choice lasts for this session only */ }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeRaw((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      persist(next);
      return next;
    });
  }, [persist]);

  const setTheme = useCallback((t) => {
    persist(t);
    setThemeRaw(t);
  }, [persist]);

  const isDark = theme === 'dark';

  const value = useMemo(
    () => ({ theme, isDark, toggleTheme, setTheme }),
    [theme, isDark, toggleTheme, setTheme],
  );

  return (
    <DashboardThemeContext.Provider value={value}>
      {children}
    </DashboardThemeContext.Provider>
  );
}

export function useDashboardTheme() {
  const ctx = useContext(DashboardThemeContext);
  if (!ctx) throw new Error('useDashboardTheme must be used within DashboardThemeProvider');
  return ctx;
}
