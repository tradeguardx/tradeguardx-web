import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiPost = vi.fn();
vi.mock('./httpClient', () => ({
  apiPost: (...a) => apiPost(...a),
  apiGet: vi.fn(),
  apiDelete: vi.fn(),
}));

const { connectExchangeCredentials } = await import('./exchangeCredentialsApi');

const base = { accessToken: 't', accountId: 'acc-1', apiKey: 'key-123', apiSecret: 'secret-456' };

describe('connectExchangeCredentials', () => {
  beforeEach(() => {
    apiPost.mockReset();
    apiPost.mockResolvedValue({ success: true, data: { connection: { status: 'active' } } });
  });

  it('sends the passphrase for BloFin', async () => {
    await connectExchangeCredentials({ ...base, exchange: 'blofin', passphrase: 'my-pass' });
    const [path, body] = apiPost.mock.calls[0];
    expect(path).toBe('/trading-accounts/acc-1/exchange-credentials');
    expect(body).toEqual({ exchange: 'blofin', apiKey: 'key-123', apiSecret: 'secret-456', passphrase: 'my-pass' });
  });

  it('sends no passphrase field for venues without one', async () => {
    await connectExchangeCredentials({ ...base, exchange: 'shark' });
    const [, body] = apiPost.mock.calls[0];
    expect(body).toEqual({ exchange: 'shark', apiKey: 'key-123', apiSecret: 'secret-456' });
    expect('passphrase' in body).toBe(false);
  });
});

describe('connectExchangeCredentials — Exness', () => {
  const pem = '-----BEGIN PRIVATE KEY-----\nMC4CAQAwBQYDK2VwBCIEIA==\n-----END PRIVATE KEY-----';
  beforeEach(() => {
    apiPost.mockReset();
    apiPost.mockResolvedValue({ success: true, data: { connection: { status: 'active' } } });
  });

  it('sends the private key as apiSecret, plus accountId and host', async () => {
    await connectExchangeCredentials({
      ...base,
      exchange: 'exness',
      apiKey: 'exnsk-1',
      apiSecret: pem,
      venueFields: { accountId: '12345678', host: 'https://ap-4decef67.exness.com' },
    });
    const [path, body] = apiPost.mock.calls[0];
    // The URL carries OUR trading account; Exness's account number is in the body.
    expect(path).toBe('/trading-accounts/acc-1/exchange-credentials');
    expect(body).toEqual({
      exchange: 'exness',
      apiKey: 'exnsk-1',
      apiSecret: pem,
      accountId: '12345678',
      host: 'https://ap-4decef67.exness.com',
    });
  });

  it('leaves host out when it was not given', async () => {
    await connectExchangeCredentials({ ...base, exchange: 'exness', venueFields: { accountId: '42', host: '  ' } });
    const [, body] = apiPost.mock.calls[0];
    expect(body).toEqual({ exchange: 'exness', apiKey: 'key-123', apiSecret: 'secret-456', accountId: '42' });
    expect('host' in body).toBe(false);
  });

  it('never sends accountId or host for any other venue', async () => {
    for (const exchange of ['delta_india', 'coindcx', 'shark', 'blofin']) {
      apiPost.mockClear();
      await connectExchangeCredentials({ ...base, exchange, venueFields: { accountId: '42', host: 'https://api.exness.com' } });
      const [, body] = apiPost.mock.calls[0];
      expect('accountId' in body).toBe(false);
      expect('host' in body).toBe(false);
    }
  });
});
