import { apiPost } from './httpClient';
import { TRADE_API_BASE_URL } from './config';

/**
 * Human support requests — POST /support/request (trade-service), which
 * posts the ticket to the founder's Telegram.
 *
 * Previously went straight to Formspree from the browser; that needed a
 * form id the production build did not have ("Form not found"), and an
 * email inbox is slower to notice than a Telegram push anyway. Going via
 * our own endpoint also means the sender is the JWT's email, not a field
 * the browser fills in.
 */

/** Always true now: the server owns the channel and says 503 if it isn't set up. */
export function supportFormConfigured() {
  return true;
}

/**
 * @param {object} p
 * @param {string} p.accessToken
 * @param {string} p.accountId     trading account the ticket is about
 * @param {string} p.message       what the user typed
 * @param {string} [p.name]        display name
 * @param {string} [p.accountName]
 * @param {Array<{role:string,content:string}>} [p.transcript]  recent chat, for context
 */
export async function submitSupportRequest({ accessToken, accountId, message, name, accountName, transcript = [] }) {
  if (!accessToken) throw new Error('You need to be signed in');
  if (!accountId) throw new Error('Select a trading account first');
  const q = new URLSearchParams({ tradingAccountId: accountId });
  try {
    await apiPost(`/support/request?${q.toString()}`, {
      message,
      name: name || '',
      accountName: accountName || '',
      page: typeof window !== 'undefined' ? window.location.pathname : '',
      // The assistant transcript is the most useful context a ticket can
      // carry: what the user already tried and what the bot already told
      // them, so the reply does not start from zero.
      transcript: transcript.slice(-8).map((t) => ({ role: t.role, content: t.content })),
    }, {
      baseUrl: TRADE_API_BASE_URL,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (err) {
    const status = err?.status;
    if (status === 503) throw new Error('Support is temporarily unavailable. Email support@tradeguardx.com.');
    throw new Error(err?.message || 'Could not send. Please try again.');
  }
}
