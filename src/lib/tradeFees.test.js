import { describe, expect, it } from 'vitest';
import { tradeFees } from './tradeFees';

describe('tradeFees', () => {
  it('reads the fees and net the engine recorded from the fills', () => {
    expect(tradeFees({ pnl: '-19.0526', metadata: { fees: 0.8692, netPnl: -19.9218 } })).toEqual({ fees: 0.8692, net: -19.9218 });
  });
  it('nothing to show without a positive fee (older trades, venues that book net)', () => {
    expect(tradeFees({ metadata: {} })).toBeNull();
    expect(tradeFees({ metadata: { fees: 0 } })).toBeNull();
    expect(tradeFees({})).toBeNull();
  });
  it('fees without a recorded net still show', () => {
    expect(tradeFees({ metadata: { fees: '0.3' } })).toEqual({ fees: 0.3, net: null });
  });
});
