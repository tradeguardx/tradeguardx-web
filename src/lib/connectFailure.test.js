import { describe, expect, it } from 'vitest';
import { connectFailureTitle } from './connectFailure';

const err = (code) => ({ details: { success: false, error: { code } } });

describe('connectFailureTitle', () => {
  it('names the cause for a key without trade permission or our IP', () => {
    expect(connectFailureTitle(err('KEY_READ_ONLY'))).toMatch(/Trading permission/);
    expect(connectFailureTitle(err('KEY_IP_NOT_WHITELISTED'))).toMatch(/IP/);
  });

  it('names the Bybit refusals: a key that can withdraw, and a key Bybit rejects', () => {
    expect(connectFailureTitle(err('KEY_WITHDRAW_ENABLED'))).toBe('This key can withdraw funds');
    expect(connectFailureTitle(err('BYBIT_AUTH_FAILED'))).toBe('Bybit did not accept this key');
  });

  it.each([
    ['BINANCE_AUTH_FAILED', 'Binance did not accept this key'],
    ['BINANCE_US_KEY', 'This is a Binance.US key'],
    ['BINANCE_DEMO_KEY', 'This is a Binance testnet or demo key'],
    ['BINANCE_REGION_BLOCKED', 'Binance blocked our connection for your region'],
    ['BINANCE_PORTFOLIO_MARGIN', "Portfolio Margin accounts aren't supported yet"],
  ])('names the Binance refusal %s', (code, title) => {
    expect(connectFailureTitle(err(code))).toBe(title);
  });

  it('leaves every other failure on the generic heading', () => {
    expect(connectFailureTitle(err('DELTA_AUTH_FAILED'))).toBeNull();
    expect(connectFailureTitle(new Error('network'))).toBeNull();
    expect(connectFailureTitle(undefined)).toBeNull();
  });
});
