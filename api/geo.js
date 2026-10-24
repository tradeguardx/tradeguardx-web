/**
 * GET /api/geo → { country: "IN" | null }
 *
 * The visitor's country from Vercel's own edge header, so the landing page can
 * show prices in local money without sending anyone's IP to a third party.
 * Never cached: the answer is per visitor.
 */
export const config = { runtime: 'edge' };

export default function handler(req) {
  const raw = (req.headers.get('x-vercel-ip-country') || '').trim().toUpperCase();
  const country = /^[A-Z]{2}$/.test(raw) ? raw : null;
  return new Response(JSON.stringify({ country }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'private, no-store' },
  });
}
