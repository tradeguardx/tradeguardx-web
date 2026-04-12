import { apiGet, apiPut } from './httpClient';

function unwrap(payload) {
  if (payload?.success && payload.data !== undefined) return payload.data;
  return payload;
}

/**
 * Full catalog + user instances + plan caps (user-service).
 * GET /user/rules?tradingAccountId=  (browser — always pass tradingAccountId).
 * Extension: same URL with pairing `Bearer` token; query optional (account is in JWT).
 */
export async function fetchRulesBundle({ accessToken, tradingAccountId, signal } = {}) {
  if (!accessToken) throw new Error('Missing access token for rules');
  if (!tradingAccountId) throw new Error('Missing tradingAccountId for rules');
  const q = `?tradingAccountId=${encodeURIComponent(tradingAccountId)}`;
  const payload = await apiGet(`/rules${q}`, {
    signal,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return unwrap(payload);
}

/**
 * Create or update one rule instance.
 * PUT /user/rules/{templateSlug}?tradingAccountId=
 */
export async function saveRuleInstance({
  accessToken,
  tradingAccountId,
  templateSlug,
  config,
  enabled,
  signal,
} = {}) {
  if (!accessToken) throw new Error('Missing access token for rules');
  if (!tradingAccountId) throw new Error('Missing tradingAccountId for rules');
  const q = `?tradingAccountId=${encodeURIComponent(tradingAccountId)}`;
  const path = `/rules/${encodeURIComponent(templateSlug)}${q}`;
  const body = {};
  if (config !== undefined) body.config = config;
  if (enabled !== undefined) body.enabled = enabled;
  const payload = await apiPut(path, body, {
    signal,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return unwrap(payload);
}
