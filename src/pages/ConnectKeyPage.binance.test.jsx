import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/** The connect step for Binance: key and secret only, its refusals, and a phone. */

const account = { id: 'acc-1', name: 'Binance main', propFirmSlug: 'binance' };
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
  return render(<MemoryRouter><ConnectKeyFlow /></MemoryRouter>);
}

function paste() {
  fireEvent.click(screen.getByText('Paste the API Key and Secret Key here'));
  fireEvent.change(screen.getByLabelText('API key'), { target: { value: 'binance-key-1' } });
  fireEvent.change(screen.getByLabelText('Secret Key'), { target: { value: 'binance-secret-1' } });
}

describe('connect a Binance key', () => {
  beforeEach(() => {
    connect.mockReset();
    connect.mockResolvedValue({ status: 'active', enforcementCapable: true });
  });

  it('sends key and secret as exchange "binance", with no passphrase field', async () => {
    renderFlow();
    paste();
    expect(screen.queryByLabelText(/^Passphrase/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Connect and check' }));
    await waitFor(() => expect(connect).toHaveBeenCalledTimes(1));
    expect(connect.mock.calls[0][0]).toMatchObject({ accountId: 'acc-1', exchange: 'binance', apiKey: 'binance-key-1', apiSecret: 'binance-secret-1' });
  });

  it.each([
    ['KEY_READ_ONLY', 'Trading permission is not selected on this key'],
    ['KEY_IP_NOT_WHITELISTED', 'Our IP is not whitelisted on this key'],
    ['KEY_WITHDRAW_ENABLED', 'This key can withdraw funds'],
    ['BINANCE_AUTH_FAILED', 'Binance did not accept this key'],
    ['BINANCE_US_KEY', 'This is a Binance.US key'],
    ['BINANCE_DEMO_KEY', 'This is a Binance testnet or demo key'],
    ['BINANCE_REGION_BLOCKED', 'Binance blocked our connection for your region'],
    ['BINANCE_PORTFOLIO_MARGIN', "Portfolio Margin accounts aren't supported yet"],
  ])('heads a %s refusal with its cause and reopens the form', async (code, heading) => {
    connect.mockRejectedValue(Object.assign(new Error('refused'), { details: { error: { code } } }));
    renderFlow();
    paste();
    fireEvent.click(screen.getByRole('button', { name: 'Connect and check' }));
    await screen.findByText(heading);
    expect(screen.queryByLabelText('API key')).toBeNull();
  });

  it('draws both Binance screens: Create API, then Edit restrictions with Futures and our IP', () => {
    renderFlow();
    expect(screen.getByText('Open API Management on Binance')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Fill it in and create the key'));
    expect(screen.getByText('System generated')).toBeInTheDocument();
    expect(screen.getByText('Label API Key')).toBeInTheDocument();
    expect(screen.getByText(/Then: Edit restrictions/)).toBeInTheDocument();
    expect(screen.getByText('Enable Reading')).toBeInTheDocument();
    expect(screen.getByText('Enable Futures')).toBeInTheDocument();
    expect(screen.getByText('Enable Withdrawals')).toBeInTheDocument();
    expect(screen.getByText('Restrict access to trusted IPs only')).toBeInTheDocument();
    expect(screen.getByText('13.205.214.83')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });
});

describe('Binance connect page at phone width (375px)', () => {
  const realMatchMedia = window.matchMedia;
  beforeEach(() => {
    window.matchMedia = (query) => ({
      matches: /max-width:\s*(\d+)px/.test(query) && 375 <= Number(query.match(/max-width:\s*(\d+)px/)[1]),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
  });
  afterEach(() => {
    window.matchMedia = realMatchMedia;
  });

  it('shows the three path chips in one wrapping row, short enough for a phone', () => {
    renderFlow();
    const chips = ['Profile', 'API Management', 'Create API'].map((t) => screen.getByText(t, { selector: 'span' }));
    const row = chips[0].parentElement.parentElement;
    // Three taps stay a flex row that may wrap (the 2×2 grid is for four).
    expect(row.style.display).toBe('flex');
    expect(row.style.flexWrap).toBe('wrap');
    // Measured in Chrome at 375px (14 Nov 2026): the three chips and arrows
    // are ~310px wide, inside the card. Keep the labels this short.
    for (const c of chips) expect(c.textContent.length).toBeLessThanOrEqual(16);
  });

  it('says to do it on the website, and still links to the key page', () => {
    renderFlow();
    expect(screen.getByText('Do this on a laptop or desktop.')).toBeInTheDocument();
    expect(screen.getByText('Open Binance API Management')).toBeInTheDocument();
  });
});
