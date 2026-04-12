import { apiPost } from './httpClient';

export async function initUserProfile({ accessToken, fullName, email, signal } = {}) {
  if (!accessToken) {
    throw new Error('Missing access token for profile initialization');
  }

  return apiPost(
    '/profile/init',
    {
      fullName: fullName || null,
      email: email && String(email).trim() ? String(email).trim() : null,
    },
    {
      signal,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
}
