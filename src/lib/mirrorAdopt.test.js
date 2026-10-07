import { describe, expect, it, beforeEach, vi } from 'vitest';

const UID = 'ae6a2cc4-181c-4284-9a5a-a4479e967f9d';

/**
 * A mirror token, built here.
 *
 * It was read from a file in /tmp that a script happened to have written,
 * which passed on the machine that wrote it and failed everywhere else,
 * including the next checkout of this repo.
 *
 * The signature is nonsense on purpose: `adoptMirrorFromUrl` does not verify
 * one and must not — the claim is only ever used to DECIDE WHAT TO RENDER, and
 * every service re-verifies properly before trusting it for anything. A test
 * that signed it would be testing jose, not this.
 */
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const TOKEN = [
  b64({ alg: 'HS256', typ: 'JWT' }),
  b64({
    sub: UID,
    email: 'iamdeep.mk@gmail.com',
    aud: 'authenticated',
    role: 'authenticated',
    tgx_mirror: true,
    tgx_mirror_by: 'Prashant',
    exp: Math.floor(Date.now() / 1000) + 900,
  }),
  'signature-not-checked-here',
].join('.');

function stubBrowserAt(hash) {
  const replaceState = vi.fn((_a, _b, url) => {
    window.location.hash = '';
    window.location.pathname = String(url);
  });
  vi.stubGlobal('window', {
    location: { hash, pathname: '/dashboard', search: '' },
    history: { replaceState },
  });
  return replaceState;
}

describe('adoptMirrorFromUrl', () => {
  beforeEach(() => vi.resetModules());

  it('adopts a real minted token and strips the fragment', async () => {
    const replaceState = stubBrowserAt(`#mirror=${encodeURIComponent(TOKEN)}`);
    const m = await import('./mirror.js');

    expect(m.adoptMirrorFromUrl()).toBe(true);
    expect(m.isMirroring()).toBe(true);
    expect(m.mirrorSession().user.id).toBe(UID);
    expect(m.mirrorInfo().email).toBe('iamdeep.mk@gmail.com');
    // Out of the address bar, so it cannot reach history or a screenshot.
    expect(replaceState).toHaveBeenCalled();
  });

  /**
   * The bug that sent the operator to /login.
   *
   * StrictMode runs effects twice in dev. The first pass adopted and cleared
   * the fragment; the second found nothing, returned false, and the caller
   * fell through to Supabase — which has no session in that tab — so the app
   * set `user` to null and the route guard redirected. The mirror worked and
   * then undid itself about 200ms later.
   */
  it('stays adopted when the effect runs a second time (React StrictMode)', async () => {
    stubBrowserAt(`#mirror=${encodeURIComponent(TOKEN)}`);
    const m = await import('./mirror.js');

    expect(m.adoptMirrorFromUrl()).toBe(true);
    // The fragment is gone now — exactly what the second pass sees.
    expect(window.location.hash).toBe('');
    expect(m.adoptMirrorFromUrl()).toBe(true);
    expect(m.isMirroring()).toBe(true);
    expect(m.mirrorSession().user.id).toBe(UID);
  });

  it('refuses a token that is not a mirror token', async () => {
    // Otherwise the fragment would be a way to hand the app any session.
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const notMirror = `${b64({ alg: 'HS256' })}.${b64({ sub: UID })}.sig`;
    stubBrowserAt(`#mirror=${notMirror}`);
    const m = await import('./mirror.js');
    expect(m.adoptMirrorFromUrl()).toBe(false);
    expect(m.isMirroring()).toBe(false);
  });

  it('ignores a normal page load', async () => {
    stubBrowserAt('');
    const m = await import('./mirror.js');
    expect(m.adoptMirrorFromUrl()).toBe(false);
  });

  it('decodes a payload whose base64 length is not a multiple of four', async () => {
    // JWTs drop the `=` padding; atob rejects some unpadded lengths outright.
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const payload = { sub: UID, tgx_mirror: true, pad: 'x'.repeat(7) };
    const t = `${b64({ alg: 'HS256' })}.${b64(payload)}.sig`;
    expect(b64(payload).length % 4).not.toBe(0);
    stubBrowserAt(`#mirror=${t}`);
    const m = await import('./mirror.js');
    expect(m.adoptMirrorFromUrl()).toBe(true);
  });
});
