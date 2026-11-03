import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* The module keeps a token cache, so each test gets a fresh copy. */
let checkoutGeo;
beforeEach(async () => {
  vi.resetModules();
  ({ checkoutGeo } = await import('./geo'));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const ok = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
const IN = { country: 'IN', token: 'payload.sig' };

describe('checkoutGeo', () => {
  it('shares one request between parallel callers (setup checks three plans at once)', async () => {
    const fetch = vi.fn(() => ok(IN));
    vi.stubGlobal('fetch', fetch);
    const all = await Promise.all([checkoutGeo(), checkoutGeo(), checkoutGeo()]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(all.every((g) => g.token === 'payload.sig' && g.country === 'IN')).toBe(true);
  });

  it('retries once when the first answer has no token, instead of letting checkout 400', async () => {
    const fetch = vi.fn()
      .mockImplementationOnce(() => Promise.reject(new Error('aborted')))
      .mockImplementationOnce(() => ok(IN));
    vi.stubGlobal('fetch', fetch);
    expect((await checkoutGeo()).token).toBe('payload.sig');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('reuses a good token, but never caches a failure', async () => {
    const fetch = vi.fn(() => ok({ country: 'IN', token: null }));
    vi.stubGlobal('fetch', fetch);
    expect((await checkoutGeo()).token).toBeNull();
    fetch.mockImplementation(() => ok(IN));
    expect((await checkoutGeo()).token).toBe('payload.sig');
    const calls = fetch.mock.calls.length;
    await checkoutGeo();
    expect(fetch.mock.calls.length).toBe(calls);
  });
});
