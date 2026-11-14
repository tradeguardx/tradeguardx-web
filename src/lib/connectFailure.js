const TITLES = {
  KEY_READ_ONLY: 'Trading permission is not selected on this key',
  KEY_IP_NOT_WHITELISTED: 'Our IP is not whitelisted on this key',
  KEY_WITHDRAW_ENABLED: 'This key can withdraw funds',
  BYBIT_AUTH_FAILED: 'Bybit did not accept this key',
  BYBIT_DEMO_KEY: 'This is a Demo Trading key',
  BYBIT_WRONG_SITE: 'This key is from another Bybit site',
  BINANCE_AUTH_FAILED: 'Binance did not accept this key',
  BINANCE_US_KEY: 'This is a Binance.US key',
  BINANCE_DEMO_KEY: 'This is a Binance testnet or demo key',
  BINANCE_REGION_BLOCKED: 'Binance blocked our connection for your region',
  BINANCE_PORTFOLIO_MARGIN: "Portfolio Margin accounts aren't supported yet",
};

/** Heading for a refused key, so the cause is the first thing they read. */
export function connectFailureTitle(err) {
  return TITLES[err?.details?.error?.code] ?? null;
}
