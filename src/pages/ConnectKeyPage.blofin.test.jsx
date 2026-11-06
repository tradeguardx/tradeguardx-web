import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * The connect step for a venue whose key has a passphrase. BloFin signs every
 * request with it, so a key connected without one cannot work — the field has
 * to be there, required, and sent.
 */

let account = { id: 'acc-1', name: 'BloFin main', propFirmSlug: 'blofin' };
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ session: { access_token: 't' } }) }));
vi.mock('../context/TradingAccountContext', () => ({
  useTradingAccounts: () => ({ selectedAccount: account, refreshTradingAccounts: vi.fn() }),
}));
vi.mock('../context/GuardContext', () => ({ useGuard: () => ({ selected: { guard: 'off', connection: null }, refresh: vi.fn() }) }));
vi.mock('../components/common/ToastProvider', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));
vi.mock('../api/syncApi', () => ({ triggerHistoryBackfill: vi.fn(async () => ({})) }));

const connect = vi.fn();
vi.mock('../api/exchangeCredentialsApi', async (orig) => ({
  ...(await orig()),
  connectExchangeCredentials: (...a) => connect(...a),
}));

// jsdom has no scrollIntoView; the flow scrolls the verdict into view.
Element.prototype.scrollIntoView = vi.fn();

const { ConnectKeyFlow } = await import('./ConnectKeyPage');

function renderFlow() {
  render(<MemoryRouter><ConnectKeyFlow /></MemoryRouter>);
}

describe('connect a BloFin key', () => {
  beforeEach(() => {
    connect.mockReset();
    connect.mockResolvedValue({ status: 'active', enforcementCapable: true });
    account = { id: 'acc-1', name: 'BloFin main', propFirmSlug: 'blofin' };
  });

  it('asks for the passphrase and sends it with key and secret', async () => {
    renderFlow();
    fireEvent.click(screen.getByText('Paste the API Key, Secret Key and passphrase here'));
    fireEvent.change(screen.getByLabelText('API key'), { target: { value: 'blofin-key-1' } });
    fireEvent.change(screen.getByLabelText('Secret Key'), { target: { value: 'blofin-secret-1' } });

    const btn = screen.getByRole('button', { name: 'Connect and check' });
    // No passphrase yet: a BloFin key without one cannot sign a request.
    expect(btn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/^Passphrase/), { target: { value: 'my passphrase' } });
    expect(btn).toBeEnabled();
    fireEvent.click(btn);

    await waitFor(() => expect(connect).toHaveBeenCalledTimes(1));
    expect(connect.mock.calls[0][0]).toMatchObject({
      accountId: 'acc-1',
      exchange: 'blofin',
      apiKey: 'blofin-key-1',
      apiSecret: 'blofin-secret-1',
      passphrase: 'my passphrase',
    });
  });

  it('reopens the step that fixes a key refused for its permission', async () => {
    const refused = Object.assign(new Error('This BloFin key is read-only.'), { details: { error: { code: 'KEY_READ_ONLY' } } });
    connect.mockRejectedValue(refused);
    renderFlow();
    fireEvent.click(screen.getByText('Paste the API Key, Secret Key and passphrase here'));
    fireEvent.change(screen.getByLabelText('API key'), { target: { value: 'blofin-key-1' } });
    fireEvent.change(screen.getByLabelText('Secret Key'), { target: { value: 'blofin-secret-1' } });
    fireEvent.change(screen.getByLabelText(/^Passphrase/), { target: { value: 'my passphrase' } });
    expect(screen.getAllByText('Done').length).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole('button', { name: 'Connect and check' }));

    await screen.findByText('Trading permission is not selected on this key');
    // Only the step before the form is still ticked; the form is open again.
    expect(screen.getAllByText('Done')).toHaveLength(1);
    expect(screen.queryByLabelText('API key')).toBeNull();
  });

  it('draws BloFin form with Transfer left off', () => {
    renderFlow();
    fireEvent.click(screen.getByText('Fill it in and create the key'));
    expect(screen.getByText('Transfer')).toBeInTheDocument();
    expect(screen.getByText(/Leave Transfer off/)).toBeInTheDocument();
    expect(screen.getByText('13.205.214.83')).toBeInTheDocument();
  });

  it('follows BloFin\'s own screen: open step, numbered form, Next, then the codes', () => {
    renderFlow();
    expect(screen.getByText('Open API management on BloFin')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Fill it in and create the key'));
    expect(screen.getByText(/Fill BloFin.s Create API Key form to match the picture below/)).toBeInTheDocument();
    expect(screen.getByText('API Key Usage')).toBeInTheDocument();
    expect(screen.getByText('Connect to Third-Party Applications')).toBeInTheDocument();
    expect(screen.getByText('Read')).toBeInTheDocument();
    expect(screen.getByText('Trade')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText(/code it emails you/)).toBeInTheDocument();
  });

  it('shows no passphrase field for a venue without one', () => {
    account = { id: 'acc-2', name: 'Shark main', propFirmSlug: 'shark' };
    renderFlow();
    fireEvent.click(screen.getByText('Paste the key and secret here'));
    expect(screen.queryByLabelText(/^Passphrase/)).toBeNull();
  });
});
