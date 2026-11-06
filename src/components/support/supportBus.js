/**
 * Other parts of the dashboard can open this panel straight into the contact
 * form: `window.dispatchEvent(new CustomEvent(OPEN_SUPPORT_EVENT, { detail: { prefill } }))`.
 * Used by the rule-lock banner — "made a mistake? contact support" should be
 * one tap, with the situation already written, not a hunt for the button.
 */
export const OPEN_SUPPORT_EVENT = 'tgx:open-support';
export function openSupport(prefill) {
  try {
    window.dispatchEvent(new CustomEvent(OPEN_SUPPORT_EVENT, { detail: { prefill: prefill || '' } }));
  } catch {
    /* non-browser */
  }
}

/** Opens the panel on the AI conversation rather than the contact form, optionally asking a question. */
export function openSupportChat(ask) {
  try {
    window.dispatchEvent(new CustomEvent(OPEN_SUPPORT_EVENT, { detail: { view: 'chat', ask: ask || '' } }));
  } catch {
    /* non-browser */
  }
}
