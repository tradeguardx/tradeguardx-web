/**
 * Submits beta / research signups to an external form handler (no app database).
 * Set VITE_BETA_SIGNUP_ENDPOINT to e.g. Formspree (https://formspree.io/f/your-id).
 */

function getEndpoint() {
  return (import.meta.env.VITE_BETA_SIGNUP_ENDPOINT || '').trim();
}

/**
 * @param {{
 *   firstName: string;
 *   lastName: string;
 *   place: string;
 *   fundedAccountInfo: string;
 *   mobile: string;
 *   videoCallOk: boolean;
 * }} payload
 */
export async function submitBetaTestRegistration(payload) {
  const url = getEndpoint();
  if (!url) {
    throw new Error('Signup is not configured. Set VITE_BETA_SIGNUP_ENDPOINT for this deployment.');
  }

  const body = {
    _subject: 'TradeGuardX beta / research signup',
    first_name: payload.firstName.trim(),
    last_name: payload.lastName.trim(),
    place: payload.place.trim() || '—',
    funded_account_info: payload.fundedAccountInfo.trim(),
    mobile: payload.mobile.trim(),
    video_call_ok: payload.videoCallOk ? 'yes' : 'no',
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    // eslint-disable-next-line no-console
    console.error('beta signup POST', res.status, text);
    throw new Error('Could not send your registration. Please try again or email support@tradeguardx.com.');
  }
}

export function isBetaSignupConfigured() {
  return getEndpoint().length > 0;
}
