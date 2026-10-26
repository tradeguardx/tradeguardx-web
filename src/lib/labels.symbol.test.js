import { describe, it, expect } from 'vitest';
import { symbolLabel, instrumentOf, symbolsInText } from './labels';

describe('Exness ticket symbols', () => {
  it('labels a ticket key as instrument and side', () => {
    expect(symbolLabel('BTCUSD#long~43195554')).toBe('BTCUSD · Long');
    expect(symbolLabel('ETHUSD#short~43392093')).toBe('ETHUSD · Short');
    expect(symbolLabel('XAUUSDm#long~1')).toBe('XAUUSDm · Long');
  });

  it('leaves every other venue symbol alone', () => {
    for (const s of ['BTCUSD', 'C-BTC-81400-251026', 'B-ETH_USDT', 'P-ETH-2340-261026']) {
      expect(symbolLabel(s)).toBe(s);
      expect(instrumentOf(s)).toBe(s);
    }
    expect(symbolLabel(null)).toBe(null);
    expect(symbolLabel(undefined)).toBe(undefined);
  });

  it('gives the instrument for grouping', () => {
    expect(instrumentOf('BTCUSD#long~43195554')).toBe('BTCUSD');
    expect(instrumentOf('BTCUSD#short~43195611')).toBe('BTCUSD');
  });

  it('cleans ticket keys inside engine sentences', () => {
    expect(symbolsInText('Trade on ETHUSD#short~43392093 blocked — cooldown active.')).toBe('Trade on ETHUSD short blocked — cooldown active.');
    expect(symbolsInText('Trade closed: ETHUSD#long~43389493 • BUY · P&L: -1.82 USD')).toBe('Trade closed: ETHUSD long • BUY · P&L: -1.82 USD');
    expect(symbolsInText('Daily loss hit on BTCUSD')).toBe('Daily loss hit on BTCUSD');
    expect(symbolsInText(null)).toBe(null);
  });
});
