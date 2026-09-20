import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DEFAULT_PREFS, readPrefs, writePrefs } from '../lib/prefs';

const PrefsContext = createContext(null);

export function PrefsProvider({ children }) {
  const [prefs, setPrefsState] = useState(() => readPrefs());

  const setPref = useCallback((key, value) => {
    setPrefsState((prev) => {
      const next = { ...prev, [key]: value };
      writePrefs(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setPrefsState({ ...DEFAULT_PREFS });
    writePrefs({ ...DEFAULT_PREFS });
  }, []);

  const value = useMemo(() => ({ prefs, setPref, reset }), [prefs, setPref, reset]);
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used within PrefsProvider');
  return ctx;
}
