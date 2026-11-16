import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./config', () => ({ resolvePaymentsApiBaseUrl: () => 'http://payments.test' }));
const apiGet = vi.fn();
const apiPost = vi.fn();
vi.mock('./httpClient', () => ({ apiGet: (...a) => apiGet(...a), apiPost: (...a) => apiPost(...a) }));

const { getReferralMe, bindReferral } = await import('./referralApi');

beforeEach(() => { apiGet.mockReset(); apiPost.mockReset(); });

describe('referral API', () => {
  it('GETs /referral/me on the payments base with the bearer token, unwrapped', async () => {
    apiGet.mockResolvedValue({ success: true, data: { code: 'ARIF4K7Q' } });
    await expect(getReferralMe({ accessToken: 'jwt' })).resolves.toEqual({ code: 'ARIF4K7Q' });
    const [path, opts] = apiGet.mock.calls[0];
    expect(path).toBe('/referral/me');
    expect(opts.baseUrl).toBe('http://payments.test');
    expect(opts.headers.Authorization).toBe('Bearer jwt');
  });

  it('POSTs the code to /referral/bind and tolerates a bare body', async () => {
    apiPost.mockResolvedValue({ bound: false, reason: 'already_bound' });
    await expect(bindReferral({ accessToken: 'jwt', code: 'ARIF4K7Q' })).resolves.toEqual({ bound: false, reason: 'already_bound' });
    expect(apiPost).toHaveBeenCalledWith('/referral/bind', { code: 'ARIF4K7Q' }, expect.objectContaining({ headers: { Authorization: 'Bearer jwt' } }));
  });

  it('refuses to call without a token', async () => {
    await expect(getReferralMe({ accessToken: null })).rejects.toThrow();
    expect(apiGet).not.toHaveBeenCalled();
  });
});
