import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const A = { id: 'a', name: 'Delta1', propFirmSlug: 'delta_india' };
const B = { id: 'b', name: 'Kalp26', propFirmSlug: 'delta_india' };
const guard = { openTrades: {} };
vi.mock('react-router-dom', () => ({ useNavigate: () => () => {} }));
vi.mock('../../../context/TradingAccountContext', () => ({
  useTradingAccounts: () => ({ accounts: [A, B], selectedAccount: A, setSelectedTradingAccountId: () => {} }),
}));
vi.mock('../../../context/GuardContext', () => ({
  useGuard: () => ({ ...guard, stateFor: () => ({ describe: { tone: 'mint', label: 'Armed' } }) }),
}));

import AccountSwitcher from './AccountSwitcher';

describe('account switcher — trades open on another account (21 Nov 2026)', () => {
  it('flags trades open on the account NOT on screen, before opening the list', () => {
    guard.openTrades = { b: 13 };
    render(<AccountSwitcher />);
    expect(screen.getByLabelText('13 trades open on your other account').textContent).toContain('+13');
  });

  it('names the count on that account in the list', () => {
    guard.openTrades = { b: 13 };
    render(<AccountSwitcher />);
    fireEvent.click(screen.getByRole('button', { name: /Delta1/ }));
    expect(screen.getByText('13 open')).toBeTruthy();
  });

  it('says nothing when only the account on screen has trades open (the page shows them)', () => {
    guard.openTrades = { a: 2 };
    const { container } = render(<AccountSwitcher />);
    expect(container.querySelector('[data-open-elsewhere]')).toBeNull();
  });
});
