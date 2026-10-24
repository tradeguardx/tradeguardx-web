import { describe, expect, it } from 'vitest';
import {
  ENGINE_EGRESS_IP,
  extraFieldsFor,
  extraFieldsPayload,
  extraFieldsReady,
  hasTaxCentre,
  isBetaVenue,
  needsPassphrase,
  secretFieldFor,
  splitsPastedPair,
  venueFor,
} from './venues';
import { brokerLabel, sourceLabel } from './labels';
import { exchangeFromBrokerSlug } from '../api/exchangeCredentialsApi';

/**
 * Exness, pinned the way BloFin is in venues.blofin.test.js. It is the first
 * venue whose secret is a multi-line private key and the first that needs
 * inputs beyond key/secret/passphrase (account ID, API host) — and the first
 * forex/CFD venue, where MT4/MT5 accounts are out of reach of the API.
 */
const exness = venueFor('exness');
const OTHERS = ['delta_india', 'delta_global', 'coindcx', 'shark', 'blofin'];

describe('Exness venue', () => {
  it('resolves from the slug the backend stores', () => {
    expect(exness).toBeTruthy();
    expect(exness.name).toBe('Exness');
    expect(exness.longName).toBe('Exness (native platform)');
    expect(exchangeFromBrokerSlug('exness')).toBe('exness');
  });

  it('links to the Exness Personal Area, and names Key Management on the way', () => {
    expect(exness.keysUrl()).toBe('https://my.exness.com/');
    expect(exness.navPath).toContain('Key Management');
    expect(exness.navPath.length).toBeLessThanOrEqual(3);
  });

  it('says plainly that MT4 and MT5 are not supported', () => {
    expect(exness.platformNote).toMatch(/MT4 and MT5 accounts are not supported/);
    expect(exness.pickerNote).toMatch(/not MT4\/MT5/);
    expect(exness.createSteps[0].body).toMatch(/MT4 and MT5/);
  });

  it('wants a trading key, never an Info key', () => {
    expect(exness.scopeLabel).toBe('Trading key');
    expect(exness.offScopes.map((o) => o.label)).toEqual(['Info key']);
    const steps = exness.createSteps.map((s) => `${s.title} ${s.body}`).join(' | ');
    expect(steps).toMatch(/not an Info key/);
  });

  it('allow-lists our IP, which Exness requires', () => {
    expect(exness.ipField).toBe('Allowed IPs');
    expect(exness.ipRequired).toBe(true);
    expect(ENGINE_EGRESS_IP).toBe('13.205.214.83');
    expect(exness.createSteps.some((s) => /allow our ip/i.test(s.title))).toBe(true);
  });

  it('has no screenshots and no app path, so the link and written steps carry it', () => {
    expect(exness.appGuide).toBeUndefined();
    expect(exness.mobilePath).toBeNull();
    expect(exness.desktopOnly).toBe(false);
  });

  it('carries no beta badge, and is outside the tax centre', () => {
    expect(isBetaVenue('exness')).toBe(false);
    expect(hasTaxCentre('exness')).toBe(false);
    expect(needsPassphrase('exness')).toBe(false);
  });
});

describe('the key form a venue describes', () => {
  it('Exness: a one-line Secret Key (Exness’s own label), and no key+secret paste splitting', () => {
    expect(secretFieldFor(exness)).toMatchObject({ label: 'Secret Key', multiline: false });
    expect(secretFieldFor(exness).placeholder).toBe('Paste the Secret Key');
    expect(splitsPastedPair(exness)).toBe(false);
  });

  it('every other venue keeps its one-line "API secret" and the splitter', () => {
    for (const slug of OTHERS) {
      const v = venueFor(slug);
      expect(secretFieldFor(v)).toEqual({ label: 'API secret', placeholder: null, multiline: false });
      expect(splitsPastedPair(v)).toBe(true);
      expect(extraFieldsFor(slug)).toEqual([]);
    }
  });

  it('Exness asks for Account ID (required, digits) and API host (optional)', () => {
    const fields = extraFieldsFor('exness');
    expect(fields.map((f) => f.name)).toEqual(['accountId', 'host']);
    const [acct, host] = fields;
    expect(acct).toMatchObject({ label: 'Account ID', required: true, inputMode: 'numeric' });
    expect(host).toMatchObject({ label: 'API host', required: false, placeholder: 'https://api.exness.com' });
    expect(host.hint).toBe('Leave empty unless Exness shows you a different host.');
  });

  it('is ready only with a numeric account ID; the host may stay empty', () => {
    expect(extraFieldsReady(exness, {})).toBe(false);
    expect(extraFieldsReady(exness, { accountId: '  ' })).toBe(false);
    expect(extraFieldsReady(exness, { accountId: '12ab' })).toBe(false);
    expect(extraFieldsReady(exness, { accountId: ' 12345678 ' })).toBe(true);
    expect(extraFieldsReady(exness, { accountId: '12345678', host: 'https://ap-4decef67.exness.com' })).toBe(true);
    // Venues with no extras are always ready.
    expect(extraFieldsReady(venueFor('blofin'), {})).toBe(true);
  });

  it('sends only declared, non-empty, trimmed extras', () => {
    expect(extraFieldsPayload('exness', { accountId: ' 123 ', host: '' })).toEqual({ accountId: '123' });
    expect(extraFieldsPayload('exness', { accountId: '123', host: ' https://api.exness.com ', other: 'x' }))
      .toEqual({ accountId: '123', host: 'https://api.exness.com' });
    expect(extraFieldsPayload('shark', { accountId: '123', host: 'h' })).toEqual({});
  });
});

describe('labels', () => {
  it('names Exness', () => {
    expect(brokerLabel('exness')).toBe('Exness');
    expect(sourceLabel('exness')).toBe('Exness');
  });
});
