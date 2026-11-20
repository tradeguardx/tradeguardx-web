import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { OpenTradeLockChoice, PendingLockPanel } from './LockChoice';

/**
 * The manual kill switch with a trade open (owner, 26 Oct 2026): the user
 * chooses close-now or lock-after-close instead of being told to flatten.
 */
const renderChoice = (onArm = vi.fn()) => {
  render(<OpenTradeLockChoice symbols={['BTCUSD']} hours={6} setHours={() => {}} busy={false} onArm={onArm} />);
  return onArm;
};

describe('OpenTradeLockChoice', () => {
  it('names the open trade and defaults to locking after it closes', () => {
    renderChoice();
    expect(screen.getByText(/BTCUSD is open/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Lock when this trade closes/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /Close everything now/ })).toHaveAttribute('aria-checked', 'false');
  });

  it('asks for a confirm, then arms after the close', () => {
    const onArm = renderChoice();
    fireEvent.click(screen.getByRole('button', { name: 'Arm the lockout' }));
    expect(screen.getByText(/When BTCUSD closes, you won't be able to trade this account for 6 hours/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Lock me out after this trade' }));
    expect(onArm).toHaveBeenCalledWith('after_close');
  });

  it('arms close-now when chosen, and says the trade closes at market', () => {
    const onArm = renderChoice();
    fireEvent.click(screen.getByRole('radio', { name: /Close everything now/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Arm the lockout' }));
    expect(screen.getByText(/BTCUSD will be closed at market now/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close it and lock 6h' }));
    expect(onArm).toHaveBeenCalledWith('close_now');
  });

  it('Back returns to the choice without arming', () => {
    const onArm = renderChoice();
    fireEvent.click(screen.getByRole('button', { name: 'Arm the lockout' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('button', { name: 'Arm the lockout' })).toBeInTheDocument();
    expect(onArm).not.toHaveBeenCalled();
  });
});

describe('PendingLockPanel', () => {
  it('says what it waits for, that new trades close, and that it has no cancel', () => {
    const startsBy = new Date(Date.now() + 20 * 3_600_000).toISOString();
    render(<PendingLockPanel pending={{ hours: 3, symbols: ['BTCUSD', 'ETHUSD'], requestedAt: new Date().toISOString(), startsBy }} />);
    expect(screen.getByText('Starts when BTCUSD and ETHUSD close')).toBeInTheDocument();
    expect(screen.getByText(/Any new trade on this account is closed straight away/)).toBeInTheDocument();
    expect(screen.getByText(/no cancel/)).toBeInTheDocument();
  });
});

describe('many open trades (20 Nov: nine option strikes listed twice)', () => {
  const nine = ['MV-BTC-59800-211126', 'MV-BTC-60000-211126', 'MV-BTC-60200-211126', 'MV-BTC-60400-211126', 'MV-BTC-60600-211126', 'MV-BTC-60800-211126', 'MV-BTC-61000-211126', 'MV-BTC-61200-211126', 'MV-BTC-61400-211126'];
  it('counts them instead of listing every symbol', () => {
    render(<OpenTradeLockChoice symbols={nine} hours={3} setHours={() => {}} busy={false} onArm={() => {}} />);
    expect(screen.getByText('You have 9 trades open')).toBeTruthy();
    expect(screen.getByText(/MV-BTC-59800-211126, MV-BTC-60000-211126 and 7 more are open\./)).toBeTruthy();
    expect(screen.getByText('Lock when all 9 trades close')).toBeTruthy();
    expect(screen.getByText(/We close all 9 open trades at market/)).toBeTruthy();
    expect(screen.queryByText(/MV-BTC-61400-211126/)).toBeNull();
  });
});
