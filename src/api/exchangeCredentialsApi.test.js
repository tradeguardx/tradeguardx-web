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
