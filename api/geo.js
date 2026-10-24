/**
 * GET /api/geo → { country: "IN" | null, token: "<payload>.<sig>" | null }
 *
 * The visitor's country from Vercel's own edge header (no third-party IP
 * lookup), plus the same country SIGNED with GEO_SIGNING_SECRET. Checkout
 * prices by the signed copy only (payments-service src/services/geoToken.ts),
 * so a browser cannot claim to be somewhere cheaper. Token format:
 *
 *     base64url({"c":"US","iat":<unix seconds>}) + "." + base64url(HMAC-SHA256)
 *
 * Never cached: the answer is per visitor, and a token is good for 2 hours.
 */
export const config = { runtime: 'edge' };

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function sign(country, secret) {
  const payload = b64url(new TextEncoder().encode(JSON.stringify({ c: country, iat: Math.floor(Date.now() / 1000) })));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return `${payload}.${b64url(sig)}`;
}

export default async function handler(req) {
  const raw = (req.headers.get('x-vercel-ip-country') || '').trim().toUpperCase();
  const country = /^[A-Z]{2}$/.test(raw) ? raw : null;
  const secret = process.env.GEO_SIGNING_SECRET;
  const token = secret ? await sign(country, secret) : null;
  return new Response(JSON.stringify({ country, token }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' },
  });
}
