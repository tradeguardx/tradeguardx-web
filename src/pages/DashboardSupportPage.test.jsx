import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { OPEN_SUPPORT_EVENT } from '../components/support/supportBus';

let account = { id: 'acc-1', name: 'Main' };
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { email: 'trader@example.com' } }) }));
vi.mock('../context/TradingAccountContext', () => ({ useTradingAccounts: () => ({ selectedAccount: account }) }));
vi.mock('../lib/analytics', () => ({ trackCtaClick: vi.fn() }));

const { default: DashboardSupportPage } = await import('./DashboardSupportPage');

describe('dashboard support page', () => {
  const opened = vi.fn();
  const listen = (e) => opened(e.detail);
  beforeEach(() => {
    account = { id: 'acc-1', name: 'Main' };
    opened.mockReset();
    window.addEventListener(OPEN_SUPPORT_EVENT, listen);
  });
  afterEach(() => window.removeEventListener(OPEN_SUPPORT_EVENT, listen));

  it('opens the AI on the conversation, not the contact form', () => {
    render(<DashboardSupportPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Start chat' }));
    expect(opened).toHaveBeenCalledTimes(1);
    expect(opened.mock.calls[0][0].view).toBe('chat');
  });

  it('asks a suggested question straight away', () => {
    render(<DashboardSupportPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Why is my account locked?' }));
    expect(opened.mock.calls[0][0]).toMatchObject({ view: 'chat', ask: 'Why is my account locked?' });
  });

  it('links Telegram and WhatsApp with who is asking already typed', () => {
    render(<DashboardSupportPage />);
    const tg = new URL(screen.getByRole('link', { name: 'Open Telegram' }).href);
    const wa = new URL(screen.getByRole('link', { name: 'Open WhatsApp' }).href);
    expect(tg.origin + tg.pathname).toBe('https://t.me/tradeguardx');
    expect(wa.origin + wa.pathname).toBe('https://wa.me/918820285150');
    for (const u of [tg, wa]) {
      expect(u.searchParams.get('text')).toContain('trader@example.com');
      expect(u.searchParams.get('text')).toContain('Account: Main');
    }
  });

  it('needs an account before the AI has anything to answer from', () => {
    account = null;
    render(<DashboardSupportPage />);
    expect(screen.getByRole('button', { name: 'Start chat' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Open WhatsApp' })).toBeTruthy();
  });
});
