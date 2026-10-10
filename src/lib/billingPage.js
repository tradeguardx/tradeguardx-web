/**
 * Which Plan & billing page state a lifecycle case renders (lifecycle spec
 * §3.9 and each case's "Plan & billing" section).
 *
 *   s0 s2        setupEarly  the billing setup step; its CTA says "Continue setup"
 *   s3           setup       the billing setup step as it is
 *   t1 t6        trial       (no card: legacy, the existing "set up billing" card)
 *   tx           confirming  (no card: legacy, the same card)
 *   p            active
 *   pf           failed
 *   tc pc        cancelled
 *   te pe pg lf  ended       with endedFrom trial | pro | unpaid
 *   ac           comp
 *   nr           unknown
 *
 * Null when the case is unknown (older API): the page falls back to its own
 * derivation, exactly as before.
 */
export function billingPageOf(life, { autoRenews = false } = {}) {
  if (!life) return null;
  switch (life.id) {
    case 's0':
    case 's2':
      return { page: 'setupEarly' };
    case 's3':
      return { page: 'setup' };
    case 't1':
    case 't6':
      return { page: autoRenews ? 'trial' : 'legacy' };
    case 'tx':
      return { page: autoRenews ? 'confirming' : 'legacy' };
    case 'p':
      return { page: 'active' };
    case 'pf':
      return { page: 'failed' };
    case 'tc':
      return { page: 'cancelled', trial: true };
    case 'pc':
      return { page: 'cancelled', trial: false };
    case 'te':
    case 'lf':
      return { page: 'ended', endedFrom: 'trial', legacyFree: life.id === 'lf' };
    case 'pe':
      return { page: 'ended', endedFrom: 'pro' };
    case 'pg':
      return { page: 'ended', endedFrom: 'unpaid' };
    case 'ac':
      return { page: 'comp' };
    case 'nr':
      return { page: 'unknown' };
    default:
      return null;
  }
}
