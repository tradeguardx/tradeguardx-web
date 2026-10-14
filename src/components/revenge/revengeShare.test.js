import { describe, expect, it } from 'vitest';
import { moneyShort, oneIn, shareCaption, shareStats } from './revengeShare';

const report = {
  score: 43, grade: 'revengeProne', currency: 'INR',
  worstDay: { pnl: -57660 },
  checks: [
    { id: 'cost', status: 'warning', weight: 10, value: 19 },
    { id: 'reentry', status: 'problem', weight: 25, value: 33 },
    { id: 'sizeUp', status: 'problem', weight: 20, value: 2.4 },
    { id: 'tiltDays', status: 'warning', weight: 15, value: 3 },
    { id: 'sameCoin', status: 'na', weight: 15, value: null },
  ],
};

describe('revenge share card', () => {
  it('shows three of their numbers, worst first, and no money by default', () => {
    const s = shareStats(report);
    expect(s.map((x) => x.key)).toEqual(['reentry', 'sizeUp', 'tiltDays']);
    expect(s.map((x) => x.big).join(' ')).not.toMatch(/₹/);
  });

  it('puts the worst day in money only when they switch amounts on', () => {
    const s = shareStats(report, { amounts: true });
    expect(s[2]).toMatchObject({ key: 'worstDay', small: 'my worst day' });
    expect(s[2].big).toMatch(/₹57,660/);
  });

  it('captions the score, the grade and their worst number, then asks', () => {
    expect(shareCaption(report, 'tradeguardx.com')).toBe(
      "My revenge score: 43/100 — revenge-prone. 33% of my losses, I was back in within 15 min. What's yours? tradeguardx.com",
    );
  });

  it('says "1 in 3" and short money the way a post needs it', () => {
    expect(oneIn(33)).toBe('1 in 3');
    expect(oneIn(100)).toBe('Every');
    expect(oneIn(0)).toBeNull();
    expect(moneyShort(-57660, 'INR')).toBe('−₹57.7k');
    expect(moneyShort(-250000, 'INR')).toBe('−₹2.5L');
    expect(moneyShort(1200, 'USD')).toBe('+$1.2k');
  });
});
