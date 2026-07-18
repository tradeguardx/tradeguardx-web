/**
 * Password rules shared by every place a password is chosen — signup, the reset
 * link, and the change-password form in account settings. Keeping one source
 * means the three can't drift into disagreeing about what's acceptable.
 */

/** Supabase's own floor is 6; we ask for 8 since these accounts can move money. */
export const MIN_PASSWORD_LENGTH = 8;

export function pwStrength(pw) {
  if (!pw) return { n: 0, label: '', cls: '' };
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 1) return { n: 1, label: 'Weak', cls: 'bg-red-400', text: 'text-red-400' };
  if (s <= 2) return { n: 2, label: 'Fair', cls: 'bg-amber-400', text: 'text-amber-400' };
  if (s <= 3) return { n: 3, label: 'Good', cls: 'bg-blue-400', text: 'text-blue-400' };
  return { n: 4, label: 'Strong', cls: 'bg-accent', text: 'text-accent' };
}

/**
 * Returns an error string, or null when the pair is acceptable. Callers show
 * the message inline rather than relying on the server to reject it.
 */
export function validatePasswordPair(password, confirm) {
  if (!password) return 'Enter a password.';
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!confirm) return 'Re-enter your password to confirm it.';
  if (password !== confirm) return 'Passwords do not match.';
  return null;
}
