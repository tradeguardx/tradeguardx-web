import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * BloFin is out of the tax centre's scope. The page must say so and fetch
 * nothing — a report of zeros for a venue we do not import reads as "you owe
 * nothing", which is the one thing it must never imply.
 */

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ session: { access_token: 't' } }) }));
vi.mock('../context/TradingAccountContext', () => ({
  useTradingAccounts: () => ({ accounts: [], selectedAccount: { id: 'acc-bf', name: 'BloFin main', propFirmSlug: 'blofin' } }),
}));
const fetchTaxSummary = vi.fn();
vi.mock('../api/tradesApi', () => ({
  fetchTaxSummary: (...a) => fetchTaxSummary(...a),
  fetchTaxPositions: vi.fn(),
}));

const TaxPage = (await import('./TaxPage')).default;

describe('tax centre on a BloFin account', () => {
  it('says BloFin is not covered and requests no tax summary', async () => {
    render(<TaxPage />);
    expect(await screen.findByText('BloFin is not covered by the tax centre')).toBeInTheDocument();
    expect(screen.getByText(/revenge report work on BloFin as normal/)).toBeInTheDocument();
    expect(fetchTaxSummary).not.toHaveBeenCalled();
    expect(screen.queryByText('CA report')).toBeNull();
  });
});
