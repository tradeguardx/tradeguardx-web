import { apiGet, apiPost, apiPatch } from './httpClient';

/**
 * GET /user/pairing/status?tradingAccountId=
 */
export async function fetchPairingStatus({ accessToken, tradingAccountId, signal } = {}) {
  if (!accessToken || !tradingAccountId) throw new Error('Missing access token or tradingAccountId');
  const q = new URLSearchParams({ tradingAccountId });
  const payload = await apiGet(`/pairing/status?${q.toString()}`, {
    signal,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return unwrap(payload);
}

/**
 * POST /user/pairing/revoke — disconnect extension session(s) for this trading account.
 */
export async function revokePairingSessions({ accessToken, tradingAccountId, signal } = {}) {
  if (!accessToken || !tradingAccountId) throw new Error('Missing access token or tradingAccountId');
  const payload = await apiPost(
    '/pairing/revoke',
    { tradingAccountId },
    {
      signal,
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  return unwrap(payload);
}

function unwrap(payload) {
  if (payload?.success && payload.data !== undefined) return payload.data;
  return payload;
}

/**
 * GET /user/trading-accounts
 */
export async function fetchTradingAccounts({ accessToken, signal } = {}) {
  if (!accessToken) throw new Error('Missing access token');
  const payload = await apiGet('/trading-accounts', {
    signal,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = unwrap(payload);
  return data?.accounts ?? [];
}

/**
 * POST /user/trading-accounts
 */
export async function createTradingAccount({ accessToken, name, propFirmSlug, platform, signal } = {}) {
  if (!accessToken) throw new Error('Missing access token');
  const body = { name };
  if (propFirmSlug !== undefined) body.propFirmSlug = propFirmSlug;
  if (platform !== undefined) body.platform = platform;
  const payload = await apiPost('/trading-accounts', body, {
    signal,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = unwrap(payload);
  return data?.account;
}

/**
 * PATCH /user/trading-accounts/:accountId
 */
export async function patchTradingAccount({
  accessToken,
  accountId,
  name,
  propFirmSlug,
  platform,
  sortOrder,
  accountSize,
  accountCurrency,
  signal,
} = {}) {
  if (!accessToken || !accountId) throw new Error('Missing access token or accountId');
  const body = {};
  if (name !== undefined) body.name = name;
  if (propFirmSlug !== undefined) body.propFirmSlug = propFirmSlug;
  if (platform !== undefined) body.platform = platform;
  if (sortOrder !== undefined) body.sortOrder = sortOrder;
  if (accountSize !== undefined) body.accountSize = accountSize;
  if (accountCurrency !== undefined) body.accountCurrency = accountCurrency;
  const payload = await apiPatch(`/trading-accounts/${encodeURIComponent(accountId)}`, body, {
    signal,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = unwrap(payload);
  return data?.account;
}

/**
 * POST /user/trading-accounts/:accountId/pairing-codes
 */
export async function createPairingCode({ accessToken, accountId, signal } = {}) {
  if (!accessToken || !accountId) throw new Error('Missing access token or accountId');
  const payload = await apiPost(
    `/trading-accounts/${encodeURIComponent(accountId)}/pairing-codes`,
    {},
    {
      signal,
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  return unwrap(payload);
}
