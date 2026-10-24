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

  it('links straight to API management', () => {
    expect(exness.keysUrl()).toBe('https://my.exness.com/pa/settings/api-management');
    expect(exness.navPath).toContain('API management');
  });

  it('says plainly that MT4 and MT5 are not supported', () => {
    expect(exness.platformNote).toMatch(/MT4 and MT5 accounts are not supported/);
    expect(exness.pickerNote).toMatch(/not MT4\/MT5/);
    expect(exness.createSteps[0].body).toMatch(/MT4 and MT5/);
  });

  it('wants Trading → Full access, never Read-only, and a key that never expires', () => {
    expect(exness.scopeLabel).toBe('Trading → Full access');
    const steps = exness.createSteps.map((s) => `${s.title} ${s.body}`).join(' | ');
    expect(steps).toMatch(/Full access — not Read-only/);
    expect(steps).toMatch(/Expiry date to Never/);
    expect(steps).toMatch(/Generate key for me/);
    expect(exness.submitLabel).toBe('Create API key');
  });

  it('allow-lists our IP, which Exness requires', () => {
    expect(exness.ipField).toBe('Allowed IPs');
    expect(exness.ipRequired).toBe(true);
    expect(ENGINE_EGRESS_IP).toBe('13.205.214.83');
    expect(exness.createSteps.some((s) => /Allowed IPs: ours/.test(s.title))).toBe(true);
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

  it('Exness asks only for Account ID (required, digits, # allowed) — no host: the server discovers it', () => {
    const fields = extraFieldsFor('exness');
    expect(fields.map((f) => f.name)).toEqual(['accountId']);
    expect(fields[0]).toMatchObject({ label: 'Account ID', required: true, inputMode: 'numeric', stripPrefix: '#' });
  });

  it('is ready only with a numeric account ID (a leading # as Exness shows it is fine)', () => {
    expect(extraFieldsReady(exness, {})).toBe(false);
    expect(extraFieldsReady(exness, { accountId: '  ' })).toBe(false);
    expect(extraFieldsReady(exness, { accountId: '#' })).toBe(false);
    expect(extraFieldsReady(exness, { accountId: '12ab' })).toBe(false);
    expect(extraFieldsReady(exness, { accountId: ' 12345678 ' })).toBe(true);
    expect(extraFieldsReady(exness, { accountId: '#21000088861' })).toBe(true);
    // Venues with no extras are always ready.
    expect(extraFieldsReady(venueFor('blofin'), {})).toBe(true);
  });

  it('sends only declared, non-empty, trimmed extras', () => {
    expect(extraFieldsPayload('exness', { accountId: ' 123 ' })).toEqual({ accountId: '123' });
    expect(extraFieldsPayload('exness', { accountId: '#21000088861' })).toEqual({ accountId: '21000088861' });
    expect(extraFieldsPayload('exness', { accountId: '123', host: 'https://ap.exness.com', other: 'x' })).toEqual({ accountId: '123' });
    expect(extraFieldsPayload('shark', { accountId: '123', host: 'h' })).toEqual({});
  });
});

describe('labels', () => {
  it('names Exness', () => {
    expect(brokerLabel('exness')).toBe('Exness');
    expect(sourceLabel('exness')).toBe('Exness');
  });
});
