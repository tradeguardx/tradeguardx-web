import { apiDelete, apiGet, apiPost, apiPut } from './httpClient';
import { REFERRAL_API_BASE_URL } from './config';

/**
 * Reviews live in the referral service (basePath `referral`). Three callers:
 *   - the public /reviews page        → listPublicReviews (no auth)
 *   - the dashboard review card       → getMyReview / saveMyReview / deleteMyReview (JWT)
 *   - the /review?t=… link page       → getReviewByToken / saveReviewByToken (signed link, no login)
 */

const base = { baseUrl: REFERRAL_API_BASE_URL };
const auth = (accessToken) => ({ ...base, headers: { Authorization: `Bearer ${accessToken}` } });
const unwrap = (payload) => (payload?.success && payload.data !== undefined ? payload.data : payload);

export async function listPublicReviews({ exchange, rating, limit = 20, offset = 0, signal } = {}) {
  const q = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (exchange) q.set('exchange', exchange);
  if (rating) q.set('rating', String(rating));
  return unwrap(await apiGet(`/reviews?${q}`, { ...base, signal }));
}

export async function getMyReview(accessToken, { signal } = {}) {
  return unwrap(await apiGet('/reviews/me', { ...auth(accessToken), signal }));
}

export async function saveMyReview(accessToken, review) {
  return unwrap(await apiPut('/reviews/me', review, auth(accessToken)));
}

export async function deleteMyReview(accessToken) {
  return unwrap(await apiDelete('/reviews/me', auth(accessToken)));
}

export async function createReviewLink(accessToken) {
  return unwrap(await apiPost('/reviews/link', {}, auth(accessToken)));
}

export async function getReviewByToken(token, { signal } = {}) {
  return unwrap(await apiGet(`/reviews/by-token?t=${encodeURIComponent(token)}`, { ...base, signal }));
}

export async function saveReviewByToken(token, review) {
  return unwrap(await apiPut('/reviews/by-token', { ...review, token }, base));
}
