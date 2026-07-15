import { apiPost } from './httpClient';

export async function initUserProfile({ accessToken, fullName, email, attribution, signal } = {}) {
  if (!accessToken) {
    throw new Error('Missing access token for profile initialization');
  }

  return apiPost(
    '/profile/init',
    {
      fullName: fullName || null,
      email: email && String(email).trim() ? String(email).trim() : null,
      // First-touch attribution — persisted to the profile on the first insert so
      // "which channel won this user" is permanent and joinable against revenue.
      // Ignored server-side if the profile already exists.
      attribution: attribution || undefined,
    },
    {
      signal,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}
