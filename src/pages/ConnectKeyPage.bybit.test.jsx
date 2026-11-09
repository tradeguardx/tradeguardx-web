import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/** The connect step for Bybit: key and secret only, and its three refusals. */

const account = { id: 'acc-1', name: 'Bybit main', propFirmSlug: 'bybit' };
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

function renderFlow() {
  render(<MemoryRouter><ConnectKeyFlow /></MemoryRouter>);
}

function paste() {
  fireEvent.click(screen.getByText('Paste the API Key and Secret Key here'));
  fireEvent.change(screen.getByLabelText('API key'), { target: { value: 'bybit-key-1' } });
  fireEvent.change(screen.getByLabelText('Secret Key'), { target: { value: 'bybit-secret-1' } });
}

describe('connect a Bybit key', () => {
  beforeEach(() => {
    connect.mockReset();
    connect.mockResolvedValue({ status: 'active', enforcementCapable: true });
  });

  it('sends key and secret as exchange "bybit", with no passphrase field', async () => {
    renderFlow();
    paste();
    expect(screen.queryByLabelText(/^Passphrase/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Connect and check' }));
    await waitFor(() => expect(connect).toHaveBeenCalledTimes(1));
    expect(connect.mock.calls[0][0]).toMatchObject({ accountId: 'acc-1', exchange: 'bybit', apiKey: 'bybit-key-1', apiSecret: 'bybit-secret-1' });
  });

  it.each([
    ['KEY_READ_ONLY', 'Trading permission is not selected on this key'],
    ['KEY_IP_NOT_WHITELISTED', 'Our IP is not whitelisted on this key'],
    ['KEY_WITHDRAW_ENABLED', 'This key can withdraw funds'],
  ])('heads a %s refusal with its cause and reopens the form', async (code, heading) => {
    connect.mockRejectedValue(Object.assign(new Error('refused'), { details: { error: { code } } }));
    renderFlow();
    paste();
    fireEvent.click(screen.getByRole('button', { name: 'Connect and check' }));
    await screen.findByText(heading);
    expect(screen.queryByLabelText('API key')).toBeNull();
  });

  it('draws Bybit\'s Create New Key form: Read-Write, our IP, Orders and Positions, Withdrawal off', () => {
    renderFlow();
    expect(screen.getByText('Open API Management on Bybit')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Fill it in and create the key'));
    expect(screen.getByText('System-generated API Keys')).toBeInTheDocument();
    expect(screen.getByText('API Transaction')).toBeInTheDocument();
    expect(screen.getByText('Read-Write')).toBeInTheDocument();
    expect(screen.getByText('Only IPs with permissions granted are allowed to access the OpenAPI')).toBeInTheDocument();
    expect(screen.getByText('13.205.214.83')).toBeInTheDocument();
    expect(screen.getByText('Orders')).toBeInTheDocument();
    expect(screen.getByText('Positions')).toBeInTheDocument();
    expect(screen.getByText('Withdrawal')).toBeInTheDocument();
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });
});
