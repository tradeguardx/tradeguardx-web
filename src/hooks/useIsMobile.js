import { useEffect, useState } from 'react';

/**
 * True on phone-width viewports. Distinguishes the two Delta-connect journeys:
 * on desktop people create the API key on delta.exchange in another tab and
 * copy-paste on one screen; on a phone they're usually in the Delta app and need
 * step-by-step guidance to do it in the mobile browser instead.
 *
 * Width-based (not a UA sniff) so it also reacts to a resized desktop window and
 * doesn't misfire on tablets held landscape. Defaults to false during SSR/
 * prerender so the desktop layout is what gets baked into the static HTML.
 */
export function useIsMobile(maxWidth = 640) {
  const query = `(max-width: ${maxWidth}px)`;
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mql = window.matchMedia(query);
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return isMobile;
}
