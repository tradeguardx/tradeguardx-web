import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * What is worth pinning here is the ORDER, that the steps are the real
 * screens, and that billing is skipped for someone who has already paid.
 *
 * Ported from the modal wizard this replaced — the behaviour outlived the
 * dialog it used to live in.
 */

vi.mock('../api/tradingAccountsApi', () => ({
  fetchSupportedProps: () => Promise.resolve([{ brokerId: 'delta_india', name: 'Delta', status: 'active' }]),
}));
vi.mock('./TradingAccountsPage', () => ({
  AddAccountForm: ({ onCreated }) => (
    <button type="button" onClick={() => onCreated({ id: 'acc-new' })}>create account</button>
  ),
}));
vi.mock('./ConnectKeyPage', () => ({
  ConnectKeyFlow: ({ embedded, onConnected }) => (
    <div>
      <span>connect-flow embedded={String(embedded)}</span>
      <button type="button" onClick={() => onConnected({ ok: true })}>connect</button>
    </div>
  ),
}));
vi.mock('../components/dashboard/billing/BillingStep', () => ({
  default: () => <span>billing step</span>,
}));
vi.mock('../components/dashboard/VenueMark', () => ({ default: () => <span /> }));

const auth = { session: { access_token: 't' }, user: { access: 'none', isTrial: false } };
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../context/GuardContext', () => ({ useGuard: () => ({ selected: { gaps: [] }, refresh: vi.fn() }) }));

const accountsCtx = {
  accounts: [],
  selectedAccount: null,
  refreshTradingAccounts: vi.fn(),
  setSelectedTradingAccountId: vi.fn(),
};
vi.mock('../context/TradingAccountContext', () => ({ useTradingAccounts: () => accountsCtx }));

const { default: SetupPage } = await import('./SetupPage');

const mount = () => render(<MemoryRouter><SetupPage /></MemoryRouter>);

beforeEach(() => {
  auth.user = { access: 'none', isTrial: false };
});

describe('setup, as a page', () => {
  it('starts by asking which exchange', async () => {
    mount();
    expect(await screen.findByText('Which exchange do you trade on?')).toBeTruthy();
    expect(screen.queryByText(/connect-flow/)).toBeNull();
  });

  it('goes venue → name → key → billing, in that order', async () => {
    mount();
    fireEvent.click(await screen.findByText('Delta'));
    expect(await screen.findByText('create account')).toBeTruthy();
    fireEvent.click(screen.getByText('create account'));
    expect(await screen.findByText(/connect-flow embedded=true/)).toBeTruthy();
    fireEvent.click(screen.getByText('connect'));
    /* Billing sits after the key: the balance is read from the key, so this is
       the first point the ask can name their own daily limit. */
    expect(await screen.findByText('billing step')).toBeTruthy();
  });

  /* Rules and alerts are editable afterwards and alerts are optional by
     design, so they are Overview's job. Putting them here made onboarding
     half as long again for the two steps that lose nothing by waiting. */
  it('stops at billing — rules and alerts are not part of it', async () => {
    mount();
    fireEvent.click(await screen.findByText('Delta'));
    fireEvent.click(await screen.findByText('create account'));
    fireEvent.click(await screen.findByText('connect'));
    await screen.findByText('billing step');
    expect(screen.queryByText(/Alerts/)).toBeNull();
    expect(screen.queryByText(/^Rules$/)).toBeNull();
  });

  it('uses the real screens, embedded — not simplified copies', async () => {
    // A setup flow with its own connect form would be a second implementation
    // of the most important step in the product, drifting within a release.
    mount();
    fireEvent.click(await screen.findByText('Delta'));
    fireEvent.click(await screen.findByText('create account'));
    expect(await screen.findByText('connect-flow embedded=true')).toBeTruthy();
  });

  it('skips billing for someone already on a trial', async () => {
    // Nothing to sell. Showing a price to a paying customer and making them
    // dismiss it is worse than not showing it at all.
    auth.user = { access: 'trial', isTrial: true };
    mount();
    fireEvent.click(await screen.findByText('Delta'));
    fireEvent.click(await screen.findByText('create account'));
    fireEvent.click(await screen.findByText('connect'));
    await screen.findByText('Set up your guard');
    expect(screen.queryByText('billing step')).toBeNull();
  });

  it('names what each skip costs, rather than saying "skip"', async () => {
    mount();
    fireEvent.click(await screen.findByText('Delta'));
    fireEvent.click(await screen.findByText('create account'));
    expect(await screen.findByText(/connect the key later/i)).toBeTruthy();
  });
});
