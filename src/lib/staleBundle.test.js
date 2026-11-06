import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isStaleBundleError, reloadForStaleBundle } from './staleBundle';

describe('stale bundle', () => {
  beforeEach(() => sessionStorage.clear());

  it('recognises a missing lazy file and nothing else', () => {
    expect(isStaleBundleError(new Error('Failed to fetch dynamically imported module: https://x/assets/a.js'))).toBe(true);
    expect(isStaleBundleError(new Error('Importing a module script failed.'))).toBe(true);
    expect(isStaleBundleError(new Error("Cannot read properties of undefined (reading 'x')"))).toBe(false);
    expect(isStaleBundleError(undefined)).toBe(false);
  });

  it('reloads once, then lets the error show instead of looping', () => {
    const reload = vi.fn();
    expect(reloadForStaleBundle(reload)).toBe(true);
    expect(reloadForStaleBundle(reload)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
