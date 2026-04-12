/**
 * Human-readable rule catalog for marketing / overview (mirrors DB rule_templates slugs).
 */
export const CONFIGURABLE_RULES = [
  {
    slug: 'daily-loss',
    name: 'Daily Loss Protection',
    description:
      'Blocks new trades when daily loss approaches or hits your limit; optional warning before the hard stop.',
    tiers: 'all',
  },
  {
    slug: 'hedging',
    name: 'Hedging Prevention',
    description: 'Blocks opening opposite-side positions on the same symbol to match typical prop firm rules.',
    tiers: 'all',
  },
  {
    slug: 'stop-loss-alert',
    name: 'Stop Loss Protection',
    description:
      'If a new position has no stop loss, alerts you after a short delay so you can add protection.',
    tiers: 'all',
  },
  {
    slug: 'risk-per-trade',
    name: 'Risk Per Trade',
    description: 'Caps how much of the account you risk on each individual trade.',
    tiers: 'pro',
  },
  {
    slug: 'max-total-loss',
    name: 'Max Drawdown Lock',
    description: 'Locks trading when total drawdown exceeds your configured threshold.',
    tiers: 'pro',
  },
  {
    slug: 'stacking',
    name: 'Stacking Control',
    description: 'Limits how many positions can be open at once to reduce correlated risk.',
    tiers: 'pro',
  },
  {
    slug: 'max-trades-day',
    name: 'Max Trades Per Day',
    description: 'Caps trades per session to reduce overtrading and revenge trades.',
    tiers: 'pro',
  },
  {
    slug: 'close-after-losses',
    name: 'Close After N Losses',
    description: 'Stops new trades after a streak of losses so you can reset.',
    tiers: 'pro',
  },
  {
    slug: 'minimum-hold',
    name: 'Minimum Hold (Anti–Early Close)',
    description: 'Blocks fully closing a position until it has been open for at least your set time.',
    tiers: 'pro',
  },
  {
    slug: 'htf-minimum',
    name: 'Higher Timeframe (HTF) Minimum',
    description:
      'New trades: blocked when your chart interval is below the configured minutes (when detectable). Closes: blocked until the position has been open at least that many minutes — click shows a prompt and the close does not go through.',
    tiers: 'pro',
  },
];
