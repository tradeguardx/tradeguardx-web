import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The site offer comes from payments-service (GET /offers/active), not env.
 * Fails closed: anything but a well-formed live offer is "no offer".
 */

vi.mock('./config', () => ({ resolvePaymentsApiBaseUrl: () => 'http://payments.test' }));
const apiGet = vi.fn();
vi.mock('./httpClient', () => ({ apiGet: (...a) => apiGet(...a) }));

const { fetchActiveOffer, loadActiveOffer, normalizeOffer, __resetOfferCache } = await import('./offersApi');

const DIWALI = {
  code: 'DIWALI30',
  headline: 'DIWALI OFFER',
  title: null,
  theme: 'diwali',
  discountPct: 30,
  cycles: 1,
  intervals: ['monthly', 'quarterly', 'yearly'],
  audience: 'in',
  startsAt: '2026-11-01T15:00:00.000Z',
  endsAt: '2026-11-08T18:29:59.000Z',
};

beforeEach(() => {
  __resetOfferCache();
  apiGet.mockReset();
});
afterEach(() => vi.useRealTimers());

describe('fetchActiveOffer', () => {
  it('reads the contract shape from the payments base, no auth', async () => {
    apiGet.mockResolvedValue({ success: true, data: { offer: DIWALI } });
    const offer = await fetchActiveOffer();
    expect(apiGet).toHaveBeenCalledWith('/offers/active', expect.objectContaining({ baseUrl: 'http://payments.test' }));
    expect(apiGet.mock.calls[0][1].headers?.Authorization).toBeUndefined();
    expect(offer).toMatchObject({
      code: 'DIWALI30', discountPct: 30, cycles: 1, audience: 'in', theme: 'diwali',
      intervals: ['monthly', 'quarterly', 'yearly'], endsAt: Date.parse('2026-11-08T18:29:59.000Z'),
    });
  });

  it('is null when there is no offer', async () => {
    apiGet.mockResolvedValue({ success: true, data: { offer: null } });
    expect(await fetchActiveOffer()).toBeNull();
  });
});

describe('normalizeOffer fails closed', () => {
  it.each([
    ['no code', { ...DIWALI, code: '' }],
    ['bad code', { ...DIWALI, code: 'diwali 30!' }],
    ['0%', { ...DIWALI, discountPct: 0 }],
    ['95%', { ...DIWALI, discountPct: 95 }],
    ['unparseable end', { ...DIWALI, endsAt: 'soon' }],
    ['no intervals', { ...DIWALI, intervals: [] }],
    ['unknown intervals only', { ...DIWALI, intervals: ['weekly'] }],
    ['bad cycles', { ...DIWALI, cycles: 0 }],
  ])('rejects %s', (_, raw) => {
    expect(normalizeOffer(raw)).toBeNull();
  });

  it('keeps cycles null (every renewal) as null, not 0', () => {
    expect(normalizeOffer({ ...DIWALI, cycles: null }).cycles).toBeNull();
  });

  it('accepts a flat rupee amount in place of a percentage', () => {
    expect(normalizeOffer({ ...DIWALI, discountPct: null, amountOff: 299 })).toMatchObject({ amountOff: 299, discountPct: null });
    expect(normalizeOffer({ ...DIWALI, amountOff: 299 })).toBeNull(); // both set
    expect(normalizeOffer({ ...DIWALI, discountPct: null, amountOff: 0 })).toBeNull();
  });

  it('treats an unknown audience as India-only, the narrower one', () => {
    expect(normalizeOffer({ ...DIWALI, audience: 'mars' }).audience).toBe('in');
  });
});

describe('loadActiveOffer', () => {
  it('makes one request per page load however many callers ask', async () => {
    apiGet.mockResolvedValue({ data: { offer: DIWALI } });
    const [a, b] = await Promise.all([loadActiveOffer(), loadActiveOffer()]);
    await loadActiveOffer();
    expect(apiGet).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(a.code).toBe('DIWALI30');
  });

  it('is null on an error', async () => {
    apiGet.mockRejectedValue(new Error('500'));
    expect(await loadActiveOffer()).toBeNull();
  });

  it('is null after a timeout, and aborts the request', async () => {
    vi.useFakeTimers();
    let signal;
    apiGet.mockImplementation((_, opts) => { signal = opts.signal; return new Promise(() => {}); });
    const p = loadActiveOffer();
    await vi.advanceTimersByTimeAsync(5000);
    expect(await p).toBeNull();
    expect(signal.aborted).toBe(true);
  });

  it('is null under a headless prerender, without asking', async () => {
    Object.defineProperty(navigator, 'webdriver', { value: true, configurable: true });
    try {
      expect(await loadActiveOffer()).toBeNull();
      expect(apiGet).not.toHaveBeenCalled();
    } finally {
      delete navigator.webdriver;
    }
  });
});
