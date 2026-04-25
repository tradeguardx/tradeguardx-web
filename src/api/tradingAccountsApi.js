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
 * GET /user/trading-accounts/supported-props
 * Returns enriched broker records: { brokerId, name, equityMode, defaultTimezone,
 * defaultResetTimeLocal, dailyLossBasis, sizes[], dashboardUrl, defaultRules, hasMapping }.
 */
export async function fetchSupportedProps({ accessToken, signal } = {}) {
  if (!accessToken) throw new Error('Missing access token');
  const payload = await apiGet('/trading-accounts/supported-props', {
    signal,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = unwrap(payload);
  const brokers = Array.isArray(data?.brokers) ? data.brokers : [];
  return brokers
    .map((b) => {
      const brokerId = typeof b?.brokerId === 'string' ? b.brokerId.trim() : '';
      if (!brokerId) return null;
      const status = b.status === 'planned' || b.status === 'deprecated' ? b.status : 'active';
      return {
        brokerId,
        slug: b.slug ?? brokerId,
        name: b.name ?? brokerId,
        equityMode: b.equityMode === 'funded' ? 'funded' : 'live',
        defaultTimezone: b.defaultTimezone ?? 'UTC',
        defaultResetTimeLocal: b.defaultResetTimeLocal ?? '00:00',
        dailyLossBasis: b.dailyLossBasis === 'balance' ? 'balance' : 'equity',
        sizes: Array.isArray(b.sizes) ? b.sizes.filter((n) => typeof n === 'number') : [],
        dashboardUrl: b.dashboardUrl ?? null,
        defaultRules: b.defaultRules ?? { dailyLossPct: 5, maxLossPct: 10 },
        status,
      };
    })
    .filter(Boolean);
}

/**
 * POST /user/trading-accounts
 */
export async function createTradingAccount({
  accessToken,
  name,
  propFirmSlug,
  platform,
  accountSize,
  accountCurrency,
  equityMode,
  timezone,
  dailyResetTimeLocal,
  dailyLossBasis,
  dashboardUrl,
  signal,
} = {}) {
  if (!accessToken) throw new Error('Missing access token');
  const body = { name };
  if (propFirmSlug !== undefined) body.propFirmSlug = propFirmSlug;
  if (platform !== undefined) body.platform = platform;
  if (accountSize !== undefined) body.accountSize = accountSize;
  if (accountCurrency !== undefined) body.accountCurrency = accountCurrency;
  if (equityMode !== undefined) body.equityMode = equityMode;
  if (timezone !== undefined) body.timezone = timezone;
  if (dailyResetTimeLocal !== undefined) body.dailyResetTimeLocal = dailyResetTimeLocal;
  if (dailyLossBasis !== undefined) body.dailyLossBasis = dailyLossBasis;
  if (dashboardUrl !== undefined) body.dashboardUrl = dashboardUrl;

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
  equityMode,
  timezone,
  dailyResetTimeLocal,
  dailyLossBasis,
  dashboardUrl,
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
  if (equityMode !== undefined) body.equityMode = equityMode;
  if (timezone !== undefined) body.timezone = timezone;
  if (dailyResetTimeLocal !== undefined) body.dailyResetTimeLocal = dailyResetTimeLocal;
  if (dailyLossBasis !== undefined) body.dailyLossBasis = dailyLossBasis;
  if (dashboardUrl !== undefined) body.dashboardUrl = dashboardUrl;

  const payload = await apiPatch(`/trading-accounts/${encodeURIComponent(accountId)}`, body, {
    signal,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = unwrap(payload);
  return data?.account;
}

/**
 * POST /user/trading-accounts/:accountId/reconcile — user-declared balance.
 */
export async function reconcileTradingAccount({
  accessToken,
  accountId,
  declaredBalance,
  closedPnlToday,
  floatingPnl,
  signal,
} = {}) {
  if (!accessToken || !accountId) throw new Error('Missing access token or accountId');
  const body = { declaredBalance };
  if (closedPnlToday !== undefined) body.closedPnlToday = closedPnlToday;
  if (floatingPnl !== undefined) body.floatingPnl = floatingPnl;
  const payload = await apiPost(
    `/trading-accounts/${encodeURIComponent(accountId)}/reconcile`,
    body,
    {
      signal,
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
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
