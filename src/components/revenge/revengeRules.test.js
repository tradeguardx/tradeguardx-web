import { describe, expect, it } from 'vitest';
import { rulesFrom } from './revengeFormat';

const fix = (rule) => ({ rule, text: `${rule}: does a thing.` });
const check = (id, status, weight, rule) => ({ id, title: id, status, weight, fix: fix(rule) });

describe('the rule plan', () => {
  it('one entry per rule, worst finding first, with every check it answers', () => {
    const { calm, rules } = rulesFrom({ checks: [
      check('streak', 'warning', 10, 'close-after-losses'),
      check('size', 'problem', 20, 'risk-per-trade'),
      check('reentry', 'problem', 25, 'close-after-losses'),
      check('daily', 'good', 15, 'daily-loss'),
    ] });
    expect(calm).toBe(false);
    expect(rules.map((r) => r.rule)).toEqual(['close-after-losses', 'risk-per-trade']);
    expect(rules[0].because).toEqual(['reentry', 'streak']);
  });

  it('a calm trader still gets a daily loss limit and risk per trade', () => {
    const { calm, rules } = rulesFrom({ checks: [check('a', 'good', 25, 'close-after-losses'), check('b', 'good', 20, 'risk-per-trade'), check('c', 'na', 15, 'daily-loss')] });
    expect(calm).toBe(true);
    expect(rules.map((r) => r.rule)).toEqual(['daily-loss', 'risk-per-trade']);
  });
});
