import { SUBSCRIPTION_API_BASE_URL } from './config';
import { apiGet } from './httpClient';

/**
 * Current plan + limits (subscription-service).
 * Local: GET http://localhost:3001/subscriptions/me
 * Deployed: GET https://dev.api.tradeguardx.com/subscription/subscriptions/me
 */
export async function getCurrentSubscription({
  accessToken,
  signal,
  ensureFree = true,
} = {}) {
  if (!accessToken) {
    throw new Error('Missing access token for subscription');
  }

  const qs =
    ensureFree === false ? '?ensureFree=false' : '';

  const payload = await apiGet(`/subscriptions/me${qs}`, {
    baseUrl: SUBSCRIPTION_API_BASE_URL,
    signal,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return payload?.data;
}
