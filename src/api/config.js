/**
 * User-service API base (trading-accounts, rules, profile). Deployed URLs include `/user` (API Gateway base path).
 * Local serverless-offline serves routes at the root of httpPort (e.g. GET /trading-accounts), so base has NO `/user`.
 * Trade service: TRADE_ENV_BASE_URLS (e.g. port 3009) + path `/trades`.
 *
 * Resolution order for every backend (user, subscription, payments, trades):
 * 1. Service-specific override: VITE_*_API_BASE_URL if set and non-empty
 * 2. Else: table below for `VITE_APP_ENV` = local | dev | prod
 * 3. If `VITE_APP_ENV` is unset/invalid: **prod** (same default for `npm run dev` and production builds)
 */
const ENV_BASE_URLS = {
  local: 'http://localhost:3000',
  dev: 'https://dev.api.tradeguardx.com/user',
  prod: 'https://api.tradeguardx.com/user',
};

/** Subscription service (serverless basePath `subscription` in deployed API). */
const SUBSCRIPTION_ENV_BASE_URLS = {
  local: 'http://localhost:3001',
  dev: 'https://dev.api.tradeguardx.com/subscription',
  prod: 'https://api.tradeguardx.com/subscription',
};

/** Payments service (Dodo checkout; serverless basePath `payments`). */
const PAYMENTS_ENV_BASE_URLS = {
  local: 'http://localhost:3002',
  dev: 'https://dev.api.tradeguardx.com/payments',
  prod: 'https://api.tradeguardx.com/payments',
};

/** Trade service (serverless basePath `trades` in deployed API). */
const TRADE_ENV_BASE_URLS = {
  local: 'http://localhost:3009',
  dev: 'https://dev.api.tradeguardx.com/trades',
  prod: 'https://api.tradeguardx.com/trades',
};

function normalizeBaseUrl(url) {
  return url.replace(/\/+$/, '');
}

function readOverride(key) {
  const raw = import.meta.env[key];
  if (raw == null) return '';
  const s = String(raw).trim();
  return s.length > 0 ? s : '';
}

/**
 * Hosted API target: `local` (serverless-offline), `dev` (dev.api), `prod` (api).
 * Toggle with `VITE_APP_ENV` in `.env` / `.env.local`.
 * If unset, defaults to **prod** (including Vite dev server). Set `VITE_APP_ENV=dev` to use dev.api.
 */
export function resolveApiEnv() {
  const raw = (import.meta.env.VITE_APP_ENV || '').trim().toLowerCase();
  if (raw === 'local' || raw === 'dev' || raw === 'prod') {
    return raw;
  }
  return 'prod';
}

/**
 * Shared rule: optional Vite override wins, else URL for current `resolveApiEnv()`.
 * @param {string} overrideKey - e.g. `'VITE_PAYMENTS_API_BASE_URL'`
 * @param {Record<'local'|'dev'|'prod', string>} urlsByEnv
 */
function resolveServiceBaseUrl(overrideKey, urlsByEnv) {
  const overridden = readOverride(overrideKey);
  if (overridden) {
    return normalizeBaseUrl(overridden);
  }
  const env = resolveApiEnv();
  return urlsByEnv[env] ?? urlsByEnv.prod;
}

export function resolveApiBaseUrl() {
  return resolveServiceBaseUrl('VITE_API_BASE_URL', ENV_BASE_URLS);
}

export const API_BASE_URL = resolveApiBaseUrl();

export function resolveSubscriptionApiBaseUrl() {
  return resolveServiceBaseUrl('VITE_SUBSCRIPTION_API_BASE_URL', SUBSCRIPTION_ENV_BASE_URLS);
}

export const SUBSCRIPTION_API_BASE_URL = resolveSubscriptionApiBaseUrl();

export function resolvePaymentsApiBaseUrl() {
  return resolveServiceBaseUrl('VITE_PAYMENTS_API_BASE_URL', PAYMENTS_ENV_BASE_URLS);
}

export const PAYMENTS_API_BASE_URL = resolvePaymentsApiBaseUrl();

export function resolveTradeApiBaseUrl() {
  return resolveServiceBaseUrl('VITE_TRADE_API_BASE_URL', TRADE_ENV_BASE_URLS);
}

export const TRADE_API_BASE_URL = resolveTradeApiBaseUrl();

/**
 * Resolved bases + which overrides are active (useful for debugging env mismatches).
 */
export function getApiConfigSnapshot() {
  return {
    appEnv: resolveApiEnv(),
    user: resolveApiBaseUrl(),
    subscription: resolveSubscriptionApiBaseUrl(),
    payments: resolvePaymentsApiBaseUrl(),
    trades: resolveTradeApiBaseUrl(),
    overrides: {
      VITE_API_BASE_URL: Boolean(readOverride('VITE_API_BASE_URL')),
      VITE_SUBSCRIPTION_API_BASE_URL: Boolean(readOverride('VITE_SUBSCRIPTION_API_BASE_URL')),
      VITE_PAYMENTS_API_BASE_URL: Boolean(readOverride('VITE_PAYMENTS_API_BASE_URL')),
      VITE_TRADE_API_BASE_URL: Boolean(readOverride('VITE_TRADE_API_BASE_URL')),
    },
  };
}
