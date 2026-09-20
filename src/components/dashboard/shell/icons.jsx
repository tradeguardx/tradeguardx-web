/**
 * Stroke glyphs for the dashboard shell and rules. 1.8 stroke, currentColor,
 * sized by the caller (default 16). One distinct glyph per rule — never one
 * shared shield.
 */

function I({ size = 16, children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

// ── Nav ──────────────────────────────────────────────────────────────────
export const IcOverview = (p) => <I {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></I>;
export const IcLive = (p) => <I {...p}><path d="M3 12h4l3-7 4 14 3-7h4" /></I>;
export const IcRules = (p) => <I {...p}><path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h10M18 18h2" /><circle cx="16" cy="6" r="2" /><circle cx="8" cy="12" r="2" /><circle cx="16" cy="18" r="2" /></I>;
export const IcJournal = (p) => <I {...p}><path d="M5 4h11l3 3v13H5z" /><path d="M9 4v5h6" /><path d="M8 14h8M8 17h5" /></I>;
export const IcTrades = (p) => <I {...p}><path d="M4 19V5M4 19h16" /><path d="M8 15l3-4 3 2 4-6" /></I>;
export const IcTax = (p) => <I {...p}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></I>;
export const IcAccounts = (p) => <I {...p}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /><path d="M7 15h4" /></I>;
export const IcKey = (p) => <I {...p}><circle cx="8" cy="14" r="4" /><path d="M11 11l9-9M16 6l2 2M13 9l2 2" /></I>;
export const IcBell = (p) => <I {...p}><path d="M6 16V11a6 6 0 1112 0v5l2 2H4z" /><path d="M10 21a2 2 0 004 0" /></I>;
export const IcBilling = (p) => <I {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /><path d="M7 15h3" /></I>;
export const IcSecurity = (p) => <I {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 118 0v3" /></I>;
export const IcPrefs = (p) => <I {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" /></I>;
export const IcSearch = (p) => <I {...p}><circle cx="11" cy="11" r="6" /><path d="M20 20l-4-4" /></I>;
export const IcMenu = (p) => <I {...p}><path d="M4 7h16M4 12h16M4 17h16" /></I>;
export const IcClose = (p) => <I {...p}><path d="M6 6l12 12M18 6L6 18" /></I>;
export const IcPower = (p) => <I {...p}><path d="M18.36 6.64a9 9 0 11-12.73 0" /><path d="M12 2v10" /></I>;
export const IcChevron = (p) => <I {...p}><path d="M6 9l6 6 6-6" /></I>;
export const IcCheck = (p) => <I {...p}><path d="M5 13l4 4L19 7" /></I>;
export const IcSun = (p) => <I {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></I>;
export const IcMoon = (p) => <I {...p}><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" /></I>;
export const IcSignOut = (p) => <I {...p}><path d="M10 17l5-5-5-5M15 12H3" /><path d="M14 4h5a2 2 0 012 2v12a2 2 0 01-2 2h-5" /></I>;
export const IcArrow = (p) => <I {...p}><path d="M5 12h14M13 6l6 6-6 6" /></I>;
export const IcWarn = (p) => <I {...p}><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18h.01" /></I>;
export const IcLock = (p) => <I {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 118 0v3" /></I>;
export const IcClock = (p) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></I>;

// ── Rules: one glyph each ─────────────────────────────────────────────────
export const RULE_GLYPHS = {
  'daily-loss': (p) => <I {...p}><path d="M4 6l5 7 4-3 7 8" /><path d="M14 18h6v-6" /></I>,
  'daily-profit-target': (p) => <I {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /></I>,
  'stop-loss-alert': (p) => <I {...p}><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" /><path d="M9 12h6" /></I>,
  'risk-per-trade': (p) => <I {...p}><path d="M12 3v18" /><path d="M6 8h9a3 3 0 010 6H8a3 3 0 000 6h10" /></I>,
  'max-total-loss': (p) => <I {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 118 0v3" /><path d="M12 15v2" /></I>,
  'max-trades-day': (p) => <I {...p}><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /><path d="M9 15h6" /></I>,
  'close-after-losses': (p) => <I {...p}><path d="M5 6l14 12" /><path d="M5 12h6M5 18h6" /><circle cx="17" cy="7" r="3" /></I>,
  hedging: (p) => <I {...p}><path d="M7 7l10 10M17 7L7 17" /><circle cx="12" cy="12" r="9" /></I>,
  stacking: (p) => <I {...p}><rect x="4" y="14" width="16" height="5" rx="1.5" /><rect x="6" y="9" width="12" height="5" rx="1.5" /><rect x="8" y="4" width="8" height="5" rx="1.5" /></I>,
  'minimum-hold': (p) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></I>,
  'htf-minimum': (p) => <I {...p}><path d="M4 18l4-6 4 3 4-8 4 5" /><path d="M4 21h16" /></I>,
  _default: (p) => <I {...p}><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" /></I>,
};

export function ruleGlyph(slug) {
  return RULE_GLYPHS[slug] ?? RULE_GLYPHS._default;
}
