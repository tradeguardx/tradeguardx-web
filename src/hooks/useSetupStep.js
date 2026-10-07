import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTradingAccounts } from '../context/TradingAccountContext';
import { getExchangeCredentialsStatus } from '../api/exchangeCredentialsApi';

/**
 * Where an unconverted user actually is in setup.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * THE BUG THIS EXISTS FOR.
 *
 * The "finish setup" banner used to point straight at the paywall whatever
 * state the account was in, so a brand-new user — no trading account, no key,
 * nothing connected — signed in, clicked it, and the first thing the product
 * ever showed them was a price. The page itself could not even name their
 * balance, because there was no account to read one from, so it fell back to
 * a generic paragraph. We asked a stranger to authorise a recurring mandate
 * to protect an account that did not exist.
 *
 * The ask is only honest once there is something to protect. So the step is
 * resolved rather than assumed, and both the banner and the paywall page read
 * it from here so they cannot disagree.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * `loading` matters: until accounts and the key status have both answered,
 * the step is unknown and callers must not act on it. Rendering "add an
 * account" to someone who has three is the same class of mistake in the
 * opposite direction.
 */

export const SETUP_STEPS = {
  account: {
    key: 'account',
    label: 'Add your trading account',
    to: '/dashboard/account/trading',
    blurb: 'Add the account you trade on so the guard knows what to watch.',
  },
  key: {
    key: 'key',
    label: 'Connect your exchange key',
    to: '/dashboard/connect',
    blurb: 'Connect your exchange so the guard can act on your account.',
  },
  pay: {
    key: 'pay',
    label: 'Switch on your guard',
    to: '/dashboard/activate',
    blurb: 'Everything is connected. Switch the guard on to start your 7 free days.',
  },
};

export function useSetupStep() {
  const { session } = useAuth();
  const { accounts, accountsLoading, selectedAccount } = useTradingAccounts();
  /* Stored WITH the account it describes. Switching accounts would otherwise
     leave the previous account's answer on screen while the new one loads,
     which is how you tell someone to connect a key they already connected. */
  const [probe, setProbe] = useState({ accountId: null, state: 'unknown' });

  const accessToken = session?.access_token;
  const accountId = selectedAccount?.id ?? accounts?.[0]?.id ?? null;

  useEffect(() => {
    if (!accessToken || !accountId) return undefined;
    const ac = new AbortController();
    let alive = true;
    getExchangeCredentialsStatus({ accessToken, accountId, signal: ac.signal })
      .then((conn) => {
        if (!alive) return;
        setProbe({ accountId, state: conn && conn.status === 'active' ? 'connected' : 'missing' });
      })
      .catch(() => {
        /* A failed lookup must not invent a step. Staying `unknown` keeps the
           caller in its loading state rather than guessing wrong out loud. */
      });
    return () => {
      alive = false;
      ac.abort();
    };
  }, [accessToken, accountId]);

  const keyState = probe.accountId === accountId ? probe.state : 'unknown';

  const hasAccount = Array.isArray(accounts) && accounts.length > 0;

  if (accountsLoading) return { step: null, loading: true };
  if (!hasAccount) return { step: SETUP_STEPS.account, loading: false };
  if (keyState === 'unknown') return { step: null, loading: true };
  if (keyState === 'missing') return { step: SETUP_STEPS.key, loading: false };
  return { step: SETUP_STEPS.pay, loading: false };
}
