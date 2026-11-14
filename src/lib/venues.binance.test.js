import { describe, expect, it } from 'vitest';
import { ENGINE_EGRESS_IP, accountHasTaxCentre, hasTaxCentre, isBetaVenue, needsPassphrase, venueFor } from './venues';
import { brokerLabel, sourceLabel } from './labels';
import { exchangeFromBrokerSlug } from '../api/exchangeCredentialsApi';
import { VENUE_ORDER, VENUE_PAGE_LIST, venuePageFor, venueUrl } from './venueSeo';
import { guideFor } from './venueGuides';
import { PUBLIC_ROUTES } from './publicRoutes';
import vercel from '../../vercel.json';

/**
 * Binance, pinned the way Bybit is. user-service refuses a key with no
 * futures permission, no IP or withdrawals on, so the copy names all three.
 */
const binance = venueFor('binance');
const allCopy = () => binance.createSteps.map((s) => `${s.title} ${s.body}`).join(' | ');

describe('Binance venue', () => {
  it('resolves from the slug the backend stores', () => {
    expect(binance?.name).toBe('Binance');
    expect(exchangeFromBrokerSlug('binance')).toBe('binance');
    expect(brokerLabel('binance')).toBe('Binance USDⓈ-M Futures');
    expect(sourceLabel('binance')).toBe('Binance');
  });

  it('links to API Management on binance.com', () => {
    expect(binance.keysUrl()).toBe('https://www.binance.com/en/my/settings/api-management');
    expect(binance.navPath).toEqual(['Profile', 'API Management', 'Create API']);
  });

  it('has no passphrase, no tax centre and no BETA badge', () => {
    expect(needsPassphrase('binance')).toBe(false);
    expect(hasTaxCentre('binance')).toBe(false);
    expect(accountHasTaxCentre({ propFirmSlug: 'binance' })).toBe(false);
    expect(isBetaVenue('binance')).toBe(false);
  });

  it('asks for a system-generated key, then Enable Futures with Withdrawals off', () => {
    expect(binance.keyTypeChoice).toBe('System generated');
    expect(binance.readScopeLabel).toBe('Enable Reading');
    expect(binance.scopeLabel).toBe('Enable Futures');
    expect(binance.offScopes.map((o) => o.label)).toContain('Enable Withdrawals');
    expect(allCopy()).toMatch(/Edit restrictions/);
    expect(allCopy()).toMatch(/Leave Enable Withdrawals off/);
    expect(allCopy()).toMatch(/Futures account opened first/);
  });

  it('treats our IP as required, and says why (90 days)', () => {
    expect(binance.ipRequired).toBe(true);
    expect(binance.ipChoice).toBe('Restrict access to trusted IPs only');
    expect(binance.ipHint).toMatch(/90 days/);
    expect(ENGINE_EGRESS_IP).toBe('13.205.214.83');
  });

  it('covers USDⓈ-M futures only', () => {
    expect(binance.platformNoteLead).toBe('USDⓈ-M futures only. COIN-M futures, spot and options are not covered.');
    expect(binance.platformNote).toMatch(/Portfolio Margin/);
  });

  it('never mentions a browser extension or prop firms, never suggests a trade', () => {
    const text = JSON.stringify(binance) + JSON.stringify(guideFor('binance', 'api-key'));
    expect(text).not.toMatch(/extension|prop firm|prop-firm/i);
    expect(text).not.toMatch(/\b(buy|go long|go short|enter a trade)\b/i);
  });
});

describe('Binance is hidden until go-live', () => {
  it('has no public venue page or guide page', () => {
    expect(VENUE_ORDER).not.toContain('binance');
    expect(VENUE_PAGE_LIST.map((v) => v.slug)).not.toContain('binance');
    expect(venuePageFor('binance')).toBeNull();
    // The guide data exists for go-live, but the page gate is venuePageFor.
    expect(guideFor('binance', 'api-key')).not.toBeNull();
    expect(venueUrl('delta')).not.toMatch(/binance/);
  });

  it('is in no public route, sitemap source or vercel allow-list', () => {
    expect(JSON.stringify(PUBLIC_ROUTES)).not.toMatch(/binance/i);
    expect(JSON.stringify(vercel)).not.toMatch(/exchanges\/binance/);
  });
});
