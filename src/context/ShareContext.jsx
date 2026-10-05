import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import ShareCardModal from '../components/share/ShareCardModal';
import { useAuth } from './AuthContext';
import { useTradingAccounts } from './TradingAccountContext';
import { useGuard } from './GuardContext';
import { handleFrom, useShareData } from '../hooks/useShareData';
import { stripItems } from '../lib/shareBuild';
import { STRIP_ITEMS } from '../lib/shareCards';

/**
 * One share modal for the whole dashboard, over this account's real trades.
 *
 * Three places open it — the rule-breach toast, the trade-detail header, and
 * each card on the Overview strip — and the prototype keeps it at app level
 * for the same reason: three mounted copies means three sets of tab state, and
 * whichever one happened to be open last would win the body-scroll lock.
 *
 * It also means the journal is fetched once per account rather than once per
 * entry point, and the Binance pricing behind "it kept falling to …" is done
 * once rather than three times.
 *
 * The provider owns which kind is open and the data behind all four. Tabs,
 * format and the two toggles stay inside the modal, because none of that
 * outlives a single opening.
 */
const ShareContext = createContext({
  openShare: () => {},
  closeShare: () => {},
  cards: null,
  kinds: [],
  items: [],
  awards: null,
  loading: false,
  canShare: false,
});

export function useShare() {
  return useContext(ShareContext);
}

export function ShareProvider({ children }) {
  // { kind, tradeUid } — tradeUid names which trade the 'This trade' tab is
  // about, so the trades table can share any row rather than only the newest.
  const [open, setOpen] = useState(null);
  const { session, user } = useAuth();
  const { selectedAccount, selectedTradingAccountId } = useTradingAccounts();
  const { selected: g } = useGuard();

  const data = useShareData({
    accessToken: session?.access_token,
    tradingAccountId: selectedTradingAccountId,
    tradeUid: open?.tradeUid ?? null,
    venue: selectedAccount?.propFirmSlug ?? null,
    currency: selectedAccount?.accountCurrency || selectedAccount?.currency || 'USD',
    rules: g?.rules,
    handle: handleFrom(user),
    // Issued by the rewards system, which is not built. Until then every card
    // carries the plain link rather than a code that credits nobody.
    referral: null,
  });

  /**
   * `kind` may be a tab that has no real data — the breach toast always asks
   * for 'trade'. Falling back to the first tab that does is better than
   * opening on an empty card, and better than refusing to open at all when
   * the user has just watched a rule fire.
   */
  const openShare = useCallback((k = 'trade', opts = {}) => {
    const kind = data.kinds.includes(k) ? k : data.kinds[0] ?? null;
    if (!kind) return;
    // A named trade always opens on its own tab, even if the caller passed
    // something else — the trades table asks for a row, not for a period.
    setOpen({ kind: opts.tradeUid ? 'trade' : kind, tradeUid: opts.tradeUid ?? null });
  }, [data.kinds]);

  const closeShare = useCallback(() => setOpen(null), []);

  const currency = selectedAccount?.accountCurrency || selectedAccount?.currency || 'USD';

  const items = useMemo(
    () => stripItems(data.cards, { currency, visuals: STRIP_ITEMS }),
    [data.cards, currency],
  );

  const value = useMemo(() => ({
    openShare,
    closeShare,
    cards: data.cards,
    kinds: data.kinds,
    items,
    awards: data.awards,
    loading: data.loading,
    canShare: data.kinds.length > 0,
  }), [openShare, closeShare, data.cards, data.kinds, items, data.awards, data.loading]);

  return (
    <ShareContext.Provider value={value}>
      {children}
      <ShareCardModal
        open={open !== null}
        kind={open?.kind ?? data.kinds[0] ?? 'trade'}
        onClose={closeShare}
        cards={data.cards}
        kinds={data.kinds}
        rules={data.rules}
        ruleBlocks={data.ruleBlocks}
        handle={data.handle}
        referral={data.referral}
        counter={data.counter}
        pricing={data.pricing}
        stories={data.stories}
        currency={currency}
      />
    </ShareContext.Provider>
  );
}
