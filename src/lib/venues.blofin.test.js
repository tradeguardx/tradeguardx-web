import { describe, expect, it } from 'vitest';
import { ENGINE_EGRESS_IP, hasTaxCentre, isBetaVenue, needsPassphrase, venueFor } from './venues';
import { brokerLabel, sourceLabel } from './labels';
import { exchangeFromBrokerSlug } from '../api/exchangeCredentialsApi';

/**
 * BloFin, pinned the way Shark is in venues.guide.test.js. It is the first
 * venue whose key has a passphrase and the first the tax centre does not
 * cover, so both of those are pinned here too.
 */
const blofin = venueFor('blofin');

describe('BloFin venue', () => {
  it('resolves from the slug the backend stores', () => {
    expect(blofin).toBeTruthy();
    expect(blofin.name).toBe('BloFin');
    expect(exchangeFromBrokerSlug('blofin')).toBe('blofin');
  });

  it('links to BloFin API management', () => {
    expect(blofin.keysUrl()).toMatch(/^https:\/\/blofin\.com\//);
  });

  it('asks for the passphrase — and only BloFin does', () => {
    expect(needsPassphrase('blofin')).toBe(true);
    for (const slug of ['delta_india', 'delta_global', 'coindcx', 'shark']) {
      expect(needsPassphrase(slug)).toBe(false);
    }
  });

  it('grants Read and Trade, and draws Transfer as off', () => {
    expect(blofin.scopeLabel).toBe('Trade');
    expect(blofin.readScopeLabel).toBe('Read');
    expect(blofin.offScopes.map((o) => o.label)).toEqual(['Transfer']);
    const steps = blofin.createSteps.map((s) => `${s.title} ${s.body}`).join(' | ');
    expect(steps).toMatch(/never tick Transfer/i);
  });

  it('tells people to bind our IP, and why (90-day expiry)', () => {
    expect(blofin.ipHint).toMatch(/90 days/);
    const steps = blofin.createSteps.map((s) => s.body).join(' ');
    expect(steps).toMatch(/90 days/);
    expect(ENGINE_EGRESS_IP).toBe('13.205.214.83');
  });

  it('walks BloFin\'s own journey: open, name, permissions, passphrase, IP + Next, copy', () => {
    expect(blofin.createSteps).toHaveLength(6);
    expect(blofin.createSteps[0].title).toBe('Profile icon → API → Create API Key');
    expect(blofin.createSteps.some((s) => /passphrase/i.test(s.title))).toBe(true);
    expect(blofin.navPath).toEqual(['Profile icon', 'API', 'Create API Key']);
    expect(blofin.createSteps.map((s) => s.body).join(' ')).toMatch(/not Demo Trading/);
  });

  it('keeps BloFin\'s third-party switch off, and names its own buttons and fields', () => {
    expect(blofin.usageField).toBe('API Key Usage');
    expect(blofin.usageOffOption).toBe('Connect to Third-Party Applications');
    expect(blofin.submitLabel).toBe('Next');
    expect(blofin.otpNote).toMatch(/Submit/);
    expect(blofin.secretLabel).toBe('Secret Key');
    expect(blofin.pasteStep.title).toBe('Paste the API Key, Secret Key and passphrase here');
    expect(blofin.openButton).toBe('Open BloFin API management');
    expect(blofin.platformNoteLead).toBe('USDT perpetual futures only.');
  });

  it('has no screenshots and no app path, so the link and written steps carry it', () => {
    expect(blofin.appGuide).toBeUndefined();
    expect(blofin.mobilePath).toBeNull();
  });

  it('is listed without a BETA badge (global go-live)', () => {
    expect(isBetaVenue('blofin')).toBe(false);
  });
});

describe('labels', () => {
  it('spells BloFin the way BloFin does, not "Blofin"', () => {
    expect(brokerLabel('blofin')).toBe('BloFin');
    expect(sourceLabel('blofin')).toBe('BloFin');
  });
});

describe('tax centre coverage', () => {
  it('excludes BloFin', () => {
    expect(hasTaxCentre('blofin')).toBe(false);
  });

  it('keeps every existing venue, and non-exchange accounts', () => {
    for (const slug of ['delta_india', 'delta_global', 'coindcx', 'shark', 'some_prop_firm', null]) {
      expect(hasTaxCentre(slug)).toBe(true);
    }
  });
});
