import { useCallback } from 'react';

/**
 * Carry the dashboard's design tokens into a portal.
 *
 * The tokens are not on :root. They are declared on the shell element's
 * attributes — [data-dash-theme] for the palette, [data-accent] for the mint
 * set, [data-chrome] for depth — so anything React portals to document.body
 * lands outside that scope and every var(--surface), var(--line) and
 * var(--mint-solid) resolves to nothing. The failure is quiet and total: no
 * panel, no borders, no button fills, the modal drawn straight onto the page
 * behind it. Nothing errors, so nothing tells you.
 *
 * Attach the returned ref to a wrapper inside the portal and it mirrors those
 * three attributes onto it.
 *
 * A callback ref, not useLayoutEffect. A modal is mounted for the whole
 * session and returns null while closed, so a mount-time effect runs against a
 * node that does not exist yet, bails, and — with an empty dependency list —
 * never runs again. A callback ref fires when the node actually attaches,
 * which is the moment the modal opens.
 *
 * Read off the live element rather than from DashboardThemeContext on purpose.
 * Both that context and PrefsContext throw outside their providers, and a
 * portalled overlay should not be the thing that decides where in the tree it
 * is allowed to be mounted — the share modal is also used from a standalone
 * preview page with no dashboard providers at all.
 *
 * Only these three: [data-tgx] would drag in `display:flex;min-height:100vh`,
 * and [data-density] styles components we are not rendering.
 */
const ATTRS = ['data-dash-theme', 'data-accent', 'data-chrome'];

export function useThemeScope() {
  return useCallback((el) => {
    if (!el) return undefined;
    const src = typeof document === 'undefined' ? null : document.querySelector('[data-dash-theme]');
    if (!src) return undefined;

    const sync = () => {
      for (const a of ATTRS) {
        const v = src.getAttribute(a);
        if (v == null) el.removeAttribute(a);
        else el.setAttribute(a, v);
      }
    };
    // Synchronous with attachment, so the modal never shows one frame unstyled.
    sync();

    // The theme and accent can both be changed from the avatar menu while a
    // modal is open.
    const ob = new MutationObserver(sync);
    ob.observe(src, { attributes: true, attributeFilter: ATTRS });
    return () => ob.disconnect();
  }, []);
}
