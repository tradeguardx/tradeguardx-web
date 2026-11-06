import { describe, expect, it } from 'vitest';
import { connectFailureTitle } from './connectFailure';

const err = (code) => ({ details: { success: false, error: { code } } });

describe('connectFailureTitle', () => {
  it('names the cause for a key without trade permission or our IP', () => {
    expect(connectFailureTitle(err('KEY_READ_ONLY'))).toMatch(/Trading permission/);
    expect(connectFailureTitle(err('KEY_IP_NOT_WHITELISTED'))).toMatch(/IP/);
  });

  it('leaves every other failure on the generic heading', () => {
    expect(connectFailureTitle(err('DELTA_AUTH_FAILED'))).toBeNull();
    expect(connectFailureTitle(new Error('network'))).toBeNull();
    expect(connectFailureTitle(undefined)).toBeNull();
  });
});
