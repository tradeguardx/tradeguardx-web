/**
 * When a trading day rolls over — which is also when a daily lock lifts.
 *
 * Every daily rule (daily loss, max trades, profit target) holds the account
 * until its next reset, so the reset time IS the release time. That makes it a
 * risk decision, not a formatting preference:
 *
 *   CoinDCX released at 00:00 local and handed a tilted trader the account
 *   back inside the same session. Delta released at 05:30 IST and forced an
 *   actual break. Delta was right, and migration 037 moved CoinDCX to match.
 *
 * Both Indian venues express that as 00:00 UTC, which only reads as early
 * morning because the trader is in India. On a global venue the same default
 * lands at midnight in London and 19:00 the previous evening in New York —
 * worse than the CoinDCX behaviour 037 removed. So the rule generalises to
 * "early morning where the TRADER is", not where the venue is.
 */

/**
 * Early morning, local to whoever is trading. Late enough that a lock survives
 * the night it was earned, early enough that the next session starts clean.
 *
 * For an Indian trader this is the same instant as the 00:00 UTC that Delta
 * and CoinDCX already use, so nothing moves for them. Expressed as a local
 * time it also stays early morning across DST, which a fixed UTC offset does
 * not.
 */
export const EXCHANGE_RESET_LOCAL = '05:30';

/** The trader's IANA zone, or '' when the browser will not say. */
export function browserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    // Locked-down or exotic runtime. Callers fall back to the venue default.
    return '';
  }
}

/**
 * What the create-account form should pre-fill.
 *
 * A prop firm publishes its own daily reset and we have to match it — that
 * schedule belongs to the firm and moving it would put our accounting out of
 * step with theirs. An exchange imposes nothing, so the choice is ours and the
 * trader's location is the only thing that should decide it.
 *
 * @param venue  a `supported-props` row: { equityMode, defaultTimezone, defaultResetTimeLocal }
 * @param tz     override for the trader's zone; defaults to the browser's
 */
export function resetDefaultsFor(venue, tz = browserTimezone()) {
  if (!venue) return { timezone: tz || 'UTC', resetTime: EXCHANGE_RESET_LOCAL };
  if (venue.equityMode === 'funded') {
    return {
      timezone: venue.defaultTimezone || 'UTC',
      resetTime: venue.defaultResetTimeLocal || '00:00',
    };
  }
  return {
    timezone: tz || venue.defaultTimezone || 'UTC',
    resetTime: EXCHANGE_RESET_LOCAL,
  };
}
