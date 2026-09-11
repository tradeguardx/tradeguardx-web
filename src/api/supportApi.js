import { apiPost } from './httpClient';
import { TRADE_API_BASE_URL } from './config';

function unwrap(payload) {
  if (payload?.success && payload.data !== undefined) return payload.data;
  return payload;
}

/**
 * POST /support/chat (trade-service).
 *
 * `messages` is the full visible conversation, oldest first, ending with the
 * user's latest turn. The server re-fetches the account snapshot on every
 * call, so the answer always reflects current state — a lockout that lifted
 * between two questions shows up in the second answer.
 *
 * Returns { reply, model, suggested }.
 */
export async function sendSupportMessage({ accessToken, tradingAccountId, messages, signal } = {}) {
  if (!accessToken) throw new Error('Missing access token');
  if (!tradingAccountId) throw new Error('Missing tradingAccountId');
  const q = new URLSearchParams({ tradingAccountId });
  const path = `/support/chat?${q.toString()}`;
  let payload;
  try {
    payload = await apiPost(path, { messages }, {
      signal,
      baseUrl: TRADE_API_BASE_URL,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (err) {
    // Say WHERE it failed. A bare "Failed to fetch" or a JSON parse error
    // gives nothing to act on; the resolved base URL is the first thing to
    // check when the dashboard is pointed at the wrong backend.
    const where = `${TRADE_API_BASE_URL}${path.split('?')[0]}`;
    const e = new Error(`${err?.message || 'Request failed'} (POST ${where}${err?.status ? `, HTTP ${err.status}` : ''})`);
    e.status = err?.status;
    e.details = err?.details;
    e.name = err?.name;
    throw e;
  }
  const data = unwrap(payload);
  // A 200 that is not our envelope means something in between answered —
  // a login page, a proxy, an HTML error — and swallowing it as "…" hides
  // the actual problem.
  if (!data || typeof data.reply !== 'string') {
    throw new Error(`Unexpected response from ${TRADE_API_BASE_URL}${path.split('?')[0]} (not a chat reply)`);
  }
  return data;
}

/**
 * Shown before the first message. Mirrors SUGGESTED_QUESTIONS on the server;
 * duplicated here so the panel renders instantly rather than after a round
 * trip, and the server's copy replaces it once the first reply arrives.
 */
export const SUGGESTED_QUESTIONS = [
  'Why was my last trade closed?',
  'Why is my account locked?',
  'Why does it say Unprotected?',
  'What rules do I have turned on?',
  'How do I connect my Delta API key?',
];
