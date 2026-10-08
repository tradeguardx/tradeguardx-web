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
const guardCtx = { selected: { gaps: [] }, refresh: vi.fn() };
vi.mock('../context/GuardContext', () => ({ useGuard: () => guardCtx }));

const accountsCtx = {
  accounts: [],
  selectedAccount: null,
  refreshTradingAccounts: vi.fn(),
  setSelectedTradingAccountId: vi.fn(),
};
vi.mock('../context/TradingAccountContext', () => ({ useTradingAccounts: () => accountsCtx }));

const { default: SetupPage } = await import('./SetupPage');

const mount = (path = '/dashboard/setup') => render(<MemoryRouter initialEntries={[path]}><SetupPage /></MemoryRouter>);

beforeEach(() => {
  auth.user = { access: 'none', isTrial: false };
  accountsCtx.accounts = [];
  accountsCtx.selectedAccount = null;
  guardCtx.selected = { gaps: [] };
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

  it('skips billing for someone whose payment method is already attached', async () => {
    // Nothing to sell. Showing a price to a paying customer and making them
    // dismiss it is worse than not showing it at all.
    auth.user = { access: 'trial', isTrial: true, trialAutoRenews: true };
    mount();
    fireEvent.click(await screen.findByText('Delta'));
    fireEvent.click(await screen.findByText('create account'));
    fireEvent.click(await screen.findByText('connect'));
    await screen.findByText('Set up your guard');
    expect(screen.queryByText('billing step')).toBeNull();
  });

  /*
   * This case used to be folded into the one above, because the check was
   * `isTrial` — true for a legacy no-card trial as well. Those users saw
   * billing already ticked and the flow skipped the step entirely, so it
   * never asked, and the day the trial lapsed the guard simply stopped.
   */
  it('still asks a no-card trialist for billing', async () => {
    auth.user = { access: 'trial', isTrial: true, trialAutoRenews: false };
    mount();
    fireEvent.click(await screen.findByText('Delta'));
    fireEvent.click(await screen.findByText('create account'));
    fireEvent.click(await screen.findByText('connect'));
    expect(await screen.findByText('billing step')).toBeTruthy();
  });

  /* Cancelled is not unattached: the method is still there, they told us to
     stop using it, and setup is not where that gets fixed. */
  it('skips billing for someone who cancelled but still has a method', async () => {
    auth.user = { access: 'trial', isTrial: true, trialAutoRenews: false, subscriptionCanceled: true };
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

/**
 * ADDING ANOTHER ACCOUNT IS NOT RESUMING THE LAST ONE.
 *
 * Resume lands on the first undone step, which is right for someone coming
 * back to finish. For "Add another account" it meant a user with one
 * half-finished account was dropped onto Connect key for the account they
 * already had — there was no way to create a second one at all.
 */
describe('a second account', () => {
  const existing = { id: 'acc-1', name: 'Shark', venueSlug: 'shark' };

  it('resumes an unfinished account when that is what they came back for', async () => {
    accountsCtx.accounts = [existing];
    accountsCtx.selectedAccount = existing;
    /* The account exists but its key does not — the state this page is for. */
    guardCtx.selected = { gaps: [{ key: 'key' }] };
    mount('/dashboard/setup');
    expect(await screen.findByText('connect-flow embedded=true')).toBeTruthy();
  });

  it('starts from the exchange picker when they asked for a new one', async () => {
    accountsCtx.accounts = [existing];
    accountsCtx.selectedAccount = existing;
    guardCtx.selected = { gaps: [{ key: 'key' }] };
    mount('/dashboard/setup?new=1');
    /* The picker, not the key form for the account they already had. */
    expect(await screen.findByText('Delta')).toBeTruthy();
    expect(screen.queryByText('connect-flow embedded=true')).toBeNull();
  });

  it('walks the new account through its own steps', async () => {
    accountsCtx.accounts = [existing];
    accountsCtx.selectedAccount = existing;
    guardCtx.selected = { gaps: [{ key: 'key' }] };
    mount('/dashboard/setup?new=1');
    fireEvent.click(await screen.findByText('Delta'));
    expect(await screen.findByText('create account')).toBeTruthy();
  });
});
