import { apiDelete, apiGet, apiPatch, apiPost } from './httpClient';

function unwrap(payload) {
  if (payload?.success && payload.data !== undefined) return payload.data;
  return payload;
}

/**
 * GET /user/notifications/settings
 * Returns the current user's channel toggles, email address, severity threshold,
 * and Telegram link status (connected | pending | not connected).
 */
export async function fetchNotificationSettings({ accessToken, signal } = {}) {
  if (!accessToken) throw new Error('Missing access token');
  const payload = await apiGet('/notifications/settings', {
    signal,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = unwrap(payload);
  return data?.settings ?? null;
}

/**
 * PATCH /user/notifications/settings
 * Partial update — only send the keys you want to change.
 */
export async function updateNotificationSettings({
  accessToken,
  emailNotificationsEnabled,
  notificationEmail,
  telegramNotificationsEnabled,
  notificationMinSeverity,
  signal,
} = {}) {
  if (!accessToken) throw new Error('Missing access token');
  const body = {};
  if (emailNotificationsEnabled !== undefined) body.emailNotificationsEnabled = emailNotificationsEnabled;
  if (notificationEmail !== undefined) body.notificationEmail = notificationEmail;
  if (telegramNotificationsEnabled !== undefined) body.telegramNotificationsEnabled = telegramNotificationsEnabled;
  if (notificationMinSeverity !== undefined) body.notificationMinSeverity = notificationMinSeverity;

  const payload = await apiPatch('/notifications/settings', body, {
    signal,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = unwrap(payload);
  return data?.settings ?? null;
}

/**
 * POST /user/notifications/telegram/link
 * Generates a one-time binding link. User clicks it, lands in Telegram, presses Start.
 * The bot binds their chat_id on the backend.
 */
export async function createTelegramBindingLink({ accessToken, signal } = {}) {
  if (!accessToken) throw new Error('Missing access token');
  const payload = await apiPost('/notifications/telegram/link', {}, {
    signal,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = unwrap(payload);
  return data?.link ?? null;
}

/**
 * DELETE /user/notifications/telegram/link
 * Removes the Telegram binding entirely.
 */
export async function disconnectTelegram({ accessToken, signal } = {}) {
  if (!accessToken) throw new Error('Missing access token');
  const payload = await apiDelete('/notifications/telegram/link', {
    signal,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return unwrap(payload);
}
