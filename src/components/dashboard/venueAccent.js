/**
 * The venue's own accent, for the drawn replicas of its screens.
 *
 * Shared between the create-form replica and the after-Create replica so the
 * two pictures of one venue do not end up different colours. Falling back to
 * mint keeps a venue readable before anyone has looked at its branding.
 *
 * These are our tokens, not the venue's exact hexes: the replica should read
 * as their page without reproducing their brand colour.
 */
export function accentOf(venue) {
  const a = venue?.accent === 'amber' ? 'amber' : 'mint';
  return {
    solid: `var(--${a}-solid)`,
    line: `var(--${a}-line)`,
    tint: `var(--${a}-tint)`,
    text: `var(--${a})`,
  };
}
