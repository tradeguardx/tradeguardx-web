import { apiDelete, apiGet, apiPost } from './httpClient';
import { extraFieldsPayload } from '../lib/venues';

function unwrap(payload) {
  if (payload?.success && payload.data !== undefined) return payload.data;
  return payload;
}

/**
 * Map our broker slug → the `exchange` value the backend expects.
 * Returns null for non-exchange brokers.
 */
export function exchangeFromBrokerSlug(slug) {
  if (slug === 'delta_india') return 'delta_india';
  if (slug === 'delta_global') return 'delta_global';
  if (slug === 'coindcx') return 'coindcx';
  if (slug === 'shark') return 'shark';
  if (slug === 'blofin') return 'blofin';
  if (slug === 'exness') return 'exness';
  return null;
}

/**
 * POST /user/trading-accounts/:accountId/exchange-credentials
 * Validates the key with the exchange, KMS-encrypts it, stores it linked to the trading account.
 */
export async function connectExchangeCredentials({
  accessToken,
  accountId,
  exchange,
  apiKey,
  apiSecret,
  passphrase,
  // Venue-declared extras (Exness: { accountId, host }). Note `accountId`
  // above is OUR trading account; Exness's account number travels in here.
  venueFields,
  signal,
} = {}) {
  if (!accessToken || !accountId) throw new Error('Missing access token or accountId');
  if (!exchange || !apiKey || !apiSecret) {
    throw new Error('exchange, apiKey, and apiSecret are required');
  }
  const payload = await apiPost(
    `/trading-accounts/${encodeURIComponent(accountId)}/exchange-credentials`,
    // BloFin keys carry a passphrase; other venues never send the field.
    // Extra fields go only for a venue that declares them (Exness: accountId,
    // and host when given) — see extraFieldsPayload.
    { exchange, apiKey, apiSecret, ...(passphrase ? { passphrase } : {}), ...extraFieldsPayload(exchange, venueFields) },
    {
      signal,
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  const data = unwrap(payload);
  return data?.connection ?? null;
}

/**
 * GET /user/trading-accounts/:accountId/exchange-credentials
 * Returns the connection summary (no secrets) or null if not paired.
 */
export async function getExchangeCredentialsStatus({
  accessToken,
  accountId,
  signal,
} = {}) {
  if (!accessToken || !accountId) throw new Error('Missing access token or accountId');
  const payload = await apiGet(
    `/trading-accounts/${encodeURIComponent(accountId)}/exchange-credentials`,
    {
      signal,
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  const data = unwrap(payload);
  return data?.connection ?? null;
}

/**
 * DELETE /user/trading-accounts/:accountId/exchange-credentials
 * Marks the connection as revoked. Risk-engine will drop the WS on next sync.
 */
export async function disconnectExchangeCredentials({
  accessToken,
  accountId,
  signal,
} = {}) {
  if (!accessToken || !accountId) throw new Error('Missing access token or accountId');
  const payload = await apiDelete(
    `/trading-accounts/${encodeURIComponent(accountId)}/exchange-credentials`,
    {
      signal,
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  return unwrap(payload);
}
