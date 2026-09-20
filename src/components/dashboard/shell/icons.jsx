/**
 * Icons — exact path data from the build spec (§3C). Inline SVG, 24 viewBox,
 * fill none, currentColor, round caps/joins. Two path children; an empty d2
 * renders nothing. No icon library, no emoji, no filled/duotone icons.
 *
 * Sizes: 13–14 inline · 15–16 nav/list · 17–18 panel headers.
 * Stroke: 1.7 list · 1.75 nav · 1.8–1.9 panel · 2–2.4 emphasis.
 */

export function Icon({ d1, d2 = '', size = 16, stroke = 1.75, circle = null, className, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      style={style}
    >
      {circle && <circle cx={circle[0]} cy={circle[1]} r={circle[2]} />}
      {circle && circle.length > 3 && <circle cx={circle[3]} cy={circle[4]} r={circle[5]} />}
      {d1 && <path d={d1} />}
      {d2 && <path d={d2} />}
    </svg>
  );
}

export const ICON = {
  overview: ['M4 13h6V4H4zM14 20h6v-9h-6z', 'M4 20h6v-4H4zM14 8h6V4h-6z'],
  live: ['M3 12h4l3-7 4 14 3-7h4', ''],
  rules: ['M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6l7-3z', 'M9 12l2.2 2.2L15.5 10'],
  journal: ['M5 4h11l3 3v13H5z', 'M8 9h8M8 13h8M8 17h5'],
  trades: ['M4 6h16M4 12h16M4 18h16', ''],
  accounts: ['M3 9l9-5 9 5v11H3z', 'M9 20v-6h6v6'],
  connect: ['M9.5 14.5l5-5', 'M7 12l-2 2a3.5 3.5 0 005 5l2-2M17 12l2-2a3.5 3.5 0 00-5-5l-2 2'],
  bell: ['M12 4a5.2 5.2 0 00-5.2 5.2c0 5-2 6.3-2 6.3h14.4s-2-1.3-2-6.3A5.2 5.2 0 0012 4z', 'M10.2 18.4a2 2 0 003.6 0'],
  plan: ['M3 7h18v12H3z', 'M3 11h18M8 15h4'],
  security: ['M6 11V8.4a6 6 0 1112 0V11', 'M5 11h14v9H5z'],
  key: ['M14.5 4a5.5 5.5 0 00-5.2 7.3L4 16.6V20h3.4l5.3-5.3A5.5 5.5 0 1014.5 4z', 'M16.4 7.6h.01'],
  target: ['M12 21a9 9 0 100-18 9 9 0 000 18z', 'M12 16a4 4 0 100-8 4 4 0 000 8z'],
  bank: ['M3 9l9-5 9 5v2H3z', 'M5 11v9h14v-9M9 20v-5h6v5'],
};

/** Rule glyphs — one per rule, never a shared shield. */
export const RULE_GLYPH = {
  'daily-loss': ['M3 6l6 7 4-4 7 8', 'M21 17v-4h-4'],
  'daily-profit-target': ['M12 21a9 9 0 100-18 9 9 0 000 18z', 'M12 16a4 4 0 100-8 4 4 0 000 8z'],
  'stop-loss-alert': ['M12 4a5 5 0 00-5 5c0 5-2 6-2 6h14s-2-1-2-6a5 5 0 00-5-5z', 'M10 18a2 2 0 004 0'],
  'risk-per-trade': ['M12 3v18', 'M8 8h8v8H8z'],
  'max-total-loss': ['M3 4v16h18', 'M6 8h3v3h3v3h3v3'],
  'max-trades-day': ['M4 6h16v14H4z', 'M4 10h16M9 3v4M15 3v4'],
  'close-after-losses': ['M4 8v12M10 11v9M16 14v6', 'M3 4l18 8'],
};

/** Per-rule accents — fixed pairings (§3B). */
export const RULE_ACCENT = {
  'daily-loss': { color: 'var(--mint)', tint: 'var(--mint-tint)' },
  'daily-profit-target': { color: 'var(--mint)', tint: 'var(--mint-tint)' },
  'stop-loss-alert': { color: 'var(--amber)', tint: 'var(--amber-tint)' },
  'risk-per-trade': { color: 'var(--blue)', tint: 'rgba(31,111,208,0.12)' },
  'max-total-loss': { color: 'var(--violet)', tint: 'rgba(109,63,212,0.12)' },
  'max-trades-day': { color: 'var(--mint)', tint: 'var(--mint-tint)' },
  'close-after-losses': { color: 'var(--red)', tint: 'var(--red-tint)' },
};

