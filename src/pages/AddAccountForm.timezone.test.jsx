import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * The account form says when the new account's day ends, in the user's zone,
 * and lets them change it without leaving setup. Prop-firm accounts set their
 * firm's cutoff in their own fields instead.
 */

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ session: { access_token: 't' }, timezone: 'Asia/Dubai', setTimezone: vi.fn(), mirroring: false }),
}));
vi.mock('../context/TradingAccountContext', () => ({ useTradingAccounts: () => ({ accounts: [], refreshTradingAccounts: vi.fn() }) }));
vi.mock('../components/common/ToastProvider', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

const { AddAccountForm } = await import('./TradingAccountsPage');

const retail = { brokerId: 'exness', name: 'Exness', equityMode: 'live', sizes: [], status: 'active' };
const funded = { brokerId: 'ftmo', name: 'FTMO', equityMode: 'funded', sizes: [100000], defaultTimezone: 'Europe/Prague', defaultResetTimeLocal: '00:00', status: 'active' };

function renderForm(props) {
  return render(
    <MemoryRouter>
      <AddAccountForm accessToken="t" supportedProps={[retail, funded]} onCreated={vi.fn()} onCancel={vi.fn()} toast={{ success: vi.fn(), error: vi.fn() }} skipKey {...props} />
    </MemoryRouter>,
  );
}

describe('AddAccountForm daily reset', () => {
  it('shows midnight in the user zone for an exchange account, with an inline change', () => {
    const { container } = renderForm({ presetSlug: 'exness' });
    const row = container.querySelector('[data-account-reset]');
    expect(row.textContent).toMatch(/Midnight, Dubai time \(GMT\+4\)/);
    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    expect(screen.getByRole('heading', { name: 'Timezone' })).toBeInTheDocument();
  });

  it('is not shown for a prop-firm account', () => {
    const { container } = renderForm({ presetSlug: 'ftmo' });
    expect(container.querySelector('[data-account-reset]')).toBeNull();
  });
});
