import { describe, expect, it } from 'vitest';
import { ENGINE_EGRESS_IP, accountHasTaxCentre, hasTaxCentre, isBetaVenue, needsPassphrase, venueFor } from './venues';
import { brokerLabel, sourceLabel } from './labels';
import { exchangeFromBrokerSlug } from '../api/exchangeCredentialsApi';

/**
 * Bybit, pinned the way BloFin is. user-service refuses three keys — no
 * contract trading, no IP, withdraw on — so the copy has to name all three.
 */
const bybit = venueFor('bybit');
const allCopy = () => bybit.createSteps.map((s) => `${s.title} ${s.body}`).join(' | ');

describe('Bybit venue', () => {
  it('resolves from the slug the backend stores', () => {
    expect(bybit?.name).toBe('Bybit');
    expect(exchangeFromBrokerSlug('bybit')).toBe('bybit');
    expect(brokerLabel('bybit')).toBe('Bybit');
    expect(sourceLabel('bybit')).toBe('Bybit');
  });

  it('links to Bybit API Management on the website', () => {
    expect(bybit.keysUrl()).toBe('https://www.bybit.com/app/user/api-management');
    expect(bybit.desktopOnly).toBe(true);
    expect(bybit.desktopOnlyNote).toMatch(/website/);
  });

  it('has no passphrase and no tax centre', () => {
    expect(needsPassphrase('bybit')).toBe(false);
    expect(hasTaxCentre('bybit')).toBe(false);
    expect(accountHasTaxCentre({ propFirmSlug: 'bybit' })).toBe(false);
  });

  it('asks for Read-Write with Contract Orders and Positions, and Withdrawal off', () => {
    expect(bybit.accessChoice).toBe('Read-Write');
    expect(bybit.scopeTicks).toEqual(['Orders', 'Positions']);
    expect(bybit.offScopes.map((o) => o.label)).toEqual(['Withdrawal']);
    expect(allCopy()).toMatch(/Read-Only key is refused/);
    expect(allCopy()).toMatch(/Withdrawal/);
  });

  it('treats our IP as required, and says why (90 days)', () => {
    expect(bybit.ipRequired).toBe(true);
    expect(bybit.ipHint).toMatch(/90 days/);
    expect(allCopy()).toMatch(/Only IPs with permissions granted/);
    expect(ENGINE_EGRESS_IP).toBe('13.205.214.83');
  });

  it('walks Bybit\'s own journey and names its buttons', () => {
    expect(bybit.navPath).toEqual(['Profile icon', 'API', 'Create New Key']);
    expect(bybit.keyTypeChoice).toBe('System-generated API Keys');
    expect(bybit.usageChoice).toBe('API Transaction');
    expect(bybit.submitLabel).toBe('Submit');
    expect(bybit.secretLabel).toBe('Secret Key');
    expect(bybit.createSteps).toHaveLength(5);
  });

  it('is listed without a BETA badge', () => {
    expect(isBetaVenue('bybit')).toBe(false);
  });
});

describe('Bybit coverage', () => {
  it('says linear only: USDT and USDC perpetuals, never inverse', () => {
    const v = venueFor('bybit');
    expect(v.platformNoteLead).toBe('USDT and USDC perpetuals. Inverse contracts, spot and options are not covered.');
    expect(v.pickerNote).not.toMatch(/inverse/i);
  });
});
