import { useCallback, useState } from 'react';

/**
 * Attributes that keep an exchange API key or secret out of every autofill
 * store we can reach.
 *
 * WHY autoComplete="off" IS NOT ENOUGH. Chrome deliberately ignores it on
 * credential-shaped fields — it decided too many sites used it to block
 * password managers, so a `type="password"` input still gets the "save
 * password?" prompt and still gets filled later. Firefox and Safari behave
 * similarly on anything their heuristics read as a login.
 *
 * That matters more here than on a login form. A password can be rotated by
 * the person who owns it; an exchange API secret sitting in a shared browser
 * profile, synced to a phone, is a key that can place trades on someone's
 * money. It should exist in the page for as long as it takes to paste, and
 * nowhere else.
 *
 * So this combines four things, because no single one works everywhere:
 *   - autoComplete="off". Chrome ignores it on password fields, but it is the
 *     ONLY value that stops its form history ("autocomplete") on text fields.
 *     Until 25 Nov 2026 this was a nonsense token, and Chrome read that as ON:
 *     it stored every pasted key and secret and offered them back as
 *     suggestions (measured in Chrome 147). Do not change it to anything else
 *   - the opt-out attributes the major password managers read
 *   - correction and spellcheck off, so a secret is never sent to a
 *     spellchecker or silently capitalised
 *   - data-form-type="other", which tells 1Password this is not a login
 *
 * NONE OF IT WORKS IF THE FIELD IS type="password". That is the one thing
 * that overrides everything here, and it is worth spelling out because the
 * connect page shipped with it and filled someone's API key box with their
 * email address. Chrome's password manager, on finding a password field,
 * fills it with the saved password and fills the text input immediately
 * BEFORE it with the saved username — it does not read the name, the label or
 * the autocomplete token to decide that. So a secret field must be
 * type="text" masked with -webkit-text-security, which is what SecretInput
 * does; never type="password".
 *
 * Use useNoAutofill, which adds a `name` that is new on every mount. Autofill
 * heuristics and form history both go by name, so `name="apiSecret"` invites
 * exactly what this is meant to prevent, and a fixed name would keep offering
 * the values Chrome stored under it before the fix above.
 */
export const NO_AUTOFILL = {
  autoComplete: 'off',
  autoCorrect: 'off',
  autoCapitalize: 'off',
  spellCheck: false,
  'data-lpignore': 'true',
  'data-1p-ignore': 'true',
  'data-bwignore': 'true',
  'data-dashlane-ignore': 'true',
  'data-form-type': 'other',
};

/**
 * NO_AUTOFILL plus the one guard that does not depend on a browser honouring
 * an attribute: a field that is readOnly until the person touches it.
 *
 * Autofill runs at page load, and no browser writes into a readOnly input. By
 * the time the field accepts a value, the fill has already been and gone. The
 * lock lifts on pointer-down and on focus, both of which happen before the
 * first keystroke or paste, so nothing is dropped on the way in.
 *
 * Spread it AFTER any `name` of your own: the fresh name has to win.
 *
 * This is deliberately belt and braces. The attributes above are the polite
 * request; this is what holds when a browser decides to ignore it.
 */
export function useNoAutofill() {
  const [locked, setLocked] = useState(true);
  const [name] = useState(() => `f${Math.random().toString(36).slice(2, 12)}`);
  const unlock = useCallback(() => setLocked(false), []);
  return {
    ...NO_AUTOFILL,
    name,
    readOnly: locked,
    onFocus: unlock,
    onMouseDown: unlock,
    onTouchStart: unlock,
  };
}
