import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

let mirroring = false;
vi.mock('../lib/mirror', () => ({ isMirroring: () => mirroring }));
vi.mock('./AuthContext', () => ({ useAuth: () => ({ session: { access_token: 't' } }) }));
vi.mock('../api/tradingAccountsApi', async (orig) => ({
  ...(await orig()),
  fetchTradingAccounts: async () => [{ id: 'theirs-1', name: 'Theirs' }, { id: 'theirs-2', name: 'Other' }],
}));

const { TradingAccountProvider, useTradingAccounts, LS_TRADING_ACCOUNT } = await import('./TradingAccountContext');

function Show() {
  const { selectedAccount } = useTradingAccounts();
  return <span data-testid="sel">{selectedAccount?.id ?? ''}</span>;
}
const go = () => render(<TradingAccountProvider><Show /></TradingAccountProvider>);

describe('selected account storage', () => {
  beforeEach(() => localStorage.clear());

  it('a mirror leaves the operator\'s own selected account alone', async () => {
    mirroring = true;
    localStorage.setItem(LS_TRADING_ACCOUNT, 'operators-own');
    go();
    await waitFor(() => expect(screen.getByTestId('sel').textContent).toBe('theirs-1'));
    expect(localStorage.getItem(LS_TRADING_ACCOUNT)).toBe('operators-own');
  });

  it('a normal session still remembers the choice', async () => {
    mirroring = false;
    localStorage.setItem(LS_TRADING_ACCOUNT, 'theirs-2');
    go();
    await waitFor(() => expect(screen.getByTestId('sel').textContent).toBe('theirs-2'));
    expect(localStorage.getItem(LS_TRADING_ACCOUNT)).toBe('theirs-2');
  });
});
