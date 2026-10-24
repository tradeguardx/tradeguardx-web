import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * Exness is out of the tax centre scope. The page must say so and fetch
 * nothing — a report of zeros for a venue we do not import reads as "you owe
 * nothing", which is the one thing it must never imply.
 */

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ session: { access_token: 't' } }) }));
vi.mock('../context/TradingAccountContext', () => ({
  useTradingAccounts: () => ({ accounts: [], selectedAccount: { id: 'acc-ex', name: 'Exness main', propFirmSlug: 'exness' } }),
}));
const fetchTaxSummary = vi.fn();
vi.mock('../api/tradesApi', () => ({
  fetchTaxSummary: (...a) => fetchTaxSummary(...a),
  fetchTaxPositions: vi.fn(),
}));

const TaxPage = (await import('./TaxPage')).default;

describe('tax centre on an Exness account', () => {
  it('says Exness is not covered and requests no tax summary', async () => {
    render(<TaxPage />);
    expect(await screen.findByText('Exness is not covered by the tax centre')).toBeInTheDocument();
    expect(screen.getByText(/revenge report work on Exness as normal/)).toBeInTheDocument();
    expect(fetchTaxSummary).not.toHaveBeenCalled();
    expect(screen.queryByText('CA report')).toBeNull();
  });
});
