/**
 * User-service API base (trading-accounts, rules, profile). Deployed URLs include `/user` (API Gateway base path).
 * Local serverless-offline serves routes at the root of httpPort (e.g. GET /trading-accounts), so base has NO `/user`.
 * Trade service: TRADE_ENV_BASE_URLS (e.g. port 3009) + path `/trades`.
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

export function resolveApiBaseUrl() {
  const appEnv = import.meta.env.VITE_APP_ENV;
  const mode = import.meta.env.MODE || 'development';
  const envOverride = import.meta.env.VITE_API_BASE_URL;

  if (envOverride && envOverride.trim().length > 0) {
    return normalizeBaseUrl(envOverride.trim());
  }

  const normalizedAppEnv = (appEnv || '').toLowerCase();
  if (normalizedAppEnv === 'local' || normalizedAppEnv === 'dev' || normalizedAppEnv === 'prod') {
    return ENV_BASE_URLS[normalizedAppEnv];
  }

  if (mode === 'production') {
    return ENV_BASE_URLS.prod;
  }

  return ENV_BASE_URLS.dev;
}

export const API_BASE_URL = resolveApiBaseUrl();

export function resolveSubscriptionApiBaseUrl() {
  const override = import.meta.env.VITE_SUBSCRIPTION_API_BASE_URL;
  if (override && override.trim().length > 0) {
    return normalizeBaseUrl(override.trim());
  }

  const appEnv = import.meta.env.VITE_APP_ENV;
  const mode = import.meta.env.MODE || 'development';
  const normalizedAppEnv = (appEnv || '').toLowerCase();

  if (
    normalizedAppEnv === 'local' ||
    normalizedAppEnv === 'dev' ||
    normalizedAppEnv === 'prod'
  ) {
    return SUBSCRIPTION_ENV_BASE_URLS[normalizedAppEnv] ?? SUBSCRIPTION_ENV_BASE_URLS.dev;
  }

  if (mode === 'production') {
    return SUBSCRIPTION_ENV_BASE_URLS.prod;
  }

  return SUBSCRIPTION_ENV_BASE_URLS.dev;
}

export const SUBSCRIPTION_API_BASE_URL = resolveSubscriptionApiBaseUrl();

export function resolvePaymentsApiBaseUrl() {
  const override = import.meta.env.VITE_PAYMENTS_API_BASE_URL;
  if (override && override.trim().length > 0) {
    return normalizeBaseUrl(override.trim());
  }

  const appEnv = import.meta.env.VITE_APP_ENV;
  const mode = import.meta.env.MODE || 'development';
  const normalizedAppEnv = (appEnv || '').toLowerCase();

  if (
    normalizedAppEnv === 'local' ||
    normalizedAppEnv === 'dev' ||
    normalizedAppEnv === 'prod'
  ) {
    return PAYMENTS_ENV_BASE_URLS[normalizedAppEnv] ?? PAYMENTS_ENV_BASE_URLS.dev;
  }

  if (mode === 'production') {
    return PAYMENTS_ENV_BASE_URLS.prod;
  }

  return PAYMENTS_ENV_BASE_URLS.dev;
}

export const PAYMENTS_API_BASE_URL = resolvePaymentsApiBaseUrl();

export function resolveTradeApiBaseUrl() {
  const override = import.meta.env.VITE_TRADE_API_BASE_URL;
  if (override && override.trim().length > 0) {
    return normalizeBaseUrl(override.trim());
  }

  const appEnv = import.meta.env.VITE_APP_ENV;
  const mode = import.meta.env.MODE || 'development';
  const normalizedAppEnv = (appEnv || '').toLowerCase();

  if (
    normalizedAppEnv === 'local' ||
    normalizedAppEnv === 'dev' ||
    normalizedAppEnv === 'prod'
  ) {
    return TRADE_ENV_BASE_URLS[normalizedAppEnv] ?? TRADE_ENV_BASE_URLS.dev;
  }

  if (mode === 'production') {
    return TRADE_ENV_BASE_URLS.prod;
  }

  return TRADE_ENV_BASE_URLS.dev;
}

export const TRADE_API_BASE_URL = resolveTradeApiBaseUrl();
