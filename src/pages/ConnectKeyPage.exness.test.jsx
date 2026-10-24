import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * The connect step for Exness: four inputs — API key, a multi-line private
 * key, the account ID (required, digits) and the API host (optional). Each
 * required one gates the button, and all of them reach the API.
 */

let account = { id: 'acc-1', name: 'Exness main', propFirmSlug: 'exness' };
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

Element.prototype.scrollIntoView = vi.fn();

const { ConnectKeyFlow } = await import('./ConnectKeyPage');

// One line, as Key Management shows the Secret Key.
const PEM = '9f1c2e3d4b5a69788796a5b4c3d2e1f00112233445566778899aabbccddeeff0';

function renderFlow() {
  render(<MemoryRouter><ConnectKeyFlow /></MemoryRouter>);
}

describe('connect an Exness key', () => {
  beforeEach(() => {
    connect.mockReset();
    connect.mockResolvedValue({ status: 'active', enforcementCapable: true });
    account = { id: 'acc-1', name: 'Exness main', propFirmSlug: 'exness' };
  });

  it('says MT4/MT5 is not supported before anyone makes a key', () => {
    renderFlow();
    expect(screen.getByText(/MT4 and MT5 accounts are not supported/)).toBeInTheDocument();
  });

  it('asks for API Key, Secret Key and account ID; all are sent', async () => {
    renderFlow();
    fireEvent.click(screen.getByText('Paste the API Key, Secret Key and account ID here'));

    const secret = screen.getByLabelText('Secret Key');
    expect(secret.tagName).toBe('INPUT');
    expect(secret).toHaveAttribute('spellcheck', 'false');
    expect(secret.getAttribute('autocomplete')).toMatch(/^off/);

    fireEvent.change(screen.getByLabelText('API key'), { target: { value: 'exnsk-abc' } });
    fireEvent.change(secret, { target: { value: PEM } });

    const btn = screen.getByRole('button', { name: 'Connect and check' });
    // No account ID yet: the key is scoped to one account and we need its number.
    expect(btn).toBeDisabled();

    const acct = screen.getByLabelText(/^Account ID/);
    fireEvent.change(acct, { target: { value: '12ab' } });
    expect(btn).toBeDisabled();
    expect(screen.getByText('The account number only, e.g. #21000088861.')).toBeInTheDocument();

    // As Exness shows it in "Linked account(s)": with a leading #.
    fireEvent.change(acct, { target: { value: '#12345678' } });
    // No host to type: the server finds the account's Exness host itself.
    expect(screen.queryByLabelText(/^API host/)).toBeNull();
    expect(btn).toBeEnabled();
    fireEvent.click(btn);

    await waitFor(() => expect(connect).toHaveBeenCalledTimes(1));
    expect(connect.mock.calls[0][0]).toMatchObject({
      accountId: 'acc-1',
      exchange: 'exness',
      apiKey: 'exnsk-abc',
      apiSecret: PEM,
      // Raw as typed; extraFieldsPayload strips the # when the request is built.
      venueFields: { accountId: '#12345678' },
    });
  });

  it('does not split a pasted PEM into key and secret', () => {
    renderFlow();
    fireEvent.click(screen.getByText('Paste the API Key, Secret Key and account ID here'));
    const key = screen.getByLabelText('API key');
    fireEvent.change(key, { target: { value: `exnsk-abcdefghijklmnopqrstuvwxyz ${PEM}` } });
    expect(screen.getByLabelText('Secret Key').value).toBe('');
  });

  it('draws the Exness form with the Info key left off and our IP', () => {
    renderFlow();
    fireEvent.click(screen.getByText('Fill it in and create the key'));
    expect(screen.getByText('Info key')).toBeInTheDocument();
    expect(screen.getByText('Trading key')).toBeInTheDocument();
    expect(screen.getByText('13.205.214.83')).toBeInTheDocument();
  });

  it('keeps the other venues on two one-line fields with no extras', () => {
    account = { id: 'acc-2', name: 'Shark main', propFirmSlug: 'shark' };
    renderFlow();
    fireEvent.click(screen.getByText('Paste the key and secret here'));
    expect(screen.getByLabelText('API secret').tagName).toBe('INPUT');
    expect(screen.queryByLabelText(/^Account ID/)).toBeNull();
    expect(screen.queryByLabelText(/^API host/)).toBeNull();
    expect(screen.queryByText(/MT4/)).toBeNull();
  });
});