export function ruleGlyph(slug) {
  const d = RULE_GLYPH[slug] ?? ICON.rules;
  return function RuleGlyph(props) {
    return <Icon d1={d[0]} d2={d[1]} stroke={1.7} {...props} />;
  };
}

export function ruleAccent(slug) {
  return RULE_ACCENT[slug] ?? { color: 'var(--ink-2)', tint: 'var(--surface-3)' };
}

// ── UI glyphs (inline, not in the map) ───────────────────────────────────
const ui = (d1, d2, stroke, circle) => (p) => <Icon d1={d1} d2={d2} stroke={stroke} circle={circle} {...p} />;

export const IcOverview = ui(...ICON.overview, 1.75);
export const IcLive = ui(...ICON.live, 1.75);
export const IcRules = ui(...ICON.rules, 1.75);
export const IcJournal = ui(...ICON.journal, 1.75);
export const IcTrades = ui(...ICON.trades, 1.75);
export const IcAccounts = ui(...ICON.accounts, 1.75);
export const IcKey = ui(...ICON.connect, 1.75);
export const IcBell = ui(...ICON.bell, 1.75);
export const IcBilling = ui(...ICON.plan, 1.75);
export const IcSecurity = ui(...ICON.security, 1.75);
export const IcTax = ui('M5 4h11l3 3v13H5z', 'M9 8h6M9 12h6', 1.75);

export const IcShield = ui('M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6l7-3z', 'M9 12l2.2 2.2L15.5 10', 2.2);
export const IcPower = ui('M12 4v7', 'M6.8 7.4a7.4 7.4 0 1010.4 0', 2.1);
export const IcPowerPanel = ui('M12 3v7', 'M6.4 6.8a8 8 0 1011.2 0', 1.8);
export const IcMenu = ui('M4 7h16M4 12h16M4 17h16', '', 1.9);
export const IcSearch = ui('M16.5 16.5L21 21', '', 1.9, [11, 11, 7]);
export const IcChevron = ui('M7 10l5 5 5-5', '', 2);
export const IcClose = ui('M6 6l12 12M18 6L6 18', '', 2.2);
export const IcCheck = ui('M5 12.5l4.5 4.5L19 7', '', 2.2);
export const IcCheckSmall = ui('M9.5 12l1.9 1.9 3.4-3.6', '', 1.75);
export const IcWarn = ui('M12 3.6L21 19H3l9-15.4z', 'M12 10v4M12 16.8h.01', 1.9);
export const IcInfo = ui('M12 11v5M12 8h.01', '', 1.7, [12, 12, 9]);
export const IcHelp = ui('M9.6 9.3a2.5 2.5 0 113.4 2.3v1.5M12 16.8h.01', '', 1.7, [12, 12, 9]);
export const IcSignOut = ui('M15 17l5-5-5-5', 'M20 12H9M11 4H5v16h6', 1.75);
export const IcPrefs = ui(
  'M19.4 14.4l.9 1.6-2.3 2.3-1.6-.9a7 7 0 01-1.7 1l-.4 1.8h-3.3l-.4-1.8a7 7 0 01-1.7-1l-1.6.9-2.3-2.3.9-1.6a7 7 0 01-.4-1.9L3.7 12l.5-1.9 1.8-.4a7 7 0 01.9-1.7l-.9-1.6L8.3 4l1.6.9a7 7 0 011.7-.9l.4-1.8h3.3',
  '', 1.75, [12, 12, 3.2],
);
export const IcSliders = ui('M4 7h8M18 7h2M4 17h4M14 17h6', '', 1.8, [15, 7, 2.2, 10, 17, 2.2]);
export const IcSun = ui('M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4', '', 1.8, [12, 12, 4.2]);
export const IcMoon = ui('M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z', '', 1.8);
export const IcTelegram = ui('M21 4L3 11l6 2.4L19 7l-7.5 8.2.6 5.3 3-3.9', '', 1.8);
export const IcStar = ui('M12 3l2.4 5.6 6.1.5-4.6 4 1.4 6-5.3-3.2-5.3 3.2 1.4-6-4.6-4 6.1-.5L12 3z', '', 2);
export const IcClock = ui('M12 21a9 9 0 100-18 9 9 0 000 18z', 'M12 7v5l3 2', 1.8);
export const IcLock = ui('M6 11V8.4a6 6 0 1112 0V11', 'M5 11h14v9H5z', 1.8);
export const IcArrow = ui('M5 12h14M13 6l6 6-6 6', '', 1.9);
