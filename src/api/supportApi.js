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
  const payload = await apiPost(
    `/support/chat?${q.toString()}`,
    { messages },
    {
      signal,
      baseUrl: TRADE_API_BASE_URL,
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  return unwrap(payload);
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
