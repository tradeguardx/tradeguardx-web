/**
 * The wizard exists because creating an account used to END there — nothing
 * told the user a key was still needed, so accounts sat listed and unenforced.
 * That is the worst state the product has: the dashboard shows the account and
 * nothing is being enforced on it.
 *
 * So the things worth pinning are the ORDER and that the stages are the real
 * screens rather than reduced copies of them.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Creating the account refreshes the account list before advancing, so the
// stage changes a microtask later than the click — every step is awaited.

vi.mock('../../context/TradingAccountContext', () => ({
  useTradingAccounts: () => ({
    refreshTradingAccounts: vi.fn(async () => {}),
    setSelectedTradingAccountId: vi.fn(),
  }),
}));
vi.mock('../../pages/TradingAccountsPage', () => ({
  AddAccountForm: ({ onCreated }) => (
    <button type="button" onClick={() => onCreated({ id: 'acc-new' })}>create account</button>
  ),
}));
vi.mock('../../pages/ConnectKeyPage', () => ({
  ConnectKeyFlow: ({ embedded, onConnected }) => (
    <div>
      <span>connect-flow embedded={String(embedded)}</span>
      <button type="button" onClick={() => onConnected({ ok: true })}>connect</button>
    </div>
  ),
}));
vi.mock('../../pages/AlertsPage', () => ({
  AlertsSettings: ({ embedded }) => <span>alerts embedded={String(embedded)}</span>,
}));

const { default: AddVenueWizard } = await import('./AddVenueWizard');

function mount(props = {}) {
  const onDone = vi.fn();
  render(
    <AddVenueWizard
      accessToken="tok"
      supportedProps={[{ brokerId: 'delta_india' }]}
      propsLoading={false}
      toast={{ success: vi.fn() }}
      onCancel={vi.fn()}
      onDone={onDone}
      {...props}
    />,
  );
  return { onDone };
}

describe('adding a venue', () => {
  it('starts on the account stage', () => {
    mount();
    expect(screen.getByText('Name the account')).toBeTruthy();
    expect(screen.queryByText(/connect-flow/)).toBeNull();
  });

  it('goes account → key → alerts, in that order', async () => {
    mount();
    fireEvent.click(screen.getByText('create account'));
    expect(await screen.findByText('Connect the key')).toBeTruthy();
    fireEvent.click(screen.getByText('connect'));
    expect(await screen.findByText(/alerts embedded=true/)).toBeTruthy();
  });

  it('uses the real connect screen, embedded — not a second copy of it', async () => {
    // A wizard with its own simplified connect form would be a second
    // implementation of the most important step in the product, and it would
    // drift from the real one within a release.
    mount();
    fireEvent.click(screen.getByText('create account'));
    expect(await screen.findByText('connect-flow embedded=true')).toBeTruthy();
  });

  it('lets someone leave without a key, and names the cost', async () => {
    // A real choice — they may not have the venue open. "Skip" would hide what
    // it costs; this says it.
    mount();
    fireEvent.click(screen.getByText('create account'));
    expect(await screen.findByText(/connect the key later/i)).toBeTruthy();
  });

  it('finishes from the alerts stage', async () => {
    const { onDone } = mount();
    fireEvent.click(screen.getByText('create account'));
    fireEvent.click(await screen.findByText('connect'));
    fireEvent.click(await screen.findByText('Done'));
    expect(onDone).toHaveBeenCalled();
  });
});
