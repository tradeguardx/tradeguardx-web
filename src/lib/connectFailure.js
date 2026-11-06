const TITLES = {
  KEY_READ_ONLY: 'Trading permission is not selected on this key',
  KEY_IP_NOT_WHITELISTED: 'Our IP is not whitelisted on this key',
};

/** Heading for a refused key, so the cause is the first thing they read. */
export function connectFailureTitle(err) {
  return TITLES[err?.details?.error?.code] ?? null;
}
