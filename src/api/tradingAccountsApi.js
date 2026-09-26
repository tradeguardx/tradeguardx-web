import { apiGet, apiPost, apiPatch, apiDelete } from './httpClient';

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
 * PATCH /trading-accounts/{id}/rule-lock { days } — 0 | 3 | 7 | 30.
 * Refused with 423 while the account is currently locked: the window can only
 * be changed once the lock lifts, or 30 → 3 is a two-click escape.
 */
export async function setRuleLockDays({ accessToken, accountId, days, signal } = {}) {
  if (!accessToken || !accountId) throw new Error('Missing access token or accountId');
  const payload = await apiPatch(`/trading-accounts/${encodeURIComponent(accountId)}/rule-lock`, { days }, {
    signal,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return unwrap(payload);
}

/**
 * GET /trading-accounts/{id}/deletable
 *
 * Answers two things at once: whether deletion is allowed, and what it would
 * destroy. Every foreign key into trading_accounts is ON DELETE CASCADE, so
 * "delete this account" also means its journal, trades, breach history and
 * rules — the records the tax centre reads. The counts let the confirmation
 * say so with numbers instead of a vague warning.
 */
export async function checkAccountDeletable({ accessToken, accountId, signal } = {}) {
  if (!accessToken || !accountId) throw new Error('Missing access token or accountId');
  const payload = await apiGet(`/trading-accounts/${encodeURIComponent(accountId)}/deletable`, {
    signal,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return unwrap(payload);
}

/**
 * DELETE /trading-accounts/{id}
 *
 * The server re-runs the same checks and answers 409 with the blockers if the
 * account is connected or locked. That is deliberate: the gate is a safety
 * rule, and a rule enforced only in the browser is a suggestion.
 */
export async function deleteTradingAccount({ accessToken, accountId, signal } = {}) {
  if (!accessToken || !accountId) throw new Error('Missing access token or accountId');
  const payload = await apiDelete(`/trading-accounts/${encodeURIComponent(accountId)}`, {
    signal,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return unwrap(payload);
}
