/**
 * Human support requests — posted straight to Formspree from the browser,
 * the same way the partner and beta forms already work. No backend hop: the
 * request is the user's own words about their own account, addressed to the
 * founder, and Formspree handles delivery and spam.
 *
 * A DEDICATED form id keeps support tickets out of the beta-signup inbox;
 * it falls back to the partner form so the feature works before that is set,
 * and the fallback is stated in the submission so the recipient knows.
 */

const DEDICATED = (import.meta.env.VITE_SUPPORT_FORMSPREE_ID ?? '').trim();
const FALLBACK = (import.meta.env.VITE_FORMSPREE_PARTNER_FORM_ID ?? '').trim();

export function supportFormConfigured() {
  return Boolean(DEDICATED || FALLBACK);
}

/**
 * @param {object} p
 * @param {string} p.email        signed-in user's email (reply-to)
 * @param {string} p.name         display name
 * @param {string} p.message      what the user typed
 * @param {string} [p.accountName]
 * @param {string} [p.accountId]
 * @param {Array<{role:string,content:string}>} [p.transcript]  recent chat, for context
 */
export async function submitSupportRequest({ email, name, message, accountName, accountId, transcript = [] }) {
  const formId = DEDICATED || FALLBACK;
  if (!formId) throw new Error('Support form is not configured');

  // Formspree uses `_subject` and `_replyto` as reserved fields.
  const body = {
    _subject: `[TradeGuardX support] ${accountName || 'account'} — ${message.slice(0, 60)}`,
    _replyto: email,
    email,
    name: name || '',
    message,
    trading_account: accountName || '',
    trading_account_id: accountId || '',
    page: typeof window !== 'undefined' ? window.location.pathname : '',
    // The assistant transcript is the most useful context a ticket can carry:
    // it shows what the user already tried and what the bot already told
    // them, so the reply does not start from zero.
    assistant_transcript: transcript
      .slice(-8)
      .map((t) => `${t.role === 'user' ? 'User' : 'Assistant'}: ${t.content}`)
      .join('\n\n'),
    form_used: DEDICATED ? 'support' : 'partner (fallback — set VITE_SUPPORT_FORMSPREE_ID)',
  };

  const res = await fetch(`https://formspree.io/f/${formId}`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let msg = `Could not send (status ${res.status})`;
    try {
      const data = await res.json();
      if (data?.errors?.[0]?.message) msg = data.errors[0].message;
      else if (data?.error) msg = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
}
