const INR = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** ₹1,00,000 — Indian digit grouping, no paise. */
export const inr = (n) => `₹${INR.format(Math.round(n))}`;

const DATE = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** 13 Oct 2026, read as an IST calendar date so it never slips a day. */
export const fmtDate = (iso) => DATE.format(new Date(`${iso}T00:00:00+05:30`));
