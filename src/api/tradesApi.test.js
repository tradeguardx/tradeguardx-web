import { describe, expect, it, vi } from 'vitest';

/**
 * A failed request must never look like an empty account.
 *
 * fetchUnifiedTrades used to swallow the failure with `.catch(() => [])`, so an
 * unreachable trade service returned zero rows and every caller rendered "No
 * trades synced yet". A user whose sync was working fine concluded it was
 * broken — and it cost a real debugging session to find.
 */

vi.mock('./config', () => ({ TRADE_API_BASE_URL: 'http://test' }));

const apiGet = vi.fn();
vi.mock('./httpClient', () => ({
  apiGet: (...a) => apiGet(...a),
  apiPost: vi.fn(),
}));

const { fetchUnifiedTrades } = await import('./tradesApi');

const args = { accessToken: 't', tradingAccountId: 'a1' };

describe('fetchUnifiedTrades', () => {
  it('propagates a network failure instead of returning an empty list', async () => {
    apiGet.mockImplementation(async () => {
      throw new Error('Failed to fetch');
    });

    // The distinction the whole fix rests on: this must REJECT, not resolve to
    // [] — callers cannot tell "unreachable" from "none" otherwise.
    await expect(fetchUnifiedTrades(args)).rejects.toThrow('Failed to fetch');
  });

  it('still returns an empty list when the account genuinely has no trades', async () => {
    apiGet.mockResolvedValue({ success: true, data: { trades: [] } });
    await expect(fetchUnifiedTrades(args)).resolves.toEqual([]);
  });

  it('returns the journal rows when the request succeeds', async () => {
    apiGet.mockResolvedValue({
      success: true,
      data: {
        trades: [
          { id: '1', symbol: 'ETHUSD', side: 'long', openedAt: '2026-08-05T10:00:00Z', closedAt: '2026-08-05T11:00:00Z', quantity: 1, entryPrice: 100 },
          { id: '2', symbol: 'BTCUSD', side: 'short', openedAt: '2026-08-06T10:00:00Z', closedAt: '2026-08-06T11:00:00Z', quantity: 2, entryPrice: 200 },
        ],
      },
    });

    const rows = await fetchUnifiedTrades(args);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.symbol).sort()).toEqual(['BTCUSD', 'ETHUSD']);
    // Lifecycle status is inferred from closedAt rather than trusted blindly.
    expect(rows.every((r) => r.status === 'CLOSED')).toBe(true);
  });
});
